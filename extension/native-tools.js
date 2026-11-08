(() => {
  'use strict';
  const S=globalThis.GPTSmooth,roles='[data-conversation-role],[data-message-author-role]';
  const labelOf=button=>button.getAttribute('aria-label')||button.title||button.getAttribute('data-tooltip-content')||button.querySelector('img[alt]')?.alt||button.textContent.trim();
  const isExporter=label=>/AI[\s_-]*Exporter|AI[\s_-]*Export|SaveAI[\s_-]*Export|^导出|^Export/i.test(label);
  function describe(message){
    const scope=message.node.closest('[data-turn-key],[data-testid^="conversation-turn-"],article')||message.node;
    const headings=[...scope.querySelectorAll(roles)],seen=new Map(),result=[];
    const controls=[...scope.querySelectorAll('button,[role="button"]')].map(button=>({button,position:button}));
    // SaveAI uses a WXT open shadow root. The host, not its shadow descendants,
    // carries the document-order relationship with the message role heading.
    for(const host of scope.querySelectorAll('saveai-chat-export-btn')){
      const root=host.shadowRoot;if(!root)continue;
      const button=[...root.querySelectorAll('button,[role="button"]')].find(b=>/SaveAI[\s_-]*Export|AI[\s_-]*Export/i.test(labelOf(b)))||root.querySelector('button');
      if(button)controls.push({button,position:host,exporter:true});
    }
    for(const {button,position,exporter}of controls){
      let owner=null;for(const heading of headings)if(heading.compareDocumentPosition(position)&4)owner=heading;
      if(owner&&(owner.getAttribute('data-conversation-role')||owner.getAttribute('data-message-author-role'))!==message.role)continue;
      if(exporter&&message.role!=='assistant')continue;
      if(position.closest('[hidden],[aria-hidden="true"],[class*="resource-card"]')||button.closest('[hidden],[aria-hidden="true"]'))continue;
      const raw=labelOf(button)||(/ai[-_]?export/i.test(button.className+' '+button.id)?'AI Exporter':'');
      const label=exporter||/SaveAI[\s_-]*Export/i.test(raw)?'AI Exporter':raw;
      if(!label)continue;
      if(position.closest('[data-markdown-text-style],.markdown,.prose')&&!isExporter(label))continue;
      const n=seen.get(label)||0;seen.set(label,n+1);result.push({key:label+'#'+n,label,hover:!!exporter||/SaveAI[\s_-]*Export/i.test(raw),disabled:button.disabled||button.getAttribute('aria-disabled')==='true',button});
    }
    return result;
  }
  S.NativeTools=class {
    static describe=describe;
    constructor(app){this.app=app;this.doc=app.doc;this.busy=false;this.signatures=new WeakMap();this.popups=S.NativePopups?new S.NativePopups(app):null;this.popupTimeout=1600;this.exporterTimeout=1500;}
    render(article,message){
      const items=describe(message).filter(item=>!/^复制(?:消息)?$|^Copy(?: message)?$/i.test(item.label));
      if(message.role==='assistant'&&!items.some(item=>isExporter(item.label)))items.push({label:'AI Exporter',key:'AI Exporter#0',disabled:false});
      const signature=JSON.stringify(items.map(({key,label,disabled})=>({key,label,disabled})));
      if(this.signatures.get(article)===signature&&(!items.length||article.querySelector('.native-actions')))return;this.signatures.set(article,signature);article.querySelector('.native-actions')?.remove();if(!items.length)return;
      const row=this.doc.createElement('div');row.className='native-actions';row.setAttribute('aria-label','消息原生工具');
      for(const item of items){const button=this.doc.createElement('button');button.type='button';button.textContent=item.label;button.title=item.label;button.setAttribute('aria-label',item.label);button.disabled=item.disabled;const action={label:item.label,key:item.key,anchor:button};button.onclick=()=>void this.invoke(message.id,action);row.append(button);}article.append(row);
    }
    async seek(id,valid){
      const app=this.app,reader=app.reader,record=reader?.records.get(id),scroller=S.Adapter.historyScroller(this.doc);
      const find=()=>app.messages().find(message=>message.id===id);
      if(find())return find();if(!record||!scroller?.clientHeight)return null;
      const wait=()=>new Promise(resolve=>this.doc.defaultView.setTimeout(resolve,160));
      const move=async top=>{scroller.scrollTop=Math.max(0,Math.min(top,scroller.scrollHeight-scroller.clientHeight));scroller.dispatchEvent(new this.doc.defaultView.Event('scroll',{bubbles:true}));await wait();if(valid())reader.refresh();};
      const previous=reader.loadingHistory;reader.loadingHistory=true;reader.freeze();
      try{
        if(Number.isFinite(record.nativeOffset)){await move(record.nativeOffset);if(!valid())return null;if(find())return find();}
        let low=0,high=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
        for(let i=0;i<14&&valid();i++){
          const middle=(low+high)/2;await move(middle);if(!valid())return null;if(find())return find();
          const values=app.messages().map(m=>m.ordinal).filter(Number.isInteger);
          if(!values.length||!Number.isInteger(record.ordinal))break;
          if(record.ordinal<Math.min(...values))high=middle-scroller.clientHeight*.5;else if(record.ordinal>Math.max(...values))low=middle+scroller.clientHeight*.5;else{await move(Math.max(0,middle-scroller.clientHeight));if(find())return find();break;}
          if(high<low)break;
        }
        return null;
      }finally{reader.loadingHistory=previous;if(reader.active)reader.freeze();}
    }
    async invoke(id,action,fallback){
      const app=this.app,route=app.route,url=this.doc.defaultView.location.href,reader=app.reader;
      if(fallback&&/^复制(?:消息)?$|^Copy(?: message)?$/i.test(action.label)){const message=app.messages().find(m=>m.id===id),item=message&&describe(message).find(item=>/^复制(?:消息)?$|^Copy(?: message)?$/i.test(item.label));if(item&&!item.disabled)item.button.click();else void fallback();return true;}
      if(this.busy||app.ui.pending){app.ui.message('请等待当前操作完成。',true);return false;}
      this.busy=true;app.history?.stop('正在打开消息工具');
      const valid=()=>!app.dead&&!app.ui.pending&&app.settings.enabled&&app.settings.readMode&&app.reader===reader&&reader?.active&&app.route===route&&this.doc.defaultView.location.href===url;
      try{
        await app.history?.promise;if(!valid())return false;
        this.popups?.begin(action.anchor);let message=await this.seek(id,valid);if(!valid())return false;
        let items=message?describe(message):[],item=items.find(item=>item.key===action.key)||items.find(item=>item.label===action.label);
        if(!item&&isExporter(action.label))item=items.find(item=>isExporter(item.label));
        if(!item&&message&&isExporter(action.label)){
          // Other extensions mount after our initial paint, and may remount a
          // virtualized turn. Wait locally; never use a different reply's icon.
          const end=Date.now()+this.exporterTimeout;
          while(!item&&valid()&&Date.now()<end){await new Promise(resolve=>this.doc.defaultView.setTimeout(resolve,50));message=app.messages().find(m=>m.id===id);item=message&&describe(message).find(entry=>isExporter(entry.label));}
        }
        if(!valid())return false;
        if(!item&&fallback){await fallback();return true;}
        if(!item){this.popups?.stop();app.ui.message(isExporter(action.label)?'当前消息尚未出现 AI Exporter 导出按钮。已检查 SaveAI 和 Shadow DOM 入口；请在 AI Exporter 设置中开启单条消息导出按钮后重试。':'此消息的原生操作暂不可用，已保留当前阅读界面。',true);return false;}
        if(item.disabled){this.popups?.stop();app.ui.message('此原生工具当前不可用。',true);return false;}
        // Native menus and third-party popups keep their original DOM and event handlers.
        const copy=/^复制(?:消息)?$|^Copy(?: message)?$/i.test(item.label);
        if(!valid()||!item.button.isConnected)return false;
        this.popups?.watch(item.button.getRootNode(),item.button);
        if(item.hover){
          item.button.dispatchEvent(new this.doc.defaultView.MouseEvent('mouseover',{bubbles:true,composed:true,relatedTarget:null}));
          item.button.dispatchEvent(new this.doc.defaultView.MouseEvent('mouseenter',{bubbles:false,composed:false,relatedTarget:null}));
        }
        if(item.button.getAttribute('aria-haspopup')==='menu'){
          const EventType=this.doc.defaultView.PointerEvent||this.doc.defaultView.MouseEvent;
          item.button.dispatchEvent(new EventType('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));
          item.button.dispatchEvent(new EventType('pointerup',{bubbles:true,button:0,pointerType:'mouse'}));
        }
        item.button.click();
        if(!copy){const opened=await this.popups?.afterTrigger(/朗读|read aloud|来源/i.test(item.label)?Math.min(120,this.popupTimeout):this.popupTimeout);if(isExporter(item.label)&&!opened){app.ui.message('已找到 AI Exporter 按钮，但菜单未打开，请检查它的单条消息导出设置或刷新后重试。',true);return false;}}return true;
      }catch{this.popups?.stop();app.ui.message('工具暂未打开，当前阅读界面保持不变。',true);return false;}
      finally{this.busy=false;if(!valid())this.popups?.stop();if(valid())app.ensureHistory();}
    }
  };
})();
