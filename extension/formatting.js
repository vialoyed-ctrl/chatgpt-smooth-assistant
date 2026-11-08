(() => {
  'use strict';
  const S=globalThis.GPTSmooth ||= {};
  const records=new WeakMap();
  const typography=['font-family','font-size','font-weight','font-style','line-height','white-space','text-align','text-decoration-line','text-decoration-style','color'];
  const spacing=['margin-top','margin-bottom','padding-top','padding-bottom','padding-left','padding-right','gap','row-gap','column-gap'];
  const layout=['display','flex-direction','flex-wrap','align-items','justify-content','border-top-width','border-right-width','border-bottom-width','border-left-width','border-style','border-color','border-radius','background-color','background-image','list-style-type','object-fit','object-position','aspect-ratio'];
  function safeValue(property,value){
    if(!value||/url\(|expression\(|[{};<>]/i.test(value))return false;
    if(property.startsWith('margin')||property.startsWith('padding')||property.includes('gap'))return /^(normal|\d+(?:\.\d+)?px)( (\d+(?:\.\d+)?px))*$/.test(value)&&[...value.matchAll(/[\d.]+/g)].every(m=>+m[0]<=64);
    if(property==='display')return ['block','inline','inline-block','flex','inline-flex','grid','table','table-row','table-cell','list-item','contents'].includes(value);
    if(property==='font-size')return /^\d+(\.\d+)?px$/.test(value)&&parseFloat(value)>=9&&parseFloat(value)<=36;
    return true;
  }
  function elements(root){const list=[root],walker=root.ownerDocument.createTreeWalker(root,1,{acceptNode:node=>node.matches('.katex,math')?2:1});for(let node=walker.nextNode();node;node=walker.nextNode())list.push(node);return list;}
  function* prepareSteps(source,clone,{computed:trueStyles=true}={}){
    const sources=elements(source),copies=elements(clone);
    for(let i=0;i<sources.length;i++){
      const original=sources[i],copy=copies[i];if(original.closest('.katex,math'))continue;
      const component=original.getAttribute('data-d-component'),classes=[];
      const codeSurface=original.hasAttribute('data-code-block'),codeSource=original.hasAttribute('data-code-block-source');
      const codeHeader=original.parentElement?.hasAttribute('data-code-block')&&original.parentElement.firstElementChild===original&&!codeSource;
      if(codeSurface)classes.push('native-code-block');if(codeSource)classes.push('native-code-source');if(codeHeader)classes.push('native-code-header');
      const strong=original.hasAttribute('data-d-default-strong')||/^(bold|semibold)$/.test(original.getAttribute('data-d-weight')||'')||original.matches('strong,b,.font-bold,.font-semibold');
      if(strong)classes.push('emphasis');
      if(original.getAttribute('data-d-font-style')==='italic'||original.matches('em,i'))classes.push('italic');
      if(original.getAttribute('data-markdown-copy')==='inline-code'||original.matches('code')&&!original.closest('pre')&&!/CodeContent-|\bblock\b/.test(original.className))classes.push('inline-code');
      if(original.hasAttribute('data-file-reference')||original.hasAttribute('data-inline-mention-interactive'))classes.push('file-ref');
      if(['box','grid','row','image','table','badge','grid-item'].includes(component))classes.push('native-'+component);
      if(original.hasAttribute('data-d-list-item-content'))classes.push('list-content');
      if(original.hasAttribute('data-dil-message-id'))classes.push('native-content');
      const styles={};
      const relevant=component||codeSurface||codeSource||codeHeader||original.hasAttribute('data-dil-message-id')||original.matches('p,h1,h2,h3,h4,h5,h6,ul,ol,li,blockquote,pre,code,table,td,th,[data-markdown-copy="inline-code"],strong,em,i,b,[class*="syntax-"]');
      if(relevant&&trueStyles){
        const computed=source.ownerDocument.defaultView.getComputedStyle(original);
        for(const property of typography)if(safeValue(property,computed.getPropertyValue(property)))styles[property]=computed.getPropertyValue(property);
        if(component!=='math'&&!original.matches('span,code,strong,em,i,b'))for(const property of spacing)if(safeValue(property,computed.getPropertyValue(property)))styles[property]=computed.getPropertyValue(property);
        if(component&&!['text','title','math','code'].includes(component)||codeSurface||codeSource||codeHeader||original.hasAttribute('data-dil-message-id'))for(const property of layout)if(safeValue(property,computed.getPropertyValue(property)))styles[property]=computed.getPropertyValue(property);
        if(codeHeader&&/^\d+(\.\d+)?px$/.test(computed.minHeight)&&parseFloat(computed.minHeight)<=64)styles['min-height']=computed.minHeight;
        if(component==='grid'){
          const columns=original.style.getPropertyValue('grid-template-columns');
          if(columns&&safeValue('grid-template-columns',columns))styles['grid-template-columns']=columns;
          else {const count=computed.gridTemplateColumns?.split(/\s+/).filter(s=>/px$/.test(s)).length;if(count>1&&count<=4)styles['grid-template-columns']=`repeat(${count},minmax(0,1fr))`;}
        }
        if(component==='image'||original.matches('img'))styles['max-width']='100%';
        if(component==='box'&&original.querySelector('[data-d-component="image"]')){const width=original.style.getPropertyValue('max-width');if(/^\d+(\.\d+)?px$/.test(width)&&parseFloat(width)<=320)styles['max-width']=width;}
      }
      // Attributes are semantic fallbacks when native styles are not yet loaded.
      if(strong&&!/^[6-9]00$/.test(styles['font-weight']||''))styles['font-weight']=original.getAttribute('data-d-weight')==='bold'?'700':'600';
      if(classes.includes('italic'))styles['font-style']='italic';
      if(classes.includes('inline-code'))styles['white-space']='break-spaces';
      if(classes.length||Object.keys(styles).length)records.set(copy,{classes,styles});
      yield;
    }
    for(const divider of clone.querySelectorAll('[data-d-component="divider"]')){divider.replaceWith(clone.ownerDocument.createElement('hr'));yield;}
    for(const code of clone.querySelectorAll('code'))if(!code.closest('pre')&&/CodeContent-|\bblock\b/.test(code.className)){
      const pre=clone.ownerDocument.createElement('pre');code.replaceWith(pre);pre.append(code);records.set(code,{classes:[],styles:{'white-space':'pre','display':'block'}});
    }
    for(const svg of clone.querySelectorAll('svg')){
      for(const node of [...svg.querySelectorAll('*')])if(!['g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan'].includes(node.localName))node.remove();
      for(const node of [svg,...svg.querySelectorAll('*')])for(const attribute of [...node.attributes])if(!/^(viewBox|width|height|x|y|x1|x2|y1|y2|d|cx|cy|r|rx|ry|points|transform|fill|fill-rule|stroke|stroke-width|stroke-linecap|stroke-linejoin|clip-rule|aria-hidden|role|xmlns)$/.test(attribute.name)||/url\(|javascript:/i.test(attribute.value))node.removeAttribute(attribute.name);
      records.set(svg,{classes:['native-icon'],styles:{width:'1em',height:'1em','vertical-align':'-.15em'}});yield;
    }
  }
  async function runAsync(steps,{batch=120,budget=8,cancelled=()=>false,window=globalThis}={}){let start=Date.now(),count=0;while(true){if(cancelled())return {cancelled:true};const next=steps.next();if(next.done)return {cancelled:false,value:next.value};if(++count>=batch||Date.now()-start>=budget){await new Promise(resolve=>window.setTimeout(resolve,0));start=Date.now();count=0;}}}
  function prepare(source,clone,options){for(const _ of prepareSteps(source,clone,options)){};}
  async function prepareAsync(source,clone,options={}){const result=await runAsync(prepareSteps(source,clone,options),{...options,window:source.ownerDocument.defaultView});return !result.cancelled;}
  function restore(node){const record=records.get(node);if(record){node.classList.add(...record.classes);for(const [property,value]of Object.entries(record.styles))node.style.setProperty(property,value);}}
  S.Formatting={prepare,prepareAsync,runAsync,restore};
})();
