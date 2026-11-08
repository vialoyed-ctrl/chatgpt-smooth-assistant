(() => {
  'use strict';
  const S=globalThis.GPTSmooth;
  const selectors='[data-radix-popper-content-wrapper],[role="menu"],[role="dialog"],dialog[open],[data-headlessui-state~="open"],[class*="dropdown"],[class*="popover"],[class*="ai-export"],[id*="ai-export"]';
  S.NativePopups=class {
    constructor(app){this.app=app;this.doc=app.doc;this.session=null;}
    get active(){return !!this.session&&(!this.session.opened||this.session.promoted.size>0);}
    idle(session){if(this.session!==session||session.promoted.size)return;if(session.reader){session.reader.toolsActive=false;if(session.reader.active)session.reader.freeze();}}
    candidates(root){const list=[];if(![1,11].includes(root.nodeType))return list;if(root.matches?.(selectors))list.push(root);list.push(...root.querySelectorAll(selectors));if(root!==this.doc.body&&root.textContent.length<6000&&/AI[\s_-]*Exporter|SaveAI/i.test(root.textContent)&&/Notion|Markdown|保存为|Save as/i.test(root.textContent)){for(const node of [...(root.nodeType===1?[root]:[]),...root.querySelectorAll('div,section,nav,ul')])if(/fixed|absolute/.test(this.doc.defaultView.getComputedStyle(node).position))list.push(node);}return S.Adapter.outermost([...new Set(list)]).filter(node=>!node.closest('#gpt-smooth-reader,#gpt-smooth-host'));}
    content(node){return node.matches('[role="menu"],[role="dialog"],dialog')?node:node.querySelector('[role="menu"],[role="dialog"]')||node;}
    visible(node){const content=this.content(node);if(!node.isConnected||node.hidden||content.hidden||content.getAttribute('aria-hidden')==='true'||content.getAttribute('data-state')==='closed')return false;const css=this.doc.defaultView.getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden')return false;const role=content.getAttribute('role');return role==='menu'||role==='dialog'||node.matches('dialog[open],[data-radix-popper-content-wrapper]')||(/fixed|absolute/.test(css.position)&&/AI[\s_-]*Exporter|Notion|Markdown|保存为|Save as/i.test(node.textContent));}
    begin(anchor){
      this.stop();const reader=this.app.reader;
      const session={route:this.app.route,url:this.doc.defaultView.location.href,reader,anchor,rect:anchor?.getBoundingClientRect?.(),promoted:new Map(),roots:new Set([this.doc.body]),baseline:new Set(this.candidates(this.doc.body).filter(node=>this.visible(node))),opened:false};this.session=session;
      if(reader){reader.toolsActive=true;reader.freeze();}
      session.observer=new this.doc.defaultView.MutationObserver(records=>{
        if(this.session!==session)return;if(this.app.dead||this.app.route!==session.route||this.doc.defaultView?.location?.href!==session.url){this.stop();return;}
        for(const [node,entry]of [...session.promoted])if(!this.visible(node)){this.restore(node,entry);session.promoted.delete(node);}else if(entry.anchored)this.position(node,entry,session);
        for(const record of records){const roots=record.type==='childList'?[...record.addedNodes]:[record.target];for(const root of roots)for(const node of this.candidates(root))if(!session.baseline.has(node)&&this.visible(node))this.promote(node,session);}
        if(session.opened&&!session.promoted.size)this.idle(session);
      });
      session.observer.observe(this.doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state','hidden','aria-hidden','style','class']});
      session.resize=()=>{for(const [node,entry]of session.promoted)if(entry.anchored)this.position(node,entry,session);};this.doc.defaultView.addEventListener('resize',session.resize);
      const inside=event=>event.composedPath().some(node=>node===session.anchor||node===session.trigger||session.promoted.has(node));
      session.pointer=event=>{if(!inside(event))this.stop();};
      session.key=event=>{
        if(event.key==='Escape'){
          const nested=session.promoted.size>1;
          // Let the site's handler close a submenu before deciding whether the
          // whole interaction ended; an open parent must keep its positioning.
          this.doc.defaultView.queueMicrotask(()=>{if(this.session===session&&(!nested||![...session.promoted.keys()].some(node=>this.visible(node))))this.stop();});
        }else if(!inside(event))this.stop();
      };
      this.doc.addEventListener('pointerdown',session.pointer,true);this.doc.addEventListener('keydown',session.key,true);
      return session;
    }
    watch(root,trigger){const session=this.session;if(!session)return;if(trigger)session.trigger=trigger;if(root.nodeType!==11||root.host?.localName!=='saveai-chat-export-btn'||session.roots.has(root))return;session.roots.add(root);for(const node of this.candidates(root))if(this.visible(node))session.baseline.add(node);session.observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state','hidden','aria-hidden','style','class']});}
    set(node,entry,key,value){if(!entry.styles.has(key))entry.styles.set(key,{value:node.style.getPropertyValue(key),priority:node.style.getPropertyPriority(key)});if(node.style.getPropertyValue(key)!==value||node.style.getPropertyPriority(key)!=='important')node.style.setProperty(key,value,'important');}
    position(node,entry,session){const w=this.doc.defaultView,rect=session.anchor?.isConnected?session.anchor.getBoundingClientRect():session.rect||{left:Math.max(8,w.innerWidth/2-100),top:80,bottom:100};const box=node.getBoundingClientRect(),width=Math.min(box.width||240,w.innerWidth-16),height=box.height||180;const dialog=entry.kind==='dialog';const left=dialog?Math.max(8,(w.innerWidth-width)/2):Math.max(8,Math.min(rect.left,w.innerWidth-width-8));const top=dialog?Math.max(8,(w.innerHeight-height)/2):(rect.bottom+height+8<w.innerHeight?rect.bottom+6:Math.max(8,rect.top-height-6));this.set(node,entry,'left',(Math.round(left*100)/100)+'px');this.set(node,entry,'top',(Math.round(top*100)/100)+'px');this.set(node,entry,'transform','none');}
    promote(node,session){
      if(this.session!==session||session.promoted.has(node))return;
      if([...session.promoted.keys()].some(parent=>parent.contains(node)))return;
      const content=this.content(node),kind=content.getAttribute('role')==='dialog'||node.tagName==='DIALOG'?'dialog':'menu';
      const entry={styles:new Map(),popover:node.getAttribute('popover'),owned:false,kind,anchored:session.promoted.size===0||kind==='dialog'};
      session.promoted.set(node,entry);session.opened=true;
      const wrapper=node.hasAttribute('data-radix-popper-content-wrapper');
      this.set(node,entry,'position','fixed');this.set(node,entry,'margin','0px');this.set(node,entry,'right','auto');this.set(node,entry,'bottom','auto');this.set(node,entry,'z-index','2147483647');this.set(node,entry,'pointer-events','auto');
      this.set(node,entry,'max-width','calc(100vw - 16px)');this.set(node,entry,'max-height','calc(100vh - 16px)');this.set(node,entry,'overflow',wrapper?'visible':'auto');
      if(wrapper){this.set(node,entry,'padding','0px');this.set(node,entry,'border','0px');this.set(node,entry,'background','transparent');}
      if(entry.anchored)this.position(node,entry,session);
      node.setAttribute('data-smooth-tool-popup',kind);
      if(session.reader&&!session.reader.toolsActive){session.reader.toolsActive=true;session.reader.freeze();this.app.history?.stop('正在打开消息工具');}
      try{if(node.tagName!=='DIALOG'||!node.open){if(typeof node.showPopover==='function'){if(entry.popover===null){node.setAttribute('popover','manual');entry.owned=true;}node.showPopover();}}}catch{}
      entry.toggle=event=>{if(event.newState==='closed'&&session.promoted.has(node)){this.restore(node,entry);session.promoted.delete(node);if(!session.promoted.size)this.idle(session);}};node.addEventListener('toggle',entry.toggle);
    }
    restore(node,entry){node.removeEventListener('toggle',entry.toggle);try{if(entry.owned&&typeof node.hidePopover==='function')node.hidePopover();}catch{}if(entry.owned){if(entry.popover===null)node.removeAttribute('popover');else node.setAttribute('popover',entry.popover);}node.removeAttribute('data-smooth-tool-popup');for(const [key,original]of entry.styles)if(original.value)node.style.setProperty(key,original.value,original.priority);else node.style.removeProperty(key);}
    async afterTrigger(timeout=1600){const session=this.session;if(!session)return false;for(const root of session.roots)for(const node of this.candidates(root))if(!session.baseline.has(node)&&this.visible(node))this.promote(node,session);const end=Date.now()+timeout;while(this.session===session&&!session.opened&&Date.now()<end)await new Promise(resolve=>this.doc.defaultView.setTimeout(resolve,20));if(this.session===session&&!session.opened)this.stop();return session.opened;}
    stop(){const session=this.session;if(!session)return;this.session=null;session.observer?.disconnect();this.doc.defaultView.removeEventListener('resize',session.resize);this.doc.removeEventListener('pointerdown',session.pointer,true);this.doc.removeEventListener('keydown',session.key,true);for(const [node,entry]of session.promoted)this.restore(node,entry);session.promoted.clear();if(session.reader){session.reader.toolsActive=false;if(session.reader.active)session.reader.freeze();}this.doc.defaultView.queueMicrotask(()=>{if(!this.app.dead&&this.app.route===session.route&&this.doc.defaultView?.location?.href===session.url)this.app.ensureHistory?.();});}
  };
})();
