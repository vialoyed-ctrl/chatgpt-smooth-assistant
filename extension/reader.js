(() => {
  'use strict';
  const S=globalThis.GPTSmooth;
  function stripUnsafe(root){for(const n of [root,...root.querySelectorAll('*')])for(const a of [...n.attributes])if(/^on/i.test(a.name)||['href','src','xlink:href'].includes(a.name)&&!/^https?:|^data:image\/(png|jpeg|webp|gif);|^blob:|^#/i.test(a.value))n.removeAttribute(a.name);for(const n of root.querySelectorAll('script,iframe,object,embed,foreignObject,annotation-xml'))n.remove();}
  function plainText(node){
    if(node.nodeType===3)return node.textContent;
    if(node.nodeType!==1)return '';
    if(node.localName==='math'||node.matches('.katex'))return (node.querySelector('annotation[encoding="application/x-tex"]')?.textContent||node.textContent)+(node.localName==='math'&&node.getAttribute('display')==='block'?'\n\n':'');
    if(node.tagName==='BR')return '\n';
    if(node.tagName==='PRE')return node.textContent+'\n\n';
    const text=[...node.childNodes].map(plainText).join('');
    if(node.matches('td,th'))return text+'\t';
    if(node.matches('p,blockquote,ul,ol,h1,h2,h3,h4,h5,h6,.formula,.katex-display'))return text.replace(/\n+$/,'')+'\n\n';
    if(node.matches('li,tr'))return text+'\n';
    return text;
  }
  const CSS=":host{all:initial;color-scheme:light dark;font:16px/1.625 ui-sans-serif,-apple-system,system-ui,\"Segoe UI\",Helvetica,Arial,sans-serif;color:#0d0d0d;--spacing:4px}*{box-sizing:border-box}.reader{position:fixed;z-index:10;inset:48px 0 0;background:#fff;display:flex;flex-direction:column}.header{flex:none;display:flex;align-items:center;gap:10px;padding:10px 18px;min-height:48px;border-bottom:1px solid #e5e5e5;font-size:13px;background:inherit}.header b{font-weight:600;white-space:nowrap}.header span{margin-left:auto;font-size:12px;color:#666}.header button{white-space:nowrap;font-size:12px}.scroll{overflow:auto;flex:1;min-height:0;overscroll-behavior:contain;scrollbar-gutter:stable;padding:16px calc(var(--smooth-rail,0px) + 24px) var(--smooth-bottom-gap,28px) 24px}.messages{width:100%;max-width:none;margin:0}article{content-visibility:auto;contain-intrinsic-block-size:auto 600px;width:100%;padding:16px 0 28px;margin:0;overflow-wrap:anywhere}article.user{contain-intrinsic-block-size:auto 100px;width:auto;margin:0 0 24px 12%;padding:12px 18px;background:#f4f4f4;border-radius:18px}.role{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#777;margin-bottom:10px}.role button{opacity:.85}.body{font:16px/1.625 ui-sans-serif,-apple-system,system-ui,\"Segoe UI\",Helvetica,Arial,sans-serif;white-space:normal;min-width:0}.body p{margin:16px 0 0;white-space:pre-line}.body p:first-child{margin-top:0}.body h1{font-size:20px;line-height:28px;font-weight:600;margin:24px 0 0}.body h2{font-size:18px;line-height:28px;font-weight:600;margin:24px 0 0}.body h3,.body h4{font-size:16px;line-height:26px;font-weight:600;margin:20px 0 0}.body h1:first-child,.body h2:first-child,.body h3:first-child{margin-top:0}.body strong,.body b,.emphasis{font-weight:600}.italic{font-style:italic}.body ul,.body ol{margin:8px 0 0;padding-inline-start:32px}.body li{margin:0;padding-left:4px}.body li p{margin:0}.body li p+p{margin-top:8px}.body li::marker{font-weight:600}.body ul ul{list-style-type:circle}.body hr{border:0;border-top:1px solid #e5e5e5;margin:24px 0}.body pre{margin:16px 0 0;padding:14px 16px;white-space:pre;overflow:auto;max-width:100%;background:#f5f5f5;border-radius:10px;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}.body code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.body .inline-code,.body :not(pre)>code:not(.block-code){padding:.05em .28em;background:#f1f1f1;border-radius:4px;font-size:.93em;font-weight:500;white-space:break-spaces}.body pre code{background:none;padding:0;white-space:pre;font-size:inherit;font-weight:400}.body table{border-collapse:collapse;border-spacing:0;margin:16px 0 0;width:100%;font-size:14px;line-height:20px}.body th,.body td{border:0;border-bottom:1px solid #ddd;padding:8px 12px 8px 0;text-align:start;vertical-align:top}.body th{font-weight:600}.body td p,.body th p{margin:0;font-size:inherit;line-height:inherit}.native-table{max-width:100%;overflow-x:auto;margin-inline:0!important}.native-table>div{overflow-x:auto}.body blockquote{border-inline-start:3px solid #ddd;padding-inline-start:16px;margin:16px 0}.body img{max-width:100%;height:auto;object-fit:contain}.body .native-icon{display:inline-block;max-width:1.5em;max-height:1.5em}.native-box,.native-row,.native-grid,.native-grid-item{min-width:0}.native-content{min-width:0}.body .native-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.body .native-row{display:flex;gap:12px}.body .native-box{display:flex;flex-direction:column;gap:8px}.native-badge{display:inline-flex!important;max-width:100%;gap:3px;padding:2px 5px;border-radius:4px;background:#f5f5f5;vertical-align:baseline}.file-ref{text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}.body .formula{display:block;overflow-x:auto;overflow-y:hidden;margin:16px 0;text-align:center;max-width:100%}.body .formula .formula{margin:0}.body math[display=\"inline\"]{display:inline math;vertical-align:baseline}.body math[display=\"block\"]{display:block math;math-style:normal;margin:0 auto;max-width:100%}.body a{color:inherit;text-decoration:underline;text-underline-offset:2px}button{font:inherit;padding:5px 9px;border:1px solid #ddd;border-radius:7px;background:#fff;color:#333;cursor:pointer}.empty{text-align:center;padding:50px;color:#777}@media(max-width:900px){.header{flex-wrap:wrap;gap:6px}.scroll{padding-inline-start:12px;padding-inline-end:calc(var(--smooth-rail,0px) + 12px)}}@media(prefers-color-scheme:dark){:host{color:#ececec}.reader{background:#212121}.header{border-color:#444}.header span,.role{color:#aaa}article.user,.body pre{background:#303030}.body hr{border-color:#444}.body td,.body th{border-color:#444}.body .inline-code,.body :not(pre)>code:not(.block-code),.native-badge{background:#333}button{background:#303030;color:#eee;border-color:#555}}";
  const LAYOUT=".body .native-code-block{border:1px solid #e5e5e5;border-radius:20px;background:#fcfcfc;margin:16px 0;overflow:hidden;max-width:100%}.body .native-code-header{display:flex;align-items:center;min-height:40px;padding:6px 16px;font-size:13px}.body .native-code-source{max-width:100%;overflow:auto;padding:0 16px 12px}.body .native-code-block pre{margin:0;padding:0;background:transparent;border-radius:0}";
  function safeBody(message,doc,fast=false){
    const body=message.node.querySelector('[data-markdown-text-style="assistant-message"],.markdown,.prose')||message.node;
    const clone=body.cloneNode(true);
    S.Formatting.prepare(body,clone,{computed:!fast});return finishBody(clone,doc);
  }
  function* finishSteps(clone,doc){
    for(const n of clone.querySelectorAll('script,style,iframe,object,embed,button,input,textarea,select,[data-conversation-role],.turn-action-controls,.katex-html,[data-d-image-loading]'))n.remove();
    S.Formulas.normalize(clone,doc);stripUnsafe(clone);
    for(const n of [clone,...clone.querySelectorAll('*')]){
      const formula=n.classList?.contains('formula');
      const emphasis=/^(bold|semibold)$/.test(n.getAttribute('data-d-weight')||'')||n.classList?.contains('font-bold')||n.classList?.contains('font-semibold');
      const generated=S.Formulas.isGenerated(n);
      for(const a of [...n.attributes]){
        if(/^on/i.test(a.name)||!generated&&(a.name==='style'||a.name==='class')||a.name.startsWith('data-')||['id','tabindex','contenteditable'].includes(a.name))n.removeAttribute(a.name);
        if(['href','src','xlink:href'].includes(a.name)&&!/^https?:|^data:image\/(png|jpeg|webp|gif);|^blob:|^#/i.test(a.value))n.removeAttribute(a.name);
      }
      if(formula)n.classList.add('formula');
      if(emphasis)n.classList.add('emphasis');
      S.Formatting.restore(n);
      if(n.tagName==='A'){n.setAttribute('target','_blank');n.setAttribute('rel','noopener noreferrer');}yield;
    }
    const result=doc.createElement('div');result.className='body';result.append(...clone.childNodes);return result;
  }
  function finishBody(clone,doc){const steps=finishSteps(clone,doc);let next;do{next=steps.next();}while(!next.done);return next.value;}
  async function safeBodyAsync(message,doc,cancelled){const source=message.node.querySelector('[data-markdown-text-style="assistant-message"],.markdown,.prose')||message.node,clone=source.cloneNode(true);if(!await S.Formatting.prepareAsync(source,clone,{cancelled}))return null;const result=await S.Formatting.runAsync(finishSteps(clone,doc),{cancelled,window:doc.defaultView});return result.cancelled?null:result.value;}
  function contentSignature(message){const body=message.node.querySelector('[data-markdown-text-style="assistant-message"],.markdown,.prose')||message.node;const text=body.textContent;let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return text.length+':'+hash+':'+[...body.querySelectorAll('a[href],img[src]')].map(n=>n.getAttribute('href')||n.getAttribute('src')).join('|');}
  S.Reader=class {
    constructor(app){
      this.app=app;this.doc=app.doc;this.tokens=null;this.records=new Map();this.order=[];this.seenSources=new WeakMap();this.sourceIndex=new WeakMap();this.revision=0;this.pending=new Map();this.workQueue=[];this.worker=null;this.sources=new Set();this.active=true;this.shownCount=0;
      this.host=this.doc.createElement('div');this.host.id='gpt-smooth-reader';const root=this.host.attachShadow({mode:'open'});root.innerHTML=`<style>${CSS}</style><section class="reader" aria-label="轻量阅读层"><div class="header"><b>流畅阅读 · 原生数学公式</b><span id="info"></span></div><div class="workspace"><div class="scroll" tabindex="0" aria-label="轻量对话滚动区域"><div class="messages"></div></div><aside class="rail"><slot name="controls"></slot></aside></div></section>`;
      this.root=root;this.list=root.querySelector('.messages');
      this.scroll=root.querySelector('.scroll');this.navigation=null;
      this.releaseNavigation=()=>this.cancelNavigation();
      for(const event of ['wheel','touchstart','pointerdown'])this.scroll.addEventListener(event,this.releaseNavigation,{passive:true});
      this.scroll.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))this.cancelNavigation();});
      this.queueNavigation=()=>{if(this.navigation&&!this.navigationFrame)this.navigationFrame=this.doc.defaultView.requestAnimationFrame(()=>{this.navigationFrame=null;this.alignNavigation();});};
      this.list.addEventListener('load',this.queueNavigation,true);
      this.doc.fonts?.addEventListener('loadingdone',this.queueNavigation);
      if(this.doc.defaultView.ResizeObserver)this.navigationObserver=new this.doc.defaultView.ResizeObserver(this.queueNavigation);
      const navigationStyle=this.doc.createElement('style');navigationStyle.textContent='.scroll{scroll-behavior:auto!important}';root.append(navigationStyle);
      root.querySelector('.header b').textContent='流畅阅读';
      const layoutStyle=this.doc.createElement('style');layoutStyle.textContent=LAYOUT+" .native-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:12px}.native-actions button{font-size:12px;padding:4px 7px;border-color:transparent;background:transparent;color:inherit}.native-actions button:hover{background:#edf2ef}.workspace{display:grid;grid-template-columns:minmax(0,1fr) var(--smooth-rail,0px);flex:1;min-height:0;overflow:hidden}.scroll{padding:16px 24px 24px;min-width:0;min-height:0}.rail{min-width:0;min-height:0;border-left:1px solid #dfe6e3;background:#f8faf9;overflow:hidden}.workspace.stacked{display:flex;flex-direction:column}.stacked .rail{flex:0 0 min(48vh,420px);border-left:0;border-top:1px solid #dfe6e3}.body{min-width:0}article.user{background:#e8f1fb;border:1px solid #cedff1;color:#203c5c}.workspace.stacked .scroll{flex:1}.header{padding-right:18px}@media(prefers-color-scheme:dark){.rail{background:#1d2822;border-color:#384a3f}article.user{background:#253e58;border-color:#3e5f80;color:#e4effb}}";root.append(layoutStyle);
      S.Formulas.installStyles(root,this.doc);
      this.doc.body.append(this.host);
      
      this.position=()=>{const box=S.Adapter.layout(this.doc,this.app.settings.lightInput);const reader=this.root.querySelector('.reader');reader.style.left=box.left+'px';reader.style.width=box.width+'px';reader.style.right='auto';this.host.style.setProperty('--smooth-rail',box.rail+'px');this.host.style.setProperty('--smooth-bottom-gap','24px');this.root.querySelector('.workspace').classList.toggle('stacked',box.narrow);this.root.querySelector('.rail').hidden=!this.app.settings.lightInput;};
      if(this.doc.defaultView.ResizeObserver){this.resizeObserver=new this.doc.defaultView.ResizeObserver(()=>{if(this.app.ui)this.app.ui.position();else this.position();});const main=S.Adapter.main(this.doc);if(main)this.resizeObserver.observe(main);}
      this.style=this.doc.createElement('style');this.style.textContent='[data-smooth-source]{content-visibility:hidden!important;contain-intrinsic-block-size:auto 600px!important}[data-smooth-measuring]{opacity:0!important}';this.doc.head.append(this.style);
    }
    freeze(){
      const measuring=this.loadingHistory||this.toolsActive;
      for(const group of this.sources)if(!group.isConnected)this.sources.delete(group);
      for(const group of S.Adapter.main(this.doc)?.querySelectorAll('[data-turn-key]')||[]){
        if(measuring){group.removeAttribute('data-smooth-source');if(!group.hasAttribute('data-smooth-measuring'))group.setAttribute('data-smooth-measuring','');}
        else{group.removeAttribute('data-smooth-measuring');if(!group.hasAttribute('data-smooth-source'))group.setAttribute('data-smooth-source','');}
        this.sources.add(group);
      }
    }
    invalidate(node){
      // Message bodies and their shared native-action scopes are both indexed.
      for(let current=node;current;current=current.parentElement){const records=this.sourceIndex.get(current);if(records){for(const record of records)record.dirty=true;return;}}
    }
    refresh({progressive=false,initial=false,onlyDirty=false,messages:snapshot}={}){
      if(!this.active)return;
      const messages=snapshot||(this.app.messages?this.app.messages():S.Adapter.messages(this.doc));this.streaming=messages.some(m=>m.streaming);
      if(!messages.length&&!this.records.size){this.host.style.display='none';for(const n of this.sources){n.removeAttribute('data-smooth-source');n.removeAttribute('data-smooth-measuring');}this.sources.clear();return;}
      this.host.style.removeProperty('display');this.freeze();this.position();let changed=false;
      for(const message of messages)this.seenSources.set(message.node,message.id);
      if(this.tokens===null){const keep=S.Adapter.normalizeKeep(this.app.settings.keep);this.tokens=new Set(keep===null?[]:messages.slice(0,Math.max(0,messages.length-keep)).map(m=>m.id));}
      const current=new Set(messages.map(m=>m.id));for(const record of this.records.values())if(!current.has(record.id)&&record.source){record.source=null;changed=true;}
      // Regeneration/editing replaces a branch; absent messages after that point are stale, not virtualized history.
      const rank=m=>m.ordinal*2+(m.role==='user'?0:1);
      const ranks=new Map();for(const old of this.records.values())if(old.ordinal!==null){const key=rank(old);if(!ranks.has(key))ranks.set(key,new Set());ranks.get(key).add(old.id);}
      const replacements=messages.filter(m=>{const ids=m.ordinal!==null&&ranks.get(rank(m));return ids&&(ids.size>1||!ids.has(m.id));});
      if(!this.loadingHistory&&replacements.length){const cutoff=Math.min(...replacements.map(rank));for(const [id,record]of this.records)if(record.ordinal!==null&&rank(record)>=cutoff&&!current.has(id)){record.article.remove();this.records.delete(id);this.pending.delete(id);this.tokens.delete(id);changed=true;}this.order=this.order.filter(id=>this.records.has(id));}
      // Insert new IDs before the next known message without rescanning order.
      const known=new Set(this.order),before=new Map(),tail=[];let next=null;
      for(let i=messages.length-1;i>=0;i--){const id=messages[i].id;if(known.has(id)){next=id;continue;}const bucket=next?(before.get(next)||[]):tail;bucket.push(id);if(next)before.set(next,bucket);}
      if(before.size||tail.length){const order=[];for(const id of this.order){const bucket=before.get(id);if(bucket)order.push(...bucket.reverse());order.push(id);}order.push(...tail.reverse());this.order=order;changed=true;}
      for(let index=0;index<messages.length;index++){
        const m=messages[index],old=this.records.get(m.id);
        if(old&&(old.source!==m.node||old.ordinal!==m.ordinal||old.streaming!==m.streaming))changed=true;
        if(onlyDirty&&old&&old.source===m.node&&!old.dirty&&!old.streaming&&!m.streaming&&(progressive||old.ready)){old.ordinal=m.ordinal;continue;}
        const signature=contentSignature(m);if(old&&old.signature===signature&&!old.streaming&&!m.streaming&&!old.dirty&&(progressive||old.ready)){old.source=m.node;old.ordinal=m.ordinal;this.app.tools?.render(old.article,m);continue;}
        changed=true;
        const article=old?.article||this.doc.createElement('article');article.className=m.role;article.dataset.messageId=m.id;
        const role=this.doc.createElement('div');role.className='role';role.textContent=m.role==='user'?'你':'ChatGPT';
        const copy=this.doc.createElement('button');copy.type='button';copy.textContent='复制';copy.onclick=()=>{const text=plainText(article.querySelector('.body')).trimEnd();const fallback=()=>navigator.clipboard.writeText(text).catch(()=>{});if(this.app.tools)void this.app.tools.invoke(m.id,{label:'复制',key:'复制#0'},fallback);else void fallback();};role.append(copy);
        let body;if(!progressive)body=safeBody(m,this.doc,m.streaming);else if(m.streaming||index>=messages.length-2)body=safeBody(m,this.doc,true);else if(old?.article.querySelector('.body'))body=old.article.querySelector('.body');else{body=this.doc.createElement('div');body.className='body';body.textContent='正在补入较早内容…';}article.replaceChildren(role,body);this.app.tools?.render(article,m);const scroller=S.Adapter.historyScroller(this.doc),rect=m.node.getBoundingClientRect();const nativeOffset=rect.height>0&&scroller?.clientHeight>0?scroller.scrollTop+rect.top-scroller.getBoundingClientRect().top:old?.nativeOffset;
        const revision=(old?.revision||0)+1;const record={id:m.id,role:m.role,ordinal:m.ordinal,nativeOffset,question:m.role==='user'?S.Adapter.questionText(m):'',article,source:m.node,streaming:m.streaming,signature,revision,ready:!progressive&&!m.streaming};this.records.set(m.id,record);if(progressive&&!m.streaming){const job={message:m,record,revision};this.pending.set(m.id,job);this.workQueue.push({id:m.id,job});}else this.pending.delete(m.id);
      }
      this.sourceIndex=new WeakMap();for(const m of messages){const record=this.records.get(m.id);for(const node of new Set([m.node,m.node.closest('[data-turn-key],[data-testid^="conversation-turn-"],article')]))if(node){let records=this.sourceIndex.get(node);if(!records)this.sourceIndex.set(node,records=new Set());records.add(record);}}
      if(changed)this.revision++;
      if(this.order.every(id=>this.records.get(id).ordinal!==null))this.order.sort((a,b)=>{const left=this.records.get(a),right=this.records.get(b);return left.ordinal-right.ordinal||(left.role==='user'?0:1)-(right.role==='user'?0:1);});
      this.renderVisible();if(initial)this.root.querySelector('.scroll').scrollTop=this.root.querySelector('.scroll').scrollHeight;if(this.pending.size)this.scheduleWork();
    }
    anchor(){const scroll=this.scroll;if(this.navigation)return {scroll,navigation:true};const bottom=scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<64;if(bottom)return {scroll,bottom:true};const viewport=scroll.getBoundingClientRect();let article,top;for(const node of this.list.children){const rect=node.getBoundingClientRect();if(rect.height>0&&rect.bottom>viewport.top){article=node;top=rect.top;break;}}return {scroll,bottom:false,article,top};}
    restoreAnchor(anchor){if(this.navigation){this.alignNavigation();return;}if(anchor.navigation)return;if(anchor.bottom)anchor.scroll.scrollTop=anchor.scroll.scrollHeight;else if(anchor.article?.isConnected)anchor.scroll.scrollTop+=anchor.article.getBoundingClientRect().top-anchor.top;}
    alignNavigation(){const target=this.navigation,article=target&&this.records.get(target.id)?.article;if(!target)return;if(!this.active||!article?.isConnected||article.hidden){this.cancelNavigation();return;}const delta=article.getBoundingClientRect().top-this.scroll.getBoundingClientRect().top-target.offset;if(Math.abs(delta)>.5)this.scroll.scrollTop+=delta;}
    cancelNavigation(){const target=this.navigation;if(target)this.records.get(target.id)?.article.style.removeProperty('content-visibility');this.navigation=null;this.scroll.style.removeProperty('overflow-anchor');this.navigationObserver?.disconnect();if(this.navigationFrame)this.doc.defaultView.cancelAnimationFrame(this.navigationFrame);this.navigationFrame=null;}
    scheduleWork(){if(this.streaming)return;if(this.worker&&!this.worker.abort.signal.aborted)return;const w=this.doc.defaultView,worker={abort:new w.AbortController()};worker.promise=new Promise(resolve=>worker.resolve=resolve);this.worker=worker;const run=async()=>{try{while(this.active&&this.worker===worker&&!worker.abort.signal.aborted&&!this.streaming&&this.workQueue.length){const {id,job}=this.workQueue.pop();if(this.pending.get(id)!==job)continue;worker.current={id,job};const cancelled=()=>this.streaming||!this.active||this.worker!==worker||worker.abort.signal.aborted||this.records.get(id)!==job.record||job.record.revision!==job.revision;const body=await safeBodyAsync(job.message,this.doc,cancelled);if(body&&!cancelled()){const anchor=this.anchor();job.record.article.querySelector('.body')?.replaceWith(body);job.record.ready=true;this.restoreAnchor(anchor);}if(this.pending.get(id)===job){if(job.record.ready||this.records.get(id)!==job.record)this.pending.delete(id);else if(this.active&&this.worker===worker&&!worker.abort.signal.aborted)this.workQueue.push({id,job});}worker.current=null;await new Promise(resolve=>w.setTimeout(resolve,0));}}finally{if(this.worker===worker)this.worker=null;worker.resolve();}};if(w.requestAnimationFrame)worker.frame=w.requestAnimationFrame(()=>worker.timer=w.setTimeout(run,0));else worker.timer=w.setTimeout(run,0);}
    flushPending(){if(this.pending.size&&!this.worker)this.scheduleWork();return this.worker?.promise||Promise.resolve();}
    renderVisible(){
      const anchor=this.anchor();const shown=this.order.filter(id=>!this.tokens.has(id));const selected=new Set(shown);
      for(const [id,record]of this.records)if(!selected.has(id))record.article.remove();
      let after=null;for(const id of shown){const article=this.records.get(id).article;if(article.previousElementSibling!==after||article.parentElement!==this.list)this.list.insertBefore(article,after?after.nextElementSibling:this.list.firstChild);after=article;}
      this.shownCount=shown.length;this.root.getElementById('info').textContent='显示 '+shown.length+' / '+this.order.length+' 条 · 已读取历史保留';this.restoreAnchor(anchor);
    }
    prune(keep){this.refresh();const number=S.Adapter.normalizeKeep(keep);this.tokens=new Set(number===null?[]:this.order.slice(0,Math.max(0,this.order.length-number)));this.renderVisible();this.root.querySelector('.scroll').scrollTop=0;}
    showAll(options){this.tokens=new Set();this.refresh(options);}
    questions(){return this.order.map(id=>this.records.get(id)).filter(r=>r.role==='user').map(r=>({id:r.id,text:r.question}));}
    jumpTo(id){if(!this.active||!this.records.has(id))return false;this.cancelNavigation();const index=this.order.indexOf(id),ids=[id];for(let i=index+1;i<this.order.length&&this.records.get(this.order[i]).role!=='user';i++)ids.push(this.order[i]);for(const key of ids)this.tokens.delete(key);const article=this.records.get(id).article;article.style.setProperty('content-visibility','visible');this.scroll.style.setProperty('overflow-anchor','none');this.navigation={id,offset:12};this.renderVisible();this.alignNavigation();this.navigation.offset=article.getBoundingClientRect().top-this.scroll.getBoundingClientRect().top;this.navigationObserver?.observe(this.list);this.navigationObserver?.observe(article);this.queueNavigation();return true;}
    loadOlder(){const scroller=S.Adapter.historyScroller(this.doc);if(!scroller)return false;scroller.scrollTop=0;scroller.dispatchEvent(new this.doc.defaultView.Event('scroll',{bubbles:true}));return true;}
    suspend(){this.cancelNavigation();if(this.worker){if(this.worker.current)this.workQueue.push(this.worker.current);this.worker.abort.abort();this.doc.defaultView.clearTimeout(this.worker.timer);this.doc.defaultView.cancelAnimationFrame?.(this.worker.frame);this.worker.resolve();this.worker=null;}if(this.app.ui?.host.parentElement===this.host)this.doc.body.append(this.app.ui.host);this.active=false;this.resizeObserver?.disconnect();this.host.remove();this.style.remove();for(const n of this.sources){n.removeAttribute('data-smooth-source');n.removeAttribute('data-smooth-measuring');}this.sources.clear();for(const r of this.records.values())r.source=null;this.sourceIndex=new WeakMap();}
    resume(){this.active=true;this.doc.head.append(this.style);this.doc.body.append(this.host);const main=S.Adapter.main(this.doc);if(main)this.resizeObserver?.observe(main);this.refresh({progressive:true});}
    stop(){this.suspend();this.doc.fonts?.removeEventListener('loadingdone',this.queueNavigation);this.records.clear();this.pending.clear();this.workQueue=[];this.order=[];}
  };
})();
