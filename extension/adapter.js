(() => {
  'use strict';
  const S = globalThis.GPTSmooth ||= {};
  const roles = '[data-conversation-role="user"],[data-conversation-role="assistant"]';
  const oldTurns = '[data-testid^="conversation-turn-"],[data-testid="conversation-turn"],[data-turn-id],[data-turn="user"],[data-turn="assistant"]';
  const oldMessages = '[data-message-author-role="user"],[data-message-author-role="assistant"]';
  const excluded = 'form,nav,aside,[contenteditable="true"],[role="textbox"],#gpt-smooth-host';
  const nodeIds = new WeakMap();
  const layouts = new WeakMap();
  let sequence = 0;
  function inactive(node){
    for(let n=node;n&&n.nodeType===1;n=n.parentElement)if(n.hidden||n.hasAttribute('inert')||n.getAttribute('aria-hidden')==='true'||n.style.display==='none')return true;
    return false;
  }
  function main(doc=document){
    const roots=[...doc.querySelectorAll('main,[role="main"]')].filter(n=>!inactive(n));
    if(roots.length<2)return roots[0]||null;
    return roots.find(n=>n.getClientRects().length&&n.getBoundingClientRect().width>100)||roots.at(-1)||null;
  }
  function outermost(nodes) {
    const set = new Set(nodes);
    return nodes.filter(n => { for (let p=n.parentElement;p;p=p.parentElement) if(set.has(p))return false;return true; });
  }
  function routeMatches(node,doc,composer=false){
    const decode=value=>{if(value==null)return value;try{return decodeURIComponent(value);}catch{return value;}};
    const expected=decode(doc.defaultView.location.pathname.match(/\/c\/([^/]+)/)?.[1]);
    const attr=composer?'data-map-composer-conversation':'data-chatgpt-conversation-selection-target';
    const actual=node.closest('['+attr+']')?.getAttribute(attr)||(!composer&&node.querySelector('[data-chatgpt-selection-conversation-id]')?.getAttribute('data-chatgpt-selection-conversation-id'));
    return !actual||(expected?decode(actual)===expected:! /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(actual));
  }
  function messages(doc = document) {
    const root = main(doc);
    if (!root) return [];
    const nodes = outermost([...root.querySelectorAll(oldTurns)].filter(n=>!n.closest(excluded)));
    for (const heading of root.querySelectorAll(roles)) {
      if (heading.closest(excluded) || nodes.some(n=>n.contains(heading))) continue;
      const boundary=heading.closest('[data-turn-key],[data-content-search-turn-key]')||root;
      let node=heading;
      while(node.parentElement && node.parentElement!==boundary && node.parentElement!==root && node.parentElement.querySelectorAll(roles).length===1) node=node.parentElement;
      if(node!==heading)nodes.push(node);
    }
    for(const marker of outermost([...root.querySelectorAll(oldMessages)].filter(n=>!n.closest(excluded)))) {
      if(nodes.some(n=>n.contains(marker)))continue;
      const article=marker.closest('article');
      nodes.push(article && article!==root && article.querySelectorAll(oldMessages).length===1?article:marker);
    }
    return outermost([...new Set(nodes)]).filter(node=>routeMatches(node,doc)).sort((a,b)=>a.compareDocumentPosition(b)&4?-1:1).map(node=>{
      const heading=node.matches(roles+','+oldMessages)?node:node.querySelector(roles+','+oldMessages);
      const role=heading?.getAttribute('data-conversation-role')||heading?.getAttribute('data-message-author-role')||node.getAttribute('data-turn')||'assistant';
      const marker=node.matches('[data-chatgpt-search-message-ids],[data-message-id]')?node:node.querySelector('[data-chatgpt-search-message-ids],[data-message-id]');
      let id=marker?.getAttribute('data-chatgpt-search-message-ids')?.trim().split(/\s+/)[0]||marker?.getAttribute('data-message-id')||node.getAttribute('data-turn-id')||node.getAttribute('data-testid');
      if(!id){const group=node.closest('[data-turn-key]');if(group)id=group.getAttribute('data-turn-key')+':'+role;}
      if(!id){if(!nodeIds.has(node))nodeIds.set(node,'node-'+(++sequence));id=nodeIds.get(node);}
      const state=node.closest('[data-talvt-turn-state]')?.getAttribute('data-talvt-turn-state');
      const key=node.closest('[data-content-search-turn-key]')?.getAttribute('data-content-search-turn-key')||node.querySelector('[data-content-search-turn-key]')?.getAttribute('data-content-search-turn-key')||node.closest('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid')||'';
      const index=key.match(/turn-(\d+)/);
      const conversationId=node.closest('[data-chatgpt-conversation-selection-target]')?.getAttribute('data-chatgpt-conversation-selection-target')||node.querySelector('[data-chatgpt-selection-conversation-id]')?.getAttribute('data-chatgpt-selection-conversation-id');
      return {node,id,role,conversationId,ordinal:index?Number(index[1]):null,streaming:!!(state && state!=='complete')||!!node.querySelector('[data-is-streaming="true"]')};
    });
  }
  function blocks(message) {
    if(message.role!=='assistant'||message.streaming)return [];
    let roots=outermost([...message.node.querySelectorAll('[data-markdown-text-style="assistant-message"],.markdown,.prose')]);
    if(!roots.length)roots=[message.node];
    const selector='p,pre,table,ul,ol,blockquote,figure,.katex-display,[data-d-component="math-block"],[data-d-component="code-block"]';
    return outermost(roots.flatMap(root=>[...root.querySelectorAll(selector)]))
      .filter(n=>!n.closest('button,[contenteditable],svg,math') && (n.matches('pre,table,ul,ol,blockquote,figure,.katex-display')||!n.closest('.katex,pre,table')));
  }
  function editor(doc=document) {
    const all=[...doc.querySelectorAll('[data-composer-markdown][contenteditable="true"],#prompt-textarea,textarea[data-id="root"],main textarea,main [contenteditable="true"][role="textbox"]')]
      .filter(n=>!inactive(n)&&routeMatches(n,doc,true)&&!n.closest('#gpt-smooth-host') && !n.disabled && n.getAttribute('aria-disabled')!=='true');
    const current=main(doc),inside=all.filter(n=>current?.contains(n));
    return inside.find(n=>n.getClientRects().length)||inside[0]||all.find(n=>n.getClientRects().length)||all[0]||null;
  }
  function text(node){return !node?'':('value'in node?node.value:node.innerText??node.textContent??'').replace(/\r\n/g,'\n');}
  function sendButton(doc=document, input=editor(doc)) {
    const scope=input?.closest('[data-composer-body],form')||doc;
    return [...scope.querySelectorAll('button')].find(b=>{
      const label=b.getAttribute('aria-label')||b.textContent.trim();
      if(/stop|停止|取消/i.test(label)||b.matches('[data-testid="stop-button"],[data-test-id="stop-button"]'))return false;
      return b.matches('#composer-submit-button,[data-testid="send-button"],[data-test-id="send-button"]')||/^(发送|发送消息|提交|Send|Send message|Send prompt|Submit prompt)$/i.test(label);
    })||null;
  }
  function layout(doc=document,light=true){
    const viewport=doc.defaultView.innerWidth||1024;
    const active=main(doc);if(!active&&layouts.has(doc)&&doc.querySelector('[data-smooth-tool-popup]'))return layouts.get(doc);
    const rect=active?.getBoundingClientRect();
    const left=rect?.width>100?Math.max(0,rect.left):0;
    const width=Math.max(1,Math.min(viewport-left,rect?.width>100?rect.width:viewport));
    const narrow=width<760;
    const panelWidth=Math.min(380,Math.max(300,Math.round(width*.25)));
    const rail=light&&!narrow?panelWidth:0;
    const result={left,width,panelWidth,rail,narrow,contentWidth:width-rail,top:Math.max(96,Math.min(144,(rect?.top||0)+96))};layouts.set(doc,result);return result;
  }
  function normalizeKeep(value){if(value==null||/^(\s*|0|无限|all|∞)$/i.test(String(value)))return null;const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:null;}
  function questionText(message){const copy=message.node.cloneNode(true);for(const n of copy.querySelectorAll('h4,[data-conversation-role],button,svg,.sr-only,[aria-hidden="true"]'))n.remove();return copy.textContent.replace(/\s+/g,' ').trim()||'图片或附件问题';}
  function historyScroller(doc=document){const root=main(doc);if(!root)return null;const known=root.matches('.thread-scroll-container,[data-app-action-timeline-scroll]')?root:root.querySelector('.thread-scroll-container,[data-app-action-timeline-scroll]');if(known?.clientHeight>0)return known;let node=root.querySelector('[data-turn-key]')?.parentElement;for(;node;node=node.parentElement){const css=doc.defaultView.getComputedStyle(node);if(/auto|scroll/.test(css.overflowY)&&node.clientHeight>0&&node.scrollHeight>node.clientHeight+50)return node;}return root.clientHeight>0?root:doc.scrollingElement||root;}
  S.Adapter={messages,blocks,editor,text,sendButton,outermost,layout,main,normalizeKeep,questionText,historyScroller};
})();
