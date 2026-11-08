(() => {
  'use strict';
  const S=globalThis.GPTSmooth;
  const CSS='[data-smooth-chunk]{content-visibility:auto;contain-intrinsic-block-size:auto var(--smooth-height,120px)}[data-smooth-hidden],[data-smooth-collapsed]{display:none!important}[data-smooth-resized]{height:auto!important;min-height:0!important}@media print{[data-smooth-chunk]{content-visibility:visible!important;contain:none!important}[data-smooth-hidden],[data-smooth-collapsed]{display:revert!important}}';
  S.Renderer=class {
    constructor(doc=document){
      doc.documentElement.removeAttribute('data-smooth-paused');
      this.doc=doc;this.tokens=new Set();this.chunks=new Set();this.observed=new Set();this.marked=new Set();this.rows=new Set();this.dead=false;this.stats={messages:0,chunks:0,hidden:0,scans:0};
      this.style=doc.createElement('style');this.style.textContent=CSS;doc.head.append(this.style);
      const IO=doc.defaultView.IntersectionObserver;
      this.io=IO?new IO(entries=>{
        for(const {target,boundingClientRect:rect} of entries){
          if(this.dead||!target.isConnected||target.closest('[data-smooth-hidden]')||!(rect.height>0))continue;
          // Observer geometry is already computed by the browser: no forced layout reads on typing.
          if(!target.hasAttribute('data-smooth-chunk')){
            target.style.setProperty('--smooth-height',rect.height+'px');target.setAttribute('data-smooth-chunk','');this.chunks.add(target);
          }
        }
        this.stats.chunks=this.chunks.size;
      },{rootMargin:'800px'}):null;
    }
    refresh(snapshot){
      if(this.dead)return;
      const messages=snapshot||S.Adapter.messages(this.doc);this.stats.scans++;this.stats.messages=messages.length;
      const stopped=!!this.doc.querySelector('button[data-testid="stop-button"],button[aria-label="停止生成"],button[aria-label="Stop generating"]');
      const present=new Set(messages.map(m=>m.node));
      for(const node of this.marked)if(!present.has(node)){node.removeAttribute('data-smooth-hidden');this.marked.delete(node);}
      for(const m of messages){
        if(this.tokens.has(m.id)){m.node.setAttribute('data-smooth-hidden','');this.marked.add(m.node);}else{m.node.removeAttribute('data-smooth-hidden');this.marked.delete(m.node);}
        if(m.streaming||(stopped&&m===messages.at(-1)))continue;
        for(const block of S.Adapter.blocks(m))if(!this.observed.has(block)){this.observed.add(block);this.io?.observe(block);}
      }
      for(const block of this.observed)if(!block.isConnected){this.io?.unobserve(block);this.observed.delete(block);this.chunks.delete(block);}
      for(const row of this.rows){row.removeAttribute('data-smooth-collapsed');row.removeAttribute('data-smooth-resized');}this.rows.clear();
      const groups=new Map();
      for(const m of messages){const g=m.node.closest('[data-turn-key]');if(g){if(!groups.has(g))groups.set(g,[]);groups.get(g).push(m);}}
      for(const [group,list]of groups){const hidden=list.filter(m=>this.tokens.has(m.id)).length;if(!hidden)continue;const p=group.parentElement;const row=p&&p.children.length===1&&(p.style.height||p.style.minHeight)?p:group;row.setAttribute(hidden===list.length?'data-smooth-collapsed':'data-smooth-resized','');this.rows.add(row);}
      this.stats.hidden=this.marked.size;this.stats.chunks=this.chunks.size;
    }
    prune(keep=3){const messages=S.Adapter.messages(this.doc),number=S.Adapter.normalizeKeep(keep);if(number===null)this.tokens.clear();const cutoff=number===null?0:Math.max(0,messages.length-number);messages.forEach((m,i)=>i<cutoff?this.tokens.add(m.id):this.tokens.delete(m.id));this.refresh();}
    reveal(ids){for(const id of ids)this.tokens.delete(id);this.refresh();}
    showAll(){this.tokens.clear();this.refresh();}
    stop(){
      this.doc.documentElement.setAttribute('data-smooth-paused','');
      this.dead=true;this.io?.disconnect();this.style.remove();
      for(const n of this.observed){n.removeAttribute('data-smooth-chunk');n.style.removeProperty('--smooth-height');}
      for(const n of this.marked)n.removeAttribute('data-smooth-hidden');
      for(const n of this.rows){n.removeAttribute('data-smooth-collapsed');n.removeAttribute('data-smooth-resized');}
      this.observed.clear();this.chunks.clear();this.marked.clear();this.rows.clear();this.tokens.clear();
    }
  };
})();
