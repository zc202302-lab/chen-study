const quiz=document.querySelector('[data-quiz]');
if(quiz){const groups=[...quiz.querySelectorAll('fieldset')];const button=quiz.querySelector('button[type=submit]');const progress=quiz.querySelector('[data-progress]');function update(){const answered=groups.filter(g=>{const input=g.querySelector('textarea');return input?input.value.trim():g.querySelector('input:checked');}).length;progress.textContent=`已完成 ${answered} / ${groups.length} 题`;button.disabled=answered!==groups.length;}quiz.addEventListener('input',update);quiz.addEventListener('change',update);update();}

const directory=document.querySelector('.directory-disclosure');
if(directory){
 const narrow=matchMedia('(max-width: 900px)');
 const adapt=()=>{directory.open=!narrow.matches;};adapt();narrow.addEventListener('change',adapt);
 directory.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{if(narrow.matches)directory.open=false;}));
 const links=[...directory.querySelectorAll('.chapter-link')];
 const anchors=links.map(link=>document.getElementById(link.hash.slice(1))).filter(Boolean);
 const updateChapter=()=>{let current=anchors[0];for(const section of anchors){if(section.getBoundingClientRect().top<=150)current=section;else break;}links.forEach(link=>{const active=link.hash===`#${current?.id}`;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});};
 let queued=false;addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(()=>{updateChapter();queued=false;});}},{passive:true});updateChapter();
}

const copyHandoff=document.querySelector('[data-copy-handoff]');
if(copyHandoff)copyHandoff.addEventListener('click',async()=>{const text=document.querySelector('[data-handoff]'),result=document.querySelector('.copy-result');try{await navigator.clipboard.writeText(text.value);result.textContent='已复制';}catch{text.focus();text.select();result.textContent='请复制已选中的指令';}});
