(() => {
  'use strict';
  const S=globalThis.GPTSmooth;
  const equivalent=(a,b)=>a.replace(/\r\n/g,'\n').trimEnd()===b.replace(/\r\n/g,'\n').trimEnd();
  async function write(editor,value){
    if(!editor?.isConnected)throw Error('未找到原生输入框，请切换到原生输入。');
    const doc=editor.ownerDocument,w=doc.defaultView;
    if('value'in editor){
      const proto=editor.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(editor,value);
      editor.dispatchEvent(new w.InputEvent('input',{bubbles:true,composed:true,inputType:'insertText',data:value}));
    }else{
      editor.focus();const selection=w.getSelection(),range=doc.createRange();range.selectNodeContents(editor);selection.removeAllRanges();selection.addRange(range);
      if(typeof doc.execCommand!=='function'||!doc.execCommand('insertText',false,value))throw Error('网页编辑器暂不支持写入，请切换原生输入；草稿已保留。');
      if(!equivalent(S.Adapter.text(editor),value))throw Error('写入结果与草稿不同，未发送，请检查原生输入框。');
    }
  }
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const normalized=value=>value.replace(/\s+/g,' ').trim();
  function messageText(message){const node=message.node.cloneNode(true);for(const child of node.querySelectorAll('button,img,svg,[data-conversation-role],.sr-only,[aria-hidden="true"],[class*="resource-card"],[data-attachment-id],[data-file-id]'))child.remove();for(const br of node.querySelectorAll('br'))br.replaceWith('\n');for(const block of node.querySelectorAll('p,div,li,pre,blockquote'))block.append('\n');return normalized(node.textContent);}
  function messageFiles(message,files){
    const images=files.filter(file=>file.type.startsWith('image/'));
    if(message.node.querySelectorAll('img').length<images.length)return false;
    const names=files.filter(file=>!file.type.startsWith('image/')).map(file=>file.name);
    const labels=[...message.node.querySelectorAll('button[aria-label]')].map(node=>node.getAttribute('aria-label'));
    const fallback=[...message.node.querySelectorAll('[title],img[alt],[data-filename]')].map(node=>node.getAttribute('title')||node.getAttribute('alt')||node.getAttribute('data-filename'));
    const remaining=[...(labels.some(label=>names.includes(label))?labels:fallback)];
    for(const name of names){const i=remaining.indexOf(name);if(i<0)return false;remaining.splice(i,1);}return true;
  }
  function acknowledged(doc,receipt){
    if(!receipt?.clicked||doc.defaultView.location.href!==receipt.route)return false;
    return S.Adapter.messages(doc).some(message=>message.role==='user'&&!receipt.known.has(message.id)&&messageText(message)===normalized(receipt.value)&&messageFiles(message,receipt.files));
  }
  async function send(doc,value,baseline='',{timeout=15000,signal,expectedRoute,allowEmpty=false,accepted=()=>true,beforeClick=()=>true,files=[],knownMessageIds=[]}={}){
    const route=expectedRoute||doc.defaultView.location.href;
    const valid=()=>!signal?.aborted&&doc.defaultView.location.href===route;
    if(!valid())return {ok:false,error:'对话已切换，已取消发送。'};
    const editor=S.Adapter.editor(doc);
    if(!value.trim()&&!allowEmpty)return {ok:false,error:'请先输入消息或粘贴图片。'};
    if(!editor)return {ok:false,error:'等待 ChatGPT 输入框加载，或使用原生输入。'};
    const current=S.Adapter.text(editor);
    if(!equivalent(current,baseline)&&!equivalent(current,value))return {ok:false,error:'原生输入框已有其他草稿，未覆盖。请切换原生输入检查。'};
    try{if(!equivalent(current,value))await write(editor,value);}catch(e){return {ok:false,error:e.message};}
    const end=Date.now()+timeout;
    while(Date.now()<end){
      await sleep(40);
      if(!valid())return {ok:false,error:'对话已切换，已取消发送；草稿仍保留。'};
      if(!editor.isConnected||S.Adapter.editor(doc)!==editor)return {ok:false,error:'输入框已更新，未发送；草稿仍保留。'};
      if(!equivalent(S.Adapter.text(editor),value))return {ok:false,error:'原生草稿发生变化，已取消发送。'};
      const button=S.Adapter.sendButton(doc,editor);
      if(button&&!button.disabled&&button.getAttribute('aria-disabled')!=='true'){
        if(!beforeClick())return {ok:false,error:'原生附件已变化，未发送；请打开原生输入核对。',uncertain:true,ownedValue:value};
        const receipt={clicked:true,route,value,files,known:new Set([...knownMessageIds,...S.Adapter.messages(doc).map(m=>m.id)])};
        button.click();
        const acceptedEnd=Date.now()+timeout;
        while(Date.now()<acceptedEnd){
          if(!valid())return {ok:false,error:'对话已切换或发送已中止，待核对原对话。',uncertain:true,receipt,ownedValue:value};
          if(acknowledged(doc,receipt))return {ok:true,receipt};
          const confirmedEditor=S.Adapter.editor(doc);
          if(confirmedEditor===editor&&editor.isConnected&&!S.Adapter.text(editor).trim()&&accepted())return {ok:true};
          await sleep(50);
        }
        return {ok:false,error:'已提交，正在等待网页确认；草稿暂存，确认后自动清空。请勿重复发送。',uncertain:true,ownedValue:value,receipt};
      }
    }
    return {ok:false,error:'发送按钮暂不可用（可能正在生成），草稿已保留，也可使用原生输入。',ownedValue:value};
  }
  S.Composer={write,send,equivalent,acknowledged};
})();
