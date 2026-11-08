(() => {
  'use strict';
  const S=globalThis.GPTSmooth;
  S.History=class {
    constructor(app){this.app=app;this.doc=app.doc;this.states=new Map();this.completedRevisions=new WeakMap();this.controller=null;this.promise=null;}
    get state(){return this.states.get(this.app.route)||{phase:'idle',questions:0,missing:[]};}
    notify(state){this.states.set(state.route,state);if(state.route===this.app.route)this.app.ui?.update();}
    coverage(reader){
      const records=[...reader.records.values()],ordinals=new Set(records.filter(r=>Number.isInteger(r.ordinal)).map(r=>r.ordinal)),numbers=[...ordinals].sort((a,b)=>a-b);
      const missing=[];for(let i=0;i<(numbers.at(-1)??-1);i++)if(!ordinals.has(i))missing.push(i);
      return {questions:reader.questions().length,turns:numbers.length,missing,numbered:records.length>0&&records.every(r=>Number.isInteger(r.ordinal)),first:numbers[0]};
    }
    eligible(){const app=this.app;if(!app.reader?.active||app.reader.streaming||!app.settings.enabled||!app.settings.readMode||!app.settings.lightInput||app.ui?.pending||app.tools?.busy||app.tools?.popups?.active||!app.isRouteReady())return false;const scroller=S.Adapter.historyScroller(this.doc);return !!(scroller?.clientHeight>0&&app.messages().length);}
    nextPosition(scroller,messages){const viewport=scroller.getBoundingClientRect(),base=scroller.scrollTop+Math.max(100,scroller.clientHeight*.75);const groups=[...new Set(messages.filter(m=>!m.streaming).map(m=>m.node.closest('[data-turn-key]')||m.node))];const ranges=groups.map(group=>{const row=group.parentElement?.children.length===1&&group.parentElement.style.height?group.parentElement:group;return row.getBoundingClientRect();}).filter(rect=>rect.height>0&&rect.bottom>viewport.top).sort((a,b)=>a.top-b.top);let end=viewport.top;for(const range of ranges){if(range.top>end+scroller.clientHeight&&end===viewport.top)continue;if(range.top>end+8&&end!==viewport.top)break;end=Math.max(end,range.bottom);}return Math.max(base,scroller.scrollTop+end-viewport.top-scroller.clientHeight*.2);}
    ensure(){
      const state=this.state,reader=this.app.reader;
      if(state.phase==='complete'&&Number.isInteger(reader?.revision)&&this.completedRevisions.get(reader)===reader.revision)return;
      if(!this.eligible())return;
      if(state.phase==='complete'){
        const coverage=this.coverage(reader);
        if(coverage.questions!==state.questions)this.notify({...state,...coverage,message:'全部历史已加载 · '+coverage.questions+' 个提问 · 继续接收新消息'});
        if(coverage.missing.length)this.states.set(this.app.route,{...state,...coverage,phase:'idle'});
        else this.completedRevisions.set(reader,reader.revision);
      }
      if(this.state.phase==='idle'||this.state.phase==='paused'&&!this.state.manual)void this.start();
    }
    stop(reason='已暂停加载',manual=false){if(this.controller){this.controller.manual=manual;this.controller.abort();}const state=this.state;if(state.phase==='loading')this.notify({...state,phase:'paused',message:reason,manual});}
    wait(ms,signal){return new Promise(resolve=>{if(signal.aborted){resolve();return;}const finish=()=>{this.doc.defaultView.clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};const timer=this.doc.defaultView.setTimeout(finish,Math.max(1,ms));signal.addEventListener('abort',finish,{once:true});});}
    async flush(reader,signal){if(signal.aborted)return;let abort;const stopped=new Promise(resolve=>{abort=resolve;signal.addEventListener('abort',abort,{once:true});});try{await Promise.race([reader.flushPending?.(),stopped]);}finally{signal.removeEventListener('abort',abort);}}
    start(options={}){
      if(this.controller&&!this.controller.signal.aborted&&this.state.phase==='loading')return this.promise;
      if(!this.eligible())return Promise.resolve(this.state);
      if(this.state.phase==='complete'&&!options.force)return Promise.resolve(this.state);
      const controller=new this.doc.defaultView.AbortController();this.controller=controller;
      this.promise=this.scan(controller,{minDelay:40,interval:30,maxSettle:1500,maxDuration:180000,maxSteps:3000,...options});return this.promise;
    }
    async scan(controller,options){
      const {signal}=controller,app=this.app,reader=app.reader,route=app.route,url=this.doc.defaultView.location.href,scroller=S.Adapter.historyScroller(this.doc);
      const state={route,phase:'loading',questions:reader.questions().length,missing:[],steps:0,message:'正在自动加载全部历史…'};
      const valid=()=>!signal.aborted&&!app.dead&&app.route===route&&this.doc.defaultView.location.href===url&&app.reader===reader&&reader.active&&!reader.streaming&&scroller.isConnected&&!app.ui?.pending;
      const capture=async()=>{if(!valid())return;reader.refresh({progressive:true,onlyDirty:true});Object.assign(state,this.coverage(reader));this.notify({...state});await this.flush(reader,signal);};
      const signature=()=>Math.round(scroller.scrollHeight)+'|'+Math.round(scroller.scrollTop)+'|'+app.messages().map(m=>m.id).join(',');
      const settle=async()=>{let last='',stable=0;const start=Date.now();await this.wait(options.minDelay,signal);while(valid()&&Date.now()-start<options.maxSettle){const next=signature(),busy=scroller.querySelector('[data-testid="conversation-loading"],[data-history-loading="true"]');stable=next===last&&!busy?stable+1:0;last=next;if(stable>=2)return;await this.wait(options.interval,signal);}};
      const move=value=>{scroller.scrollTop=value;scroller.dispatchEvent(new this.doc.defaultView.Event('scroll',{bubbles:true}));};
      reader.loadingHistory=true;reader.freeze();app.renderer?.showAll();reader.showAll({progressive:true});this.notify({...state});
      let atBottom=0,passes=0,lastHeight=-1;const started=Date.now();
      try{
        // Fetch the true conversation tail before spending time walking older rows.
        await this.wait(1,signal);if(valid()){move(Math.max(0,scroller.scrollHeight-scroller.clientHeight));await settle();if(valid()){await capture();state.message='最新消息已显示，正在后台补入较早历史…';this.notify({...state});}if(valid())move(0);}
        while(valid()&&state.steps<options.maxSteps&&Date.now()-started<options.maxDuration){
          await settle();if(!valid())break;await capture();if(!valid())break;state.steps++;
          const height=scroller.scrollHeight,bottom=Math.max(0,height-scroller.clientHeight),top=scroller.scrollTop;
          if(top>=bottom-2){
            atBottom=height===lastHeight?atBottom+1:0;lastHeight=height;
            const viewport=scroller.getBoundingClientRect(),rects=app.messages().map(m=>m.node.getBoundingClientRect());
            const visible=!rects.some(rect=>rect.height>0)||rects.some(rect=>rect.height>0&&rect.bottom>viewport.top&&rect.top<viewport.bottom);
            const covered=visible&&state.numbered&&state.first===0&&state.missing.length===0&&state.questions>0;
            if(atBottom>=2&&covered){state.phase='complete';state.message='全部历史已加载 · '+state.questions+' 个提问 · 轮次连续';break;}
            if(atBottom>=3){if(++passes>=3){state.phase='partial';state.message='已读取 '+state.questions+' 个提问，仍有未确认的历史；可重试加载。';break;}atBottom=0;lastHeight=-1;move(0);continue;}
            move(bottom);
          }else{atBottom=0;lastHeight=-1;move(Math.min(bottom,this.nextPosition(scroller,app.messages())));}
        }
        if(!valid()){state.phase='paused';state.manual=!!controller.manual;state.message='历史加载已中止，已读取内容保留。';}
        else if(state.phase==='loading'){state.phase='partial';state.message='本轮加载时间已到，已读取 '+state.questions+' 个提问；可继续加载。';}
      }catch{state.phase='partial';state.message='加载暂时中断，已读取内容保留；可重试。';}
      finally{reader.loadingHistory=false;if(reader.active)reader.freeze();if(this.controller===controller){this.controller=null;if(state.phase==='complete')this.completedRevisions.set(reader,reader.revision);this.notify({...state});if(app.reader===reader&&valid())app.renderer?.refresh();}}
      return state;
    }
  };
})();
