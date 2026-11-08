const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const {JSDOM}=require('jsdom');
const dir=path.join(__dirname,'..','extension');
const scanOptions={force:true,minDelay:1,interval:1,maxSettle:80,maxDuration:1500,maxSteps:20};
const turn=n=>`<div data-turn-key="t${n}" data-content-search-turn-key="fallback-turn-${n}"><article data-testid="conversation-turn-${n}"><div data-message-author-role="user" data-message-id="u${n}">Question ${n}</div></article></div>`;

function fixture(t,ordinals=[0]){
  const page=new JSDOM('<!doctype html><main class="thread-scroll-container">'+ordinals.map(turn).join('')+'</main>',{url:'https://chatgpt.com/c/test',runScripts:'outside-only',pretendToBeVisual:true});
  const w=page.window,doc=w.document,scroller=doc.querySelector('main');
  Object.defineProperties(scroller,{clientHeight:{value:600},scrollHeight:{get:()=>600}});
  w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
  const scripts=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')).content_scripts[1].js;
  for(const name of scripts.filter(name=>name!=='content.js'))w.eval(fs.readFileSync(path.join(dir,name),'utf8'));
  const S=w.GPTSmooth;
  const app={doc,route:'/c/test',dead:false,settings:{enabled:true,readMode:true,lightInput:true,keep:null},ui:{host:doc.createElement('div'),pending:false,updates:0,update(){this.updates++;}},isRouteReady:()=>true,messages:()=>S.Adapter.messages(doc)};
  app.reader=new S.Reader(app);app.reader.revision??=0;app.reader.refresh();
  app.renderer=new S.Renderer(doc);app.history=new S.History(app);
  const counts={messages:0,scroller:0};
  for(const [name,key]of [['messages','messages'],['historyScroller','scroller']]){const original=S.Adapter[name];S.Adapter[name]=(...args)=>{counts[key]++;return original(...args);};}
  const reset=()=>{counts.messages=0;counts.scroller=0;};
  // Reader.revision is the App/History invalidation contract; older Reader copies
  // used by a standalone History test can supply that signal explicitly.
  const refresh=()=>{const before=app.reader.revision;app.reader.refresh();if(app.reader.revision===before)app.reader.revision++;};
  t.after(()=>{app.history.stop();app.reader.stop();app.renderer.stop();w.close();});
  return {app,S,doc,scroller,counts,reset,refresh};
}

test('completed unchanged history does no DOM work on repeated ensure calls',async t=>{
  const {app,counts,reset}=fixture(t);
  assert.equal((await app.history.start(scanOptions)).phase,'complete');
  reset();for(let i=0;i<5;i++)app.history.ensure();
  assert.deepEqual(counts,{messages:0,scroller:0});
});

test('ineligible reader and UI states return before querying the native DOM',t=>{
  const {app,counts,reset}=fixture(t);
  const cases=[()=>app.settings.enabled=false,()=>app.settings.readMode=false,()=>app.settings.lightInput=false,()=>app.reader.active=false,()=>app.ui.pending=true,()=>app.tools={busy:true},()=>app.tools={popups:{active:true}}];
  for(const disable of cases){Object.assign(app.settings,{enabled:true,readMode:true,lightInput:true});app.reader.active=true;app.ui.pending=false;app.tools=null;disable();reset();assert.equal(app.history.eligible(),false);assert.deepEqual(counts,{messages:0,scroller:0});}
  app.reader.active=true;
});

test('a new reader revision refreshes completed coverage once and keeps new questions',async t=>{
  const {app,doc,refresh,counts,reset}=fixture(t);
  await app.history.start(scanOptions);
  doc.querySelector('main').insertAdjacentHTML('beforeend',turn(1));refresh();
  app.history.ensure();assert.equal(app.history.state.phase,'complete');assert.equal(app.history.state.questions,2);
  reset();app.history.ensure();assert.deepEqual(counts,{messages:0,scroller:0});
});

test('a revision with missing history starts a new scan and captures the virtualized gap',async t=>{
  const {app,doc,scroller,refresh}=fixture(t);
  await app.history.start(scanOptions);
  doc.querySelector('main').insertAdjacentHTML('beforeend',turn(2));refresh();
  scroller.addEventListener('scroll',()=>{if(!doc.querySelector('[data-turn-key="t1"]'))scroller.insertAdjacentHTML('beforeend',turn(1));},{once:true});
  const original=app.history.start.bind(app.history);app.history.start=options=>original({...scanOptions,...options});
  app.history.ensure();assert.equal((await app.history.promise).phase,'complete');
  assert.equal(app.history.state.questions,3);assert.deepEqual(Array.from(app.history.state.missing),[]);
});

test('force retry still scans a completed unchanged reader',async t=>{
  const {app,counts,reset}=fixture(t);
  await app.history.start(scanOptions);reset();
  assert.equal((await app.history.start(scanOptions)).phase,'complete');assert.ok(counts.messages>0);
});

test('coverage preserves duplicate ordinals and reports exact gaps',t=>{
  const {app}=fixture(t,[0,2]);
  app.reader.records.set('a2',{id:'a2',role:'assistant',ordinal:2});
  const coverage=app.history.coverage(app.reader);
  assert.equal(coverage.turns,2);assert.equal(coverage.questions,2);assert.deepEqual(Array.from(coverage.missing),[1]);assert.equal(coverage.numbered,true);
});
