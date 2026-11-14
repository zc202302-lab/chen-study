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


const saveRequirements=document.querySelector('[data-save-requirements]');
if(saveRequirements)saveRequirements.addEventListener('click',async()=>{
 const form=saveRequirements.form, input=form.elements.courseRequirements, status=document.querySelector('[data-save-requirements-status]');
 if(!input.value.trim()||input.value.length>16000){status.textContent='课程要求不能为空且不能超过16000字';return;}
 saveRequirements.disabled=true;status.textContent='正在保存…';
 try{
  const data=new URLSearchParams({csrf:form.elements.csrf.value,operation_id:crypto.randomUUID(),courseRequirements:input.value});
  const response=await fetch('/courses/default-requirements',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data});
  if(!response.ok||response.redirected)throw Error('保存失败');
  status.textContent='已保存为默认值，以后新建课程时使用。';
 }catch{status.textContent='保存失败，请稍后重试。';}
 finally{saveRequirements.disabled=false;}
});

const requirementsEditor=document.querySelector('#course-requirements-editor');
const editRequirements=document.querySelector('[data-edit-requirements]');
if(requirementsEditor&&editRequirements){
 const state=document.querySelector('[data-editor-state]'),counter=document.querySelector('[data-requirements-count]');
 const count=()=>{counter.textContent=`${requirementsEditor.value.length.toLocaleString()} / 16,000 字符`;};
 count();requirementsEditor.addEventListener('input',()=>{count();const status=document.querySelector('[data-save-requirements-status]');if(status)status.textContent='';});
 editRequirements.addEventListener('click',()=>{
  requirementsEditor.readOnly=false;requirementsEditor.closest('.requirements-editor').classList.add('is-editing');
  state.textContent='编辑中';editRequirements.setAttribute('aria-pressed','true');
  requirementsEditor.focus({preventScroll:true});
  if(matchMedia('(max-width: 800px)').matches)requirementsEditor.closest('.requirements-editor').scrollIntoView({behavior:'smooth',block:'start'});
 });
}
