import {scheduleOf,validateSchedule,scheduleText,scheduleFields} from './schedule.mjs';
import {randomUUID} from 'node:crypto';
import {esc,time,badge,area,field} from './ui.mjs';
const defaultCourseRequirements="本课程面向我尚不熟悉的领域。请围绕我的学习目标，设计一套通俗、系统、循序渐进的课程，兼顾快速入门与知识体系的完整性。\n\n课程的首要任务是让我真正理解知识，逐步建立清晰的认识。课程应以知识讲授为主体，案例、图表和练习用于辅助理解、整合知识和检验学习效果。\n\n## 一、依据目标和基础设计课程\n\n### 1. 以学习目标为导向\n\n学习目标与课程要求都是课程设计的重要依据，应结合理解和执行。学习目标决定知识范围、内容取舍、讲解深度和能力培养方向；课程要求指导教学顺序、讲解方式和内容呈现。\n\n通常应优先确保学习目标得到落实，不得机械套用通用课程要求而偏离目标。\n\n### 2. 从我的基础出发\n\n最终目标决定学习方向，我的当前基础决定教学起点和学习顺序。即使目标指向专业水平，也要从理解该领域所必需的基础知识开始，逐步深入，不要直接从专业人员的工作任务、项目管理或高级判断讲起。\n\n不默认我已经掌握该领域的专业术语、基本原理或常见工作方式。\n\n### 3. 检查目标与学习安排是否匹配\n\n设计课程前，结合学习目标、我的基础、课程期数和每期时长，判断目标是否清晰、学习安排是否合理。\n\n如果目标明显含糊、相互矛盾，或无法在设定课时内实现，应先说明问题和依据，提出调整建议。必要时区分长期目标与本轮课程目标；不擅自改变我的长期目标，也不通过堆砌知识假装目标已经实现。\n\n## 二、按照知识逻辑组织教学\n\n### 4. 先建立基本画面，再逐步深入\n\n开始时，先用通俗语言帮助我理解：这个领域是什么、解决什么问题、大致包含哪些主要部分，以及各部分如何联系。\n\n初始全貌应当简洁、直观，让初学者能抓住主线。不要为了展示完整性，一开始就罗列大量陌生概念。随着课程推进，再逐步补充细节，完善整体认识。\n\n后续各期应让我知道当前学习的知识处于整体框架的什么位置，但不必每期重复介绍整个领域。\n\n### 5. 开篇让人迅速进入主题\n\n课程及每期开篇应从我当前能够理解的问题出发，先说明本门课或本期究竟要讲什么、为什么需要了解，以及学完后能够理解什么。\n\n对于陌生领域，先建立具体、直观的基本认识，再逐步引入专业概念和细节。不要在尚未解释基础概念时，直接进入客户需求、复杂项目场景、专业判断或大量行业术语。\n\n开篇引入应简短、贴合主题，让我尽快知道自己正在学习什么。\n\n### 6. 以知识讲授为课程主体\n\n按照知识本身的逻辑和依赖关系组织课程，系统讲清概念、原理、组成、运行过程以及各知识点之间的关系。\n\n课程主要篇幅应当用于讲解知识本身。不要用业务故事、客户对话、项目流程、工作建议或注意事项代替系统讲解，也不要让某个案例的情节占据课程主线。\n\n如果学习目标包含实际工作能力，应先建立理解相关工作的知识基础，再逐步讲解如何运用这些知识。\n\n### 7. 框架完整，深度分层\n\n从整门课程的角度，覆盖实现本轮学习目标所需的主要知识模块和关键联系，避免遗漏重要前置知识，造成理解断层。\n\n根据目标、基础和课时，区分“核心必学、必要了解、进阶选学”。优先学透核心知识；其他内容先建立准确的基本认识，再按需要深入。不要求每期面面俱到，也不追求所有知识点同样详细。\n\n### 8. 按知识依赖关系循序渐进\n\n先讲理解后续内容所必需的知识，再讲建立在这些知识之上的内容。必要的前置知识应解释到足以理解后文，不跳步，也不无限扩大学习范围。\n\n尽可能从已经理解的知识引出新知识。引入新概念时，让我知道它为什么出现、解决什么问题，再解释它的含义和作用。避免连续抛出多个尚未解释的陌生名词。\n\n### 9. 讲清知识本身，而不是只给结论\n\n对于核心知识，根据内容需要，讲清：\n\n- 它是什么，解决什么问题；\n- 为什么需要它，在整体中处于什么位置；\n- 它由哪些部分组成，或经历怎样的过程；\n- 它是如何起作用的，各部分之间怎样配合；\n- 它与容易混淆的概念有什么区别；\n- 它适用于什么情况，有哪些条件和局限。\n\n讲解应有连贯的解释，让我理解结论是怎么来的。不要只罗列名词、定义、特点和结论，也不要机械地对每个知识点套用相同模板。\n\n### 10. 每期集中讲透有限的核心问题\n\n每期围绕一个主问题，或少数几个相互关联的核心问题展开。让我读到开篇就知道这一期在讲什么，学完后能够用自己的话解释核心知识及其联系。\n\n课程内容应与设定时长和我的基础相符。优先把少量重要内容讲透，必要时将复杂主题拆分到多期。不要以提纲代替完整讲解，不用无关内容凑篇幅，也不要在一期内堆入过多概念。\n\n## 三、使用合适的讲解和呈现方式\n\n### 11. 案例辅助理解，不代替知识讲解\n\n当概念、原理或过程较抽象时，可以使用简单例子、类比、示意图或实际场景辅助说明。例子应直接服务于当前知识点，并说明例子与知识之间的对应关系。\n\n解释清楚后，应回到知识主线。控制业务背景、人物对话和情节描述的篇幅，不强行用同一个案例贯穿课程，也不把基础课程写成案例解读。\n\n在掌握相应知识之后，可根据学习目标安排综合案例，用来联系知识、检验理解或练习应用。教学假设应明确标注，不将虚构案例说成真实项目。\n\n### 12. 语言通俗、表达准确\n\n专业术语首次出现时，用普通语言解释它指什么；英文缩写首次出现时说明中文含义。不要用另一个同样难懂的概念解释新概念。\n\n优先从具体事物、简单过程或直观问题入手，再逐步引出专业名称和抽象定义。使用类比时，说明对应关系和类比的边界，避免过度简化造成误解。\n\n### 13. 图文配合，避免大段文字堆砌\n\n根据内容需要，使用结构图、流程图、示意图和对比表，帮助我看清组成、层级、关系和过程。\n\n对于较复杂的结构或过程，可以先展示简洁的整体图，再结合正文分步骤讲解，让我知道图中每个部分是什么、为什么存在、与其他部分怎样联系。不要只放一张图而缺少解释，也不要用表格中的简短词句代替必要的原理讲解。\n\n正文应围绕明确的问题分段展开，突出关键概念、步骤和结论，避免连续使用大段文字叙述。图表应服务于理解，不为装饰而添加。\n\n上传网站时，尽可能保留图表内容、结构和图注；如果网站现有格式无法准确表达，应如实说明。\n\n## 四、复习、测验与内容可靠性\n\n### 14. 持续整合与复习\n\n每期包含学习目标、系统讲解和重点总结；根据知识内容适当安排例子与练习，不要求每期都设置完整案例。\n\n阶段结束时回到领域地图，串联已经学习的知识，说明各部分之间的关系、已经掌握的范围以及后续仍需学习的内容，避免知识碎片化。\n\n### 15. 测验检验理解与应用\n\n测验应紧扣当期实际讲授的内容和学习目标，优先检验是否理解核心概念、原理及其关系，再根据学习进度适当考查情境判断和实际应用。\n\n题目应表述清楚，避免歧义，不考查尚未讲解的知识。问答题应有明确任务和评分依据。批改时指出理解不足、错误原因和改进方法，并在后续教学中适当补充或复习。\n\n### 16. 内容可靠，边界清楚\n\n区分事实、主流观点、经验建议与推测。对容易变化的信息，应核实可靠来源，必要时注明日期；存在争议或不确定性时如实说明。\n\n课程结束时，根据本轮学习目标，提供完整知识框架、已形成的核心能力、尚未覆盖或需要实践的部分，以及进一步学习路径。";
const validId=/^[0-9a-f-]{36}$/i;
const names={pending:'待生成',running:'生成中',ready:'首期已发布'};
const ruleText='每期5道单选题（每题10分）＋1道问答题（50分），总分100分，80分通过。每天北京时间9点读取状态；通过后最早次日9点推送下一期，未通过不推送也不提醒。学习、答题与点评均在网站完成。';
const defaultAssessment={singleCount:5,singlePoints:10,textCount:1,textPoints:50};
function liveRules(config,quiz){
 const assessment=config.assessment||defaultAssessment;
 const exam=quiz?.length?Object.entries(quiz.reduce((a,x)=>{const k=`${x.type==='single'?'单选题':'问答题'}（每题${x.points}分）`;a[k]=(a[k]||0)+1;return a;},{})).map(([k,n])=>`${n}道${k}`).join('＋'):`${assessment.singleCount}道单选题（每题${assessment.singlePoints}分）＋${assessment.textCount}道问答题（每题${assessment.textPoints}分）`;
 return `${exam}。${config.mode==='completion'?'完成全部作答并获得点评即可完成，不设及格线':`总分${config.passScore}分通过${Object.entries(config.sectionMinimums||{}).map(([name,n])=>`，${name}至少${n}分`).join('')}`}。${scheduleText(config)}`;
}

