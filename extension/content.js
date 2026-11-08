(() => {
  'use strict';
  const S=globalThis.GPTSmooth;
  if(/^\/(auth|login|signup)(\/|$)/.test(location.pathname))return;
  if(S.app)return;
  class App {
    constructor(doc=document){
      this.doc=doc;this.route=doc.defaultView.location.pathname+doc.defaultView.location.search;this.settings={enabled:true,lightInput:true,readMode:true,keep:null,uiVersion:13};this.timer=null;this.dead=false;
      this.tools=S.NativeTools?new S.NativeTools(this):null;this.readers=new Map();this.reader=null;this.openReader();this.renderer=new S.Renderer(doc);this.renderer.refresh();this.ui=new S.UI(this);this.history=S.History?new S.History(this):null;
      this.observer=new MutationObserver(records=>{
        if(!this.settings.enabled)return;
        const targets=new Set();
        const messageRoots='main,[role="main"],[data-turn-key],[data-testid^="conversation-turn-"],[data-message-author-role],[data-conversation-role]';
        for(const r of records){
          const n=r.target.nodeType===1?r.target:r.target.parentElement;
          if(!n||n.closest('#gpt-smooth-host,#gpt-smooth-reader,[data-composer-body],form,[contenteditable="true"],[role="textbox"],nav,aside'))continue;
          if(n.closest('main,[role="main"]')||r.type==='childList'&&[...r.addedNodes,...r.removedNodes].some(node=>node.nodeType===1&&(node.matches(messageRoots)||node.querySelector(messageRoots))))targets.add(n);
        }
        if(!targets.size)return;
        for(const target of targets)this.reader?.invalidate(target);
        if(this.timer===null)this.timer=setTimeout(()=>{this.timer=null;if(this.dead||!this.settings.enabled)return;this.checkRoute();const messages=this.messages();if(messages.some(m=>m.streaming))this.history?.stop('回答生成中，稍后继续加载历史');this.reader?.refresh({progressive:true,onlyDirty:true,messages});this.renderer?.refresh(messages);this.ui.update();this.ensureHistory();},300);
      });
      this.observer.observe(doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-talvt-turn-state','data-turn-key','data-conversation-role','data-testid','data-is-streaming','href','src','aria-label','disabled','title','data-tooltip-content','data-chatgpt-conversation-selection-target','data-chatgpt-selection-conversation-id','data-map-composer-conversation','data-message-id','data-chatgpt-search-message-ids']});
      this.navigationTimer=setInterval(()=>{this.checkRoute();this.ensureHistory();},600);this.ensureHistory();
      if(globalThis.chrome?.storage){
        chrome.storage.local.get('smoothSettings').then(data=>{if(data.smoothSettings){const saved=data.smoothSettings,migrate=saved.uiVersion!==13;this.settings={...this.settings,...saved,keep:migrate?null:S.Adapter.normalizeKeep(saved.keep),...(migrate?{lightInput:true,readMode:true}:{}),uiVersion:13};this.apply();if(migrate)this.saveSettings();}}).catch(()=>{});
        this.storageListener=(changes,area)=>{if(area==='local'&&changes.smoothSettings){this.settings={...this.settings,...changes.smoothSettings.newValue};this.apply();}};
        chrome.storage.onChanged.addListener(this.storageListener);
        this.messageListener=(msg,sender,reply)=>{if(sender.id!==chrome.runtime.id)return;if(msg?.type==='smooth-status')reply({settings:this.settings,stats:{...this.renderer?.stats,messages:this.reader?.order.length||this.renderer?.stats.messages||0},draft:!!this.ui.area.value||this.ui.files.length>0});};
        chrome.runtime.onMessage.addListener(this.messageListener);
      }
    }
    saveSettings(){if(globalThis.chrome?.storage)chrome.storage.local.set({smoothSettings:this.settings}).catch(()=>{});}
    ensureHistory(){this.history?.ensure();}
    openReader(){if(!S.Reader)return;this.reader=this.readers.get(this.route);if(this.reader)this.reader.resume();else{this.reader=new S.Reader(this);this.readers.set(this.route,this.reader);this.reader.refresh({progressive:true,initial:true});}}
    messages(){return S.Adapter.messages(this.doc).filter(m=>m.conversationId||this.outgoing?.get(m.node)!==m.id);}
    isRouteReady(){if(this.outgoing){if(S.Adapter.messages(this.doc).some(m=>!m.conversationId&&this.outgoing.get(m.node)===m.id))return false;this.outgoing=null;}return true;}
    apply(){if(!this.settings.enabled||!this.settings.readMode)this.tools?.popups?.stop();if(!this.settings.enabled||!this.settings.readMode)this.history?.stop('已切换到原网页或暂停');if(!this.settings.enabled){this.ui?.abort?.abort();this.reader?.suspend();this.reader=null;this.renderer?.stop();this.renderer=null;}else{if(this.settings.readMode&&!this.reader)this.openReader();if(!this.settings.readMode&&this.reader){this.reader.suspend();this.reader=null;}if(!this.renderer){this.renderer=new S.Renderer(this.doc);this.renderer.refresh();}}this.ui.update();this.ensureHistory();}
    async setEnabled(enabled){
      if(!enabled)this.ui.abort?.abort();if(enabled){this.settings.lightInput=true;this.settings.readMode=true;this.settings.keep=null;if(this.history?.state.phase==='partial')this.history.states.set(this.route,{...this.history.state,phase:'idle'});}this.settings.enabled=enabled;this.apply();this.saveSettings();
      if(!enabled)this.ui.message(this.ui.area.value?'已暂停正文优化，轻量草稿仍保留；可复制或切换原生输入。':'已暂停，原网页布局已恢复。');
    }
    checkRoute(){const route=this.doc.defaultView.location.pathname+this.doc.defaultView.location.search;if(route===this.route)return;this.tools?.popups?.stop();this.history?.stop('正在切换对话');this.outgoing=route.split('?')[0]!==this.route.split('?')[0]?(this.reader||this.readers.get(this.route))?.seenSources||null:null;this.route=route;this.reader?.suspend();this.reader=null;this.renderer?.stop();this.renderer=this.settings.enabled?new S.Renderer(this.doc):null;this.ui.onRoute(route);if(this.settings.enabled&&this.settings.readMode)this.openReader();this.renderer?.refresh();this.ui.update();}
    stop(){this.dead=true;this.tools?.popups?.stop();this.history?.stop('页面已关闭');this.observer.disconnect();clearTimeout(this.timer);clearInterval(this.navigationTimer);for(const reader of this.readers.values())reader.stop();this.readers.clear();this.renderer?.stop();this.ui.destroy();if(this.storageListener)chrome.storage.onChanged.removeListener(this.storageListener);if(this.messageListener)chrome.runtime.onMessage.removeListener(this.messageListener);}
  }
  S.app=new App();
})();
