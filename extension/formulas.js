(() => {
  'use strict';
  const S=globalThis.GPTSmooth ||= {};
  const generated=new WeakSet();
  function render(source,display,doc=document){
    if(!globalThis.katex)return null;
    let tex=source.trim().replace(/^\$\$([\s\S]*)\$\$$/,'$1').replace(/^\\\[([\s\S]*)\\\]$/,'$1').replace(/^\\\(([\s\S]*)\\\)$/,'$1');
    const options={displayMode:display,output:'htmlAndMathml',throwOnError:true,trust:false,strict:'ignore',maxExpand:1000,maxSize:20};
    let markup;
    try{markup=katex.renderToString(tex,options);}catch{
      // The source chat contains a boxed matrix with precisely one omitted final brace.
      // Repair only unmatched outer boxed groups; do not invent general LaTeX edits.
      let depth=0,min=0;
      for(let i=0;i<tex.length;i++){
        if(tex[i]==='\\'&&/[{}%\\]/.test(tex[i+1]||'')){i++;continue;}
        if(tex[i]==='{')depth++;else if(tex[i]==='}')depth--;min=Math.min(min,depth);
      }
      if(!/^\\boxed\s*\{/.test(tex)||min<0||depth!==1)return null;
      const tag=tex.match(/\\tag\*?\{[^{}]*\}\s*$/);
      tex=tag?tex.slice(0,tag.index).trimEnd()+'}\n'+tag[0]:tex+'}';
      try{markup=katex.renderToString(tex,options);}catch{return null;}
    }
    const template=doc.createElement('template');template.innerHTML=markup;
    const math=template.content.querySelector('math');if(!math)return null;
    math.setAttribute('display',display?'block':'inline');
    const wrapper=template.content.firstElementChild;if(display)wrapper.classList.add('formula');generated.add(wrapper);return wrapper;
  }
  function normalize(root,doc=root.ownerDocument){
    for(const katex of [...root.querySelectorAll('.katex')]){
      if(!root.contains(katex))continue;
      const math=katex.querySelector('math');if(!math)continue;
      const native=math.cloneNode(true);native.removeAttribute('aria-hidden');
      const component=katex.closest('[data-d-component="math"]');
      const display=!!katex.closest('.katex-display')||!!component?.hasAttribute('data-d-block')||component?.tagName==='DIV'||native.getAttribute('display')==='block';
      const tex=math.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
      const rendered=tex?render(tex,display,doc):null;
      const target=katex.closest('.katex-display')||katex;
      native.setAttribute('display',display?'block':'inline');
      let fallback=native;if(display){fallback=doc.createElement('span');fallback.className='formula';fallback.append(native);}
      target.replaceWith(rendered||fallback);
    }
    for(const error of root.querySelectorAll('.katex-error,code.language-math,code.language-latex')){
      const rendered=render(error.textContent,!!error.closest('[data-d-block],div[data-d-component="math"],.katex-display,pre'),doc);
      if(rendered){const pre=error.closest('pre');if(pre&&pre.textContent===error.textContent)pre.replaceWith(rendered);else error.replaceWith(rendered);}
    }
    for(const display of root.querySelectorAll('.katex-display,div[data-d-component="math"],[data-d-component="math"][data-d-block]'))display.classList.add('formula');
  }
  function isGenerated(node){for(let n=node;n;n=n.parentElement)if(generated.has(n))return true;return false;}
  function installStyles(root,doc=document){
    const url=name=>globalThis.chrome?.runtime?.getURL?chrome.runtime.getURL(name):'/extension/'+name;
    const resolve=css=>css.replace(/url\((fonts\/[^)]+)\)/g,(_,name)=>'url("'+url(name)+'")');
    if(!doc.querySelector('style[data-smooth-math-fonts]')){const fonts=doc.createElement('style');fonts.textContent=resolve(S.MathStyles.fonts);fonts.setAttribute('data-smooth-math-fonts','');doc.head.append(fonts);}
    const style=doc.createElement('style');style.textContent=resolve(S.MathStyles.css);root.prepend(style);
  }
  S.Formulas={render,normalize,isGenerated,installStyles};
})();