const readRequirements=f=>{
 const title=(f.get('title')||'').trim(),goals=(f.get('goals')||'').trim(),foundation=(f.get('foundation')||'').trim(),notes=(f.get('notes')||'').trim();
 const schedule=validateSchedule({gradingTime:f.get('gradingTime')||undefined,pushTime:f.get('pushTime')||'09:00',reviewTime:f.get('reviewTime')||'10:00',mode:f.get('pushMode')||'progress'});
 const totalLessons=Number(f.get('totalLessons')),minutes=Number(f.get('minutes'));
 if(!title||title.length>200||!goals||goals.length>12000||foundation.length>4000||notes.length>16000)throw Error('请填写课程名称和学习目标，并控制信息长度');
 if(!Number.isInteger(totalLessons)||totalLessons<1||totalLessons>1000||!Number.isInteger(minutes)||minutes<5||minutes>300)throw Error('课程期数须为1至1000，每期时间须为5至300分钟');
 const courseRequirements=(f.get('courseRequirements')||notes).trim(),learningRules=(f.get('learningRules')||ruleText).trim();
 if(courseRequirements.length>16000||false)throw Error('课程要求过长，或学习规则暂不支持该修改');
 return {title,goals,foundation,notes,totalLessons,minutes,courseRequirements,learningRules,schedule};
};
const taskPrompt='请打开 https://study.ziboxiaozhushou.cn/work-queue，读取并执行待创建课程；按网站需求生成完整目录和第1期，保存并核验。';
export async function courseRequests({req,res,path,q,render,redirect,formStart,transact,event,f}){
 const match=path.match(/^\/course-requests\/([\da-f-]+)(?:\/(edit|start|finish|automation|schedule|requirements))?$/);
 if(req.method==='POST'&&path==='/courses/default-requirements'){
 const value=(f.get('courseRequirements')||'').trim();
 if(!value||value.length>16000)throw Error('课程要求不能为空且不能超过16000字');
 await transact(f,async client=>{
 await client.query("INSERT INTO study_settings(key,value) VALUES('course_requirements',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[value]);
 await event(client,f,'course_requirements_default_updated',null);
 });
 return render('保存成功','<p>课程要求默认值已保存，仅影响以后创建的课程。</p>');
 }
 if(req.method==='POST'&&(path==='/courses/new'||match)){
 if(path==='/courses/new'){
 const requirements=readRequirements(f),courseId=randomUUID(),requestId=randomUUID();
 await transact(f,async client=>{
 const config={mode:'score',passScore:80,totalLessons:requirements.totalLessons,releaseHour:Number(requirements.schedule.pushTime.slice(0,2)),schedule:requirements.schedule,sectionMinimums:{}};
 await client.query('INSERT INTO courses(id,title,category,description,goals,config) VALUES($1,$2,$3,$4,$5,$6)',[courseId,requirements.title,'自建课程',requirements.goals,requirements.goals,config]);
 await client.query('INSERT INTO course_requests(id,course_id,requirements) VALUES($1,$2,$3)',[requestId,courseId,requirements]);
 await event(client,f,'course_requested',courseId,{requestId});
 });const [saved]=await q('SELECT details FROM study_events WHERE operation_id=$1',[f.get('operation_id')]);return redirect(res,`/course-requests/${saved.details.requestId}`);
 }
 if(!validId.test(match[1]))throw Error('需求编号无效');
 await transact(f,async client=>{
 const {rows:[r]}=await client.query('SELECT r.*,c.deleted_at FROM course_requests r JOIN courses c ON c.id=r.course_id WHERE r.id=$1 FOR UPDATE OF r,c',[match[1]]);
 if(!r||r.deleted_at)throw Error('课程需求不存在或课程已删除');
 const action=match[2];
 if(action==='requirements'){
 if(r.status!=='pending')throw Error('课程已开始生成，请在课程配置中维护内容');
 const value=(f.get('courseRequirements')||'').trim();
 if(!value||value.length>16000)throw Error('课程要求不能为空且不能超过16000字');
 await client.query("UPDATE course_requests SET requirements=jsonb_set(requirements,'{courseRequirements}',$1::jsonb),updated_at=now() WHERE id=$2",[JSON.stringify(value),r.id]);
 }else if(action==='schedule'){
 const schedule=validateSchedule({gradingTime:f.get('gradingTime')||undefined,pushTime:f.get('pushTime'),reviewTime:f.get('reviewTime'),mode:f.get('pushMode')});
 await client.query("UPDATE courses SET config=jsonb_set(jsonb_set(config,'{schedule}',$1::jsonb),'{releaseHour}',$2::jsonb),updated_at=now() WHERE id=$3",[JSON.stringify(schedule),String(Number(schedule.pushTime.slice(0,2))),r.course_id]);
 await client.query("UPDATE course_requests SET requirements=jsonb_set(requirements,'{schedule}',$1::jsonb),updated_at=now() WHERE id=$2",[JSON.stringify(schedule),r.id]);
 }else if(action==='automation'){
 const taskId=(f.get('taskId')||'').trim(),evidence=(f.get('evidence')||'').trim(),verified=f.get('verified')==='yes';
 if(!taskId||taskId.length>200||evidence.length>4000||(verified&&!evidence))throw Error('请填写任务编号；记录无人值守验证时须填写运行证据');
 await client.query('UPDATE course_requests SET automation=$1,updated_at=now() WHERE id=$2',[{taskId,evidence,verified,recordedAt:new Date().toISOString(),source:'Work或用户记录，未由本站独立核验'},r.id]);
 }else if(action==='edit'){
 if(r.status!=='pending')throw Error('课程已开始生成，请在课程配置中维护内容');
 const requirements=readRequirements(f);
 await client.query('UPDATE course_requests SET requirements=$1,updated_at=now() WHERE id=$2',[requirements,r.id]);
 await client.query('UPDATE courses SET title=$1,description=$2,goals=$2,config=jsonb_set(config,$3,$4::jsonb),updated_at=now() WHERE id=$5',[requirements.title,requirements.goals,'{totalLessons}',String(requirements.totalLessons),r.course_id]);
 await client.query("UPDATE courses SET config=jsonb_set(jsonb_set(config,'{schedule}',$1::jsonb),'{releaseHour}',$2::jsonb) WHERE id=$3",[JSON.stringify(requirements.schedule),String(Number(requirements.schedule.pushTime.slice(0,2))),r.course_id]);
 }else if(action==='start'){
 if(r.status==='ready')return;
 await client.query("UPDATE course_requests SET status='running',updated_at=now() WHERE id=$1",[r.id]);
 }else if(action==='finish'){
 const {rows:[c]}=await client.query('SELECT config FROM courses WHERE id=$1',[r.course_id]);
 const {rows:[first]}=await client.query('SELECT * FROM lessons WHERE course_id=$1 AND number=1 AND published_at IS NOT NULL',[r.course_id]);
 if(!first||!first.content.trim()||c.config.outline?.length!==c.config.totalLessons)throw Error('请先保存完整目录并发布第1期正文与测验，再完成核验');

 await client.query("UPDATE course_requests SET status='ready',updated_at=now() WHERE id=$1",[r.id]);
 }else throw Error('不支持的课程需求操作');
 await event(client,f,`course_request_${action}`,r.course_id,{requestId:r.id});
 });return redirect(res,`/course-requests/${match[1]}`);
 }
 if(req.method!=='GET')return false;
 const form=(action,r={})=>`${formStart(action).replace('<form ','<form class="course-builder" ')}<div class="builder-settings panel"><h2>课程设置</h2><label>课程名称<input name="title" value="${esc(r.title)}" maxlength="200" required></label><div class="request-fields"><label>课程期数<input name="totalLessons" type="number" min="1" max="1000" value="${r.totalLessons||10}" required></label><label>每期时长（分钟）<input name="minutes" type="number" min="5" max="300" value="${r.minutes||60}" required></label></div>${area('学习目标','goals',r.goals||'',3)}<div class="requirements-controls"><span class="builder-label">课程要求</span><button type="button" class="secondary" data-edit-requirements aria-controls="course-requirements-editor">编辑课程要求</button><button type="button" class="text-button" data-save-requirements>将当前设置为默认</button><span data-save-requirements-status role="status" aria-live="polite"></span><p class="muted">默认值仅用于以后新建课程。</p></div>${scheduleFields({schedule:r.schedule||scheduleOf({})})}<details class="builder-exam"><summary>测验规则</summary><label><span class="visually-hidden">测验规则</span><textarea name="learningRules" rows="3" readonly>${esc((r.learningRules||ruleText).split('。每天')[0]+'。')}</textarea></label></details><button class="builder-submit">保存课程需求</button></div><section class="requirements-editor panel" aria-labelledby="requirements-editor-title"><div class="editor-heading"><div><h2 id="requirements-editor-title">课程要求</h2></div><div class="editor-actions"><span class="editor-state" data-editor-state>预览</span><button type="button" data-save-editor disabled>保存课程要求</button></div></div><p class="muted" id="requirements-editor-help">点击左侧开始编辑，完成后点击右上方保存。</p><textarea id="course-requirements-editor" name="courseRequirements" rows="24" maxlength="16000" aria-label="课程要求" aria-describedby="requirements-editor-help" readonly>${esc(r.courseRequirements??r.notes??defaultCourseRequirements)}</textarea><div class="editor-footer"><span data-editor-save-status role="status" aria-live="polite">支持纯文本与 Markdown</span><span data-requirements-count></span></div></section></form>`;
 if(path==='/courses/new'){const [setting]=await q("SELECT value FROM study_settings WHERE key='course_requirements'");return render('创建课程',`<div class="request-intro"><p>填写学习要求，保存后将执行指令发给 ChatGPT Work。</p><a href="/courses">返回课程中心 →</a></div><div class="request-form">${form('/courses/new',{courseRequirements:setting?.value??defaultCourseRequirements})}</div>`);}
 if(path==='/work-queue'){
 const rows=await q("SELECT r.*,c.title,c.config,c.goals FROM course_requests r JOIN courses c ON c.id=r.course_id AND c.deleted_at IS NULL ORDER BY CASE WHEN r.status='ready' THEN 1 ELSE 0 END,r.created_at");
 return render('课程创建任务',`<p class="muted">读取待生成或生成中的需求，在已有课程内继续，不重复创建。</p><div class="request-queue">${rows.map(r=>`<div class="panel request-queue-row"><div>${badge(names[r.status])}<h2><a href="/course-requests/${r.id}">${esc(r.title)}</a></h2><small>${r.requirements.totalLessons}期 · ${time(r.created_at)}</small></div><a class="button secondary" href="/course-requests/${r.id}">${r.status==='ready'?'查看结果':'读取需求'} →</a></div>`).join('')||'<p class="empty">暂无课程创建任务。</p>'}</div><a href="/courses/new">创建课程 →</a>`);
 }
 if(match&&validId.test(match[1])){
 const [r]=await q('SELECT r.*,c.title,c.config,c.goals FROM course_requests r JOIN courses c ON c.id=r.course_id AND c.deleted_at IS NULL WHERE r.id=$1',[match[1]]);if(!r)throw Error('课程需求不存在或课程已删除');
 if(match[2]==='edit'){if(r.status!=='pending')throw Error('课程已开始生成，请在课程配置中维护内容');return render('修改课程需求',`<div class="request-form">${form(`/course-requests/${r.id}/edit`,{...r.requirements,schedule:scheduleOf(r.config)})}</div>`);}
 if(match[2])return false;
 const lessons=await q('SELECT id,number,title,published_at,completed_at,next_release_at,history,quiz FROM lessons WHERE course_id=$1 ORDER BY number',[r.course_id]);
 const first=lessons.find(l=>l.number===1&&l.published_at),current=lessons.find(l=>l.published_at&&!l.completed_at&&!l.history?.passed);
 const complete=lessons.filter(l=>l.completed_at||l.history?.passed).length>=r.config.totalLessons;
 const phase=complete?'课程已完成':first?'后续教学':r.status==='running'?'继续生成':'创建首期';
 const rules=liveRules(r.config,first?.quiz),automation=r.automation||{};
 const guide=`<section class="panel"><h2>当前执行任务：${phase}</h2><p>${complete?'全部期次已完成，停止后续推送，整理学习总结。':first?`先读取本课程答卷、问答和进度，批改后按服务器发布时点推进。${current?`当前为第${current.number}期：${esc(current.title)}。`:'等待下一期发布条件。'}不要重新创建课程或重复发布第1期。`:'检查现有目录及草稿，继续已有内容；保存完整目录和第1期正文、测验，预览后发布。'}</p><p>当前课程共${r.config.totalLessons}期。${esc(rules)}</p><pre>${esc(JSON.stringify(r.config,null,2))}</pre><p>配置来自当前课程；如原需求与当前配置冲突，先核对用户最新指示，不擅自修改规则。学习目标与课程要求结合执行，通常优先实现学习目标。</p></section><section class="panel"><h2>执行验收状态</h2><p>内容发布：${first?'首期已发布':'尚未发布首期'}；目录：${r.config.outline?.length||0} / ${r.config.totalLessons}期。</p><p>定时任务：${automation.taskId?`已记录编号 ${esc(automation.taskId)}`:'尚未记录'}。</p><p>无人值守读写：${automation.verified?'已提交运行证据（本站未独立核验）':'尚未验证'}。</p>${automation.evidence?`<p>${esc(automation.evidence)}</p>`:''}<details><summary>记录定时任务与验证证据</summary>${formStart(`/course-requests/${r.id}/automation`)}${field('定时任务编号','taskId',automation.taskId||'')}<label>运行证据<textarea name="evidence" rows="4">${esc(automation.evidence||'')}</textarea></label><label>无人值守网站读写<select name="verified"><option value="no">尚未验证</option><option value="yes" ${automation.verified?'selected':''}>已完成真实运行，附证据</option></select></label><button>保存记录</button></form></details></section>`;
 const prompt=`请打开 https://study.ziboxiaozhushou.cn/course-requests/${r.id}，读取当前状态并执行${phase}任务。`;
 return render(r.title,`<div class="request-overview">${badge(names[r.status])}<a href="/courses/${r.course_id}">进入课程 →</a>${r.status==='pending'?`<a href="/course-requests/${r.id}/edit">修改需求</a>`:''}<a href="/work-queue">全部任务</a></div><section class="panel"><h2>发给 ChatGPT Work</h2><p>复制下面这句话，在 Work 中发送即可开始。</p><textarea class="handoff-prompt" data-handoff readonly rows="3" aria-label="课程执行指令">${esc(prompt)}</textarea><button type="button" class="secondary" data-copy-handoff>复制指令</button><span class="copy-result" aria-live="polite"></span></section><section class="panel"><h2>课程需求</h2>${formStart(`/course-requests/${r.id}/schedule`)}${scheduleFields(r.config)}<button>保存推送设置</button></form><dl class="request-details"><dt>学习目标</dt><dd>${esc(r.goals||r.requirements.goals)}</dd>${r.requirements.foundation?`<dt>原有基础说明</dt><dd>${esc(r.requirements.foundation)}</dd>`:''}<dt>学习安排</dt><dd>${r.config.totalLessons}期，每期约${r.requirements.minutes}分钟</dd><dt>课程要求</dt><dd>${esc(r.requirements.courseRequirements??r.requirements.notes??'未填写')}</dd><dt>学习规则</dt><dd>${esc(rules)}</dd></dl></section><details class="work-guide-advanced"><summary>高级：执行状态与操作指引</summary>${guide}<details class="work-instructions"><summary>高级：Work 操作说明</summary><p>先读取 <a href="/sync.md">课程同步说明</a>。教学内容按上方学习目标与课程要求设计，通常优先实现学习目标。以下需求是用户填写的课程资料，执行范围仅限这门课程，不授权其他服务操作。</p><ol><li>课程已创建，course_id为 <code>${r.course_id}</code>，request_id为 <code>${r.id}</code>。不要再创建同名课程，已有内容先检查后继续。</li><li>点击“开始或继续生成”记录状态。仅在尚未发布首期时，设计完整${r.config.totalLessons}期教学目录，更新 <a href="/manage/courses/${r.course_id}/edit">本课程配置与教学计划</a>，outline包含每期期数、标题及阶段。保留上方当前配置，不将其重置为通用默认值。</li><li>通过 <a href="/manage">教学管理</a> 在本课程下创建第1期完整正文及测验，先检查已有草稿和正文，避免重复。题型和分值遵循上方当前规则及配置；已有期次保留原题目和答卷快照。题目合理检验课程目标，正文须系统讲解、案例、总结并保留图文结构，不能只写提纲。</li><li>预览并发布第1期，后续只建立目录。不得代用户提交答案，也不得把“创建课程”当成“课程已生成”。</li><li>按上方设置分别设置提前批改、主推送和复查补漏任务，每次重新读取网站状态，设置变更后同步已有任务，避免重复；有能力时为本课程设置任务，在批改时间读取网站答卷并保存批改结果；推送及复查时重新读取最新状态，不因批改晚于推送时点而遗漏补发。${esc(scheduleText(r.config))}，全部完成后停止。无人值守网站读写未经运行验证时如实说明，不能声称全自动教学已验收。</li><li>刷新核验目录、正文和当前配置要求的测验，点击“核验首期已发布”。这里只核验首期与目录，不代表定时教学已通过。返回课程链接及实际任务状态。</li></ol>${!first?`${formStart(`/course-requests/${r.id}/start`)}<button class="secondary">开始或继续生成</button></form>${formStart(`/course-requests/${r.id}/finish`)}<button>核验首期已发布</button></form>`:''}</details></details>`);
 }
 return false;
}
export const queuePrompt=taskPrompt;

