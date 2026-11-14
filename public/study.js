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

// Preserve fenced examples and paragraph boundaries while removing redundant spacing.
function compactRequirements(text){
 const lines=text.replace(/\r\n?/g,'\n').split('\n'),out=[];let fence=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],mark=line.match(/^\s*(`{3,}|~{3,})/);
  if(mark){if(!fence)fence=mark[1];else if(mark[1][0]===fence[0]&&mark[1].length>=fence.length)fence=null;out.push(line);continue;}
  if(!fence&&!line.trim()){
   const prev=out[out.length-1]||'',next=lines[i+1]||'';
   if(!prev.trim()||/^\s{0,3}#{1,6}\s/.test(prev)||/^\s{0,3}#{1,6}\s/.test(next))continue;
  }
  out.push(line);
 }
 return out.join('\n').trim();
}
const requirementsEditor=document.querySelector('#course-requirements-editor');
const editRequirements=document.querySelector('[data-edit-requirements]');
if(requirementsEditor&&editRequirements){
 const form=requirementsEditor.form,state=document.querySelector('[data-editor-state]'),counter=document.querySelector('[data-requirements-count]'),save=document.querySelector('[data-save-editor]'),saveStatus=document.querySelector('[data-editor-save-status]');
 const isNew=new URL(form.action).pathname==='/courses/new',draftKey='chen-study:new-course-requirements:v1';
 const count=()=>{counter.textContent=`${requirementsEditor.value.length.toLocaleString()} / 16,000 字符`;};
 requirementsEditor.value=compactRequirements(requirementsEditor.value);
 let savedValue=requirementsEditor.value;
 if(isNew){try{const draft=localStorage.getItem(draftKey);if(draft!==null){requirementsEditor.value=draft;savedValue=draft;saveStatus.textContent='已恢复本浏览器保存的课程要求草稿';}}catch{}}
 count();
 requirementsEditor.addEventListener('input',()=>{count();state.textContent='未保存';saveStatus.textContent='有修改尚未保存';const status=document.querySelector('[data-save-requirements-status]');if(status)status.textContent='';});
 editRequirements.addEventListener('click',()=>{
  requirementsEditor.readOnly=false;requirementsEditor.closest('.requirements-editor').classList.add('is-editing');save.disabled=false;
  state.textContent=requirementsEditor.value===savedValue?'编辑中':'未保存';editRequirements.setAttribute('aria-pressed','true');
  requirementsEditor.focus({preventScroll:true});
  if(matchMedia('(max-width: 800px)').matches)requirementsEditor.closest('.requirements-editor').scrollIntoView({behavior:'smooth',block:'start'});
 });
 save.addEventListener('click',async()=>{
  const value=compactRequirements(requirementsEditor.value);
  if(!value||value.length>16000){saveStatus.textContent='课程要求不能为空且不能超过16000字符';return;}
  save.disabled=true;saveStatus.textContent='正在保存…';
  try{
   if(isNew){localStorage.setItem(draftKey,value);saveStatus.textContent='草稿已保存到本浏览器；保存课程需求后正式写入课程';}
   else{
    const endpoint=new URL(form.action);endpoint.pathname=endpoint.pathname.replace(/\/edit$/,'/requirements');
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:form.elements.csrf.value,operation_id:crypto.randomUUID(),courseRequirements:value})});
    if(!response.ok)throw Error('保存失败');
    saveStatus.textContent='课程要求已保存';
   }
   requirementsEditor.value=value;savedValue=value;count();state.textContent='已保存';
  }catch{saveStatus.textContent='保存失败，内容仍保留在编辑区，请重试';state.textContent='未保存';}
  finally{save.disabled=false;}
 });
 addEventListener('beforeunload',event=>{if(requirementsEditor.value!==savedValue){event.preventDefault();event.returnValue='';}});
 form.addEventListener('submit',()=>{if(!form.checkValidity())return;savedValue=requirementsEditor.value;if(isNew){try{localStorage.removeItem(draftKey);}catch{}}});
}
