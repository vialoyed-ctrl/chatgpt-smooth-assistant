(() => {
  'use strict';
  const S=globalThis.GPTSmooth;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function composer(doc){return S.Adapter.editor(doc)?.closest('[data-composer-body],form')||S.Adapter.main(doc);}
  function cards(doc){
    const region=composer(doc)?.querySelector('[data-composer-attachments]');
    if(!region)return [];
    const explicit=[...region.querySelectorAll('[data-attachment-id],[data-testid="remove-file-button"],button[aria-label*="移除"],button[aria-label*="删除"],button[aria-label*="Remove"]')];
    if(explicit.length)return explicit.filter(n=>!explicit.some(parent=>parent!==n&&parent.contains(n)));
    return [...region.children].filter(n=>!n.hidden&&n.getAttribute('aria-hidden')!=='true'&&(n.textContent.trim()||n.querySelector('img,button')));
  }
  const count=doc=>cards(doc).length;
  function identity(node){return node.getAttribute('data-attachment-id')||node.getAttribute('data-file-id')||node.querySelector('[data-attachment-id]')?.getAttribute('data-attachment-id')||null;}
  function owns(doc,ticket){const now=cards(doc);return ticket?.ok&&now.length===ticket.native?.length&&now.every((node,i)=>ticket.native[i].id?identity(node)===ticket.native[i].id:node===ticket.native[i].node);}
  function accepts(input,files){const types=input.accept.toLowerCase().split(',').map(v=>v.trim()).filter(Boolean);return (files.length===1||input.multiple)&&files.every(file=>!types.length||types.some(type=>type==='*/*'||type.startsWith('.')?(!types.length||type==='*/*'||file.name.toLowerCase().endsWith(type)):type.endsWith('/*')?file.type.toLowerCase().startsWith(type.slice(0,-1)):file.type.toLowerCase()===type));}
  async function prepare(doc,files,{ticket,signal,expectedRoute,timeout=15000}={}){
    const route=expectedRoute||doc.defaultView.location.href;
    const valid=()=>!signal?.aborted&&doc.defaultView.location.href===route;
    const failure=(error,uncertain=false)=>({ok:false,error,uncertain,files,route});
    if(!valid())return failure('对话已切换，附件草稿仍保留。');
    if(ticket){
      if(ticket.ok&&ticket.route===route&&ticket.files?.length===files.length&&ticket.files.every((f,i)=>f===files[i])&&owns(doc,ticket))return ticket;
      return {...ticket,ok:false,error:'附件已交给原生输入，但状态发生变化。请打开原生输入核对，避免重复上传。',uncertain:true};
    }
    if(count(doc))return failure('原生输入已有附件，请先在原生输入中核对；本地附件草稿已保留。');
    const root=S.Adapter.main(doc),inputs=[...(root||doc).querySelectorAll('input[type="file"]')].filter(n=>!n.disabled&&!n.hasAttribute('capture'));
    const suitable=inputs.filter(input=>accepts(input,files));
    const input=suitable.find(n=>!n.accept||/附加文件|上传文件|Attach files|Upload files/i.test(n.getAttribute('aria-label')||''))||suitable.find(n=>/添加照片|Add photos/i.test(n.getAttribute('aria-label')||''))||suitable[0];
    if(!input)return failure('未找到网页的附件上传入口，请使用原生输入 / 附件。');
    const w=doc.defaultView;
    if(!w.DataTransfer)return failure('当前浏览器不支持附件转交，请使用原生附件。');
    try{
      const transfer=new w.DataTransfer();for(const file of files)transfer.items.add(file);
      input.files=transfer.files;
      input.dispatchEvent(new w.Event('change',{bubbles:true,composed:true}));
    }catch{return failure('附件转交未完成，请打开原生输入检查；本地附件草稿仍保留。',true);}
    const end=Date.now()+timeout;
    while(Date.now()<end){
      if(!valid())return failure('对话已切换；附件可能已上传到原对话，请核对后再发送。',true);
      if(count(doc)===files.length)return {ok:true,files,route,native:cards(doc).map(node=>({id:identity(node),node}))};
      await sleep(50);
    }
    return failure('未能确认全部附件已进入原生输入。请打开原生输入核对；未自动重试，附件草稿仍保留。',true);
  }
  S.Attachments={prepare,count,cards,owns};
})();
