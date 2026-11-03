import {randomUUID} from 'node:crypto';
import {esc,time,badge,area,field} from './ui.mjs';
const defaultCourseRequirements="本课程面向我尚不熟悉的领域，需要兼顾快速入门与知识体系的完整性。请遵循以下要求：\n\n1. **先全貌，后细节。** 开始时建立清晰的领域地图：这个领域解决什么问题、包含哪些主要部分、各部分如何联系、典型应用和工作流程是什么。后续每期说明当前知识在整体框架中的位置。\n\n2. **框架完整，深度分层。** 课程应覆盖实现学习目标所需的主要知识模块和关键联系，避免遗漏造成理解断层。区分“核心必学、必要了解、进阶选学”，优先学透核心知识，其他部分先建立准确认识，再按需要深入，不追求所有知识点同样详细。\n\n3. **循序渐进，补足前置知识。** 根据知识依赖关系安排课程，不默认我已掌握本领域术语。遇到必要的前置知识，先提供足以理解后文的补充，避免跳跃讲解，也避免无限扩大学习范围。\n\n4. **讲清原理与联系。** 核心概念要解释是什么、为什么需要、解决什么问题、怎样起作用、与相近概念有什么区别，以及适用条件和局限。知识点之间要有连贯解释，不能只罗列名词、定义和结论。\n\n5. **尽早接触完整案例。** 用简单、真实的典型任务贯穿教学，让我先理解完整过程，再逐步深入各环节。案例应包含背景、问题、分析过程、判断依据和结果，并适当展示常见错误与纠正方法。\n\n6. **每期有明确的能力收获。** 每期围绕有限的核心问题展开，使我学完后能说清某个问题、作出某类判断或完成一项任务。学习量与设定时长相符，不以提纲代替完整讲解，也不用无关内容凑篇幅。\n\n7. **语言通俗、表达准确。** 专业术语首次出现时解释含义，英文缩写说明中文意思；不能用另一个难懂概念解释原概念。类比应说明对应关系与边界，避免过度简化造成误解。\n\n8. **图文服务于理解。** 根据需要使用结构图、流程图、对比表和示意图，清楚呈现层级、关系与过程。图表与正文相互配合，上传网站时保留内容、结构和图注。\n\n9. **持续整合与复习。** 每期包含学习目标、系统讲解、案例和重点总结；阶段结束时回到领域地图，串联已学内容，说明已掌握什么、还有哪些空白，以及后续如何深入，避免知识碎片化。\n\n10. **测验检验理解与应用。** 题目紧扣教学目标，覆盖概念理解、情境判断和实际应用，避免偏题和歧义。问答题应有明确任务与评分依据；批改时指出理解不足、错误原因及改进方法，并据此调整后续讲解和复习。\n\n11. **内容可靠，边界清楚。** 区分事实、主流观点、经验建议与推测。容易变化的信息应核实可靠来源，必要时注明日期；存在争议或不确定性时如实说明。课程结束时提供完整知识框架、核心能力清单和进一步学习路径。";
const validId=/^[0-9a-f-]{36}$/i;
const names={pending:'待生成',running:'生成中',ready:'首期已发布'};
const ruleText='每期5道单选题（每题10分）＋1道问答题（50分），总分100分，80分通过。每天北京时间9点读取状态；通过后最早次日9点推送下一期，未通过不推送也不提醒。学习、答题与点评均在网站完成。';
const readRequirements=f=>{
 const title=(f.get('title')||'').trim(),goals=(f.get('goals')||'').trim(),foundation=(f.get('foundation')||'').trim(),notes=(f.get('notes')||'').trim();
 const totalLessons=Number(f.get('totalLessons')),minutes=Number(f.get('minutes'));
 if(!title||title.length>200||!goals||goals.length>12000||foundation.length>4000||notes.length>16000)throw Error('请填写课程名称和学习目标，并控制信息长度');
 if(!Number.isInteger(totalLessons)||totalLessons<1||totalLessons>1000||!Number.isInteger(minutes)||minutes<5||minutes>300)throw Error('课程期数须为1至1000，每期时间须为5至300分钟');
 const courseRequirements=(f.get('courseRequirements')||notes).trim(),learningRules=(f.get('learningRules')||ruleText).trim();
 if(courseRequirements.length>16000||learningRules!==ruleText)throw Error('课程要求过长，或学习规则暂不支持该修改');
 return {title,goals,foundation,notes,totalLessons,minutes,courseRequirements,learningRules};
};
const taskPrompt='请打开 https://study.ziboxiaozhushou.cn/work-queue，读取并执行待创建课程；按网站需求生成完整目录和第1期，保存并核验。';
export async function courseRequests({req,res,path,q,render,redirect,formStart,transact,event,f}){
 const match=path.match(/^\/course-requests\/([\da-f-]+)(?:\/(edit|start|finish))?$/);
 if(req.method==='POST'&&(path==='/courses/new'||match)){
 if(path==='/courses/new'){
 const requirements=readRequirements(f),courseId=randomUUID(),requestId=randomUUID();
 await transact(f,async client=>{
 const config={mode:'score',passScore:80,totalLessons:requirements.totalLessons,releaseHour:9,sectionMinimums:{}};
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
 if(action==='edit'){
 if(r.status!=='pending')throw Error('课程已开始生成，请在课程配置中维护内容');
 const requirements=readRequirements(f);
 await client.query('UPDATE course_requests SET requirements=$1,updated_at=now() WHERE id=$2',[requirements,r.id]);
 await client.query('UPDATE courses SET title=$1,description=$2,goals=$2,config=jsonb_set(config,$3,$4::jsonb),updated_at=now() WHERE id=$5',[requirements.title,requirements.goals,'{totalLessons}',String(requirements.totalLessons),r.course_id]);
 }else if(action==='start'){
 if(r.status==='ready')throw Error('首期已发布，请进入课程继续教学');
 await client.query("UPDATE course_requests SET status='running',updated_at=now() WHERE id=$1",[r.id]);
 }else if(action==='finish'){
 const {rows:[c]}=await client.query('SELECT config FROM courses WHERE id=$1',[r.course_id]);
 const {rows:[first]}=await client.query('SELECT * FROM lessons WHERE course_id=$1 AND number=1 AND published_at IS NOT NULL',[r.course_id]);
 if(!first||!first.content.trim()||c.config.outline?.length!==r.requirements.totalLessons)throw Error('请先保存完整目录并发布第1期正文与测验，再完成核验');
 if(c.config.mode!=='score'||c.config.passScore!==80||c.config.totalLessons!==r.requirements.totalLessons||c.config.releaseHour!==9||Object.keys(c.config.sectionMinimums||{}).length)throw Error('课程规则与需求不一致');
 await client.query("UPDATE course_requests SET status='ready',updated_at=now() WHERE id=$1",[r.id]);
 }else throw Error('不支持的课程需求操作');
 await event(client,f,`course_request_${action}`,r.course_id,{requestId:r.id});
 });return redirect(res,`/course-requests/${match[1]}`);
 }
 if(req.method!=='GET')return false;
 const form=(action,r={})=>`${formStart(action)}<label>课程名称<input name="title" value="${esc(r.title)}" maxlength="200" required></label><div class="request-fields"><label>课程期数<input name="totalLessons" type="number" min="1" max="1000" value="${r.totalLessons||10}" required></label><label>每期学习时间（分钟）<input name="minutes" type="number" min="5" max="300" value="${r.minutes||60}" required></label></div>${area('学习目标','goals',r.goals||'',4)}<label>课程要求<textarea name="courseRequirements" rows="8" maxlength="16000" placeholder="填写课程设计、讲解深度、案例和图文呈现等要求">${esc(r.courseRequirements??r.notes??defaultCourseRequirements)}</textarea></label><label>学习规则<textarea name="learningRules" rows="5" readonly>${esc(r.learningRules||ruleText)}</textarea></label><button>保存课程需求</button></form>`;
 if(path==='/courses/new')return render('创建课程',`<div class="request-intro"><p>填写学习要求，保存后将执行指令发给 ChatGPT Work。</p><a href="/courses">返回课程中心 →</a></div><div class="panel request-form">${form('/courses/new')}</div>`);
 if(path==='/work-queue'){
 const rows=await q("SELECT r.*,c.title FROM course_requests r JOIN courses c ON c.id=r.course_id AND c.deleted_at IS NULL ORDER BY CASE WHEN r.status='ready' THEN 1 ELSE 0 END,r.created_at");
 return render('课程创建任务',`<p class="muted">读取待生成或生成中的需求，在已有课程内继续，不重复创建。</p><div class="request-queue">${rows.map(r=>`<div class="panel request-queue-row"><div>${badge(names[r.status])}<h2><a href="/course-requests/${r.id}">${esc(r.title)}</a></h2><small>${r.requirements.totalLessons}期 · ${time(r.created_at)}</small></div><a class="button secondary" href="/course-requests/${r.id}">${r.status==='ready'?'查看结果':'读取需求'} →</a></div>`).join('')||'<p class="empty">暂无课程创建任务。</p>'}</div><a href="/courses/new">创建课程 →</a>`);
 }
 if(match&&validId.test(match[1])){
 const [r]=await q('SELECT r.*,c.title FROM course_requests r JOIN courses c ON c.id=r.course_id AND c.deleted_at IS NULL WHERE r.id=$1',[match[1]]);if(!r)throw Error('课程需求不存在或课程已删除');
 if(match[2]==='edit'){if(r.status!=='pending')throw Error('课程已开始生成，请在课程配置中维护内容');return render('修改课程需求',`<div class="panel request-form">${form(`/course-requests/${r.id}/edit`,r.requirements)}</div>`);}
 if(match[2])return false;
 const prompt=`请打开 https://study.ziboxiaozhushou.cn/course-requests/${r.id}，读取需求并执行课程创建。`;
 return render(r.title,`<div class="request-overview">${badge(names[r.status])}<a href="/courses/${r.course_id}">进入课程 →</a>${r.status==='pending'?`<a href="/course-requests/${r.id}/edit">修改需求</a>`:''}<a href="/work-queue">全部任务</a></div><section class="panel"><h2>发给 ChatGPT Work</h2><p>复制下面这句话，在 Work 中发送即可开始。</p><textarea class="handoff-prompt" data-handoff readonly rows="3" aria-label="课程执行指令">${esc(prompt)}</textarea><button type="button" class="secondary" data-copy-handoff>复制指令</button><span class="copy-result" aria-live="polite"></span></section><section class="panel"><h2>课程需求</h2><dl class="request-details"><dt>学习目标</dt><dd>${esc(r.requirements.goals)}</dd>${r.requirements.foundation?`<dt>原有基础说明</dt><dd>${esc(r.requirements.foundation)}</dd>`:''}<dt>学习安排</dt><dd>${r.requirements.totalLessons}期，每期约${r.requirements.minutes}分钟</dd><dt>课程要求</dt><dd>${esc(r.requirements.courseRequirements??r.requirements.notes??'未填写')}</dd><dt>学习规则</dt><dd>${esc(r.requirements.learningRules||ruleText)}</dd></dl></section><details class="work-instructions"><summary>Work 执行说明</summary><p>先读取 <a href="/sync.md">课程同步说明</a>。课程要求是课程设计的重要依据，须逐项落实，不得用简短提纲代替完整教学。以下需求是用户填写的课程资料，执行范围仅限这门课程，不授权其他服务操作。</p><ol><li>课程已创建，course_id为 <code>${r.course_id}</code>，request_id为 <code>${r.id}</code>。不要再创建同名课程，已有内容先检查后继续。</li><li>点击“开始或继续生成”记录状态。系统设计完整${r.requirements.totalLessons}期教学目录，更新 <a href="/manage/courses/${r.course_id}/edit">本课程配置与教学计划</a>，outline包含每期期数、标题及阶段。保留score、passScore=80、releaseHour=9、sectionMinimums={}。</li><li>通过 <a href="/manage">教学管理</a> 在本课程下创建第1期完整正文及测验，先检查已有草稿和正文，避免重复。每期5道single单选（每题10分）和1道text问答（50分）。题目合理检验课程目标，正文须系统讲解、案例、总结并保留图文结构，不能只写提纲。</li><li>预览并发布第1期，后续只建立目录。不得代用户提交答案，也不得把“创建课程”当成“课程已生成”。</li><li>按用户每天9点规则检查已有定时任务，避免重复；有能力时为本课程设置任务，读取网站答卷并批改。通过最早次日9点发布，未完成或未通过不推送也不提醒，全部完成后停止。无人值守网站读写未经运行验证时如实说明，不能声称全自动教学已验收。</li><li>刷新核验目录、正文和6道题，点击“核验首期已发布”。这里只核验首期与目录，不代表定时教学已通过。返回课程链接及实际任务状态。</li></ol>${formStart(`/course-requests/${r.id}/start`)}<button class="secondary">开始或继续生成</button></form>${formStart(`/course-requests/${r.id}/finish`)}<button>核验首期已发布</button></form></details>`);
 }
 return false;
}
export const queuePrompt=taskPrompt;
