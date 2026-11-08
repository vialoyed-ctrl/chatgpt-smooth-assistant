(() => {
  const input=document.getElementById('enabled'),status=document.getElementById('status');
  let settings={enabled:true,lightInput:true,readMode:true,keep:null};
  chrome.storage.local.get('smoothSettings').then(data=>{settings={...settings,...data.smoothSettings};input.checked=settings.enabled;});
  input.addEventListener('change',async()=>{settings.enabled=input.checked;await chrome.storage.local.set({smoothSettings:settings});status.textContent=settings.enabled?'已启用。':'已暂停正文优化。';});
  chrome.tabs.query({active:true,currentWindow:true}).then(async tabs=>{
    try{const data=await chrome.tabs.sendMessage(tabs[0].id,{type:'smooth-status'});status.textContent=data.settings.enabled?`当前识别 ${data.stats.messages||0} 条消息，${data.stats.chunks||0} 个正文块已优化。`:'当前已暂停。';}
    catch{status.textContent='请打开 ChatGPT 网页；首次安装后刷新对话。';}
  });
})();
