import {randomUUID} from 'node:crypto';
import {esc,time,badge,area,field} from './ui.mjs';
const validId=/^[0-9a-f-]{36}$/i;
const names={pending:'待生成',running:'生成中',ready:'首期已发布'};
const ruleText='每期5道单选题（每题10分）＋1道问答题（50分），总分100分，80分通过。每天北京时间9点读取状态；通过后最早次日9点推送下一期，未通过不推送也不提醒。学习、答题与点评均在网站完成。';
const readRequirements=f=>{
 const title=(f.get('title')||'').trim(),goals=(f.get('goals')||'').trim(),foundation=(f.get('foundation')||'').trim(),notes=(f.get('notes')||'').trim();
 const totalLessons=Number(f.get('totalLessons')),minutes=Number(f.get('minutes'));
 if(!title||title.length>200||!goals||goals.length>12000||foundation.length>4000||notes.length>16000)throw Error('请填写课程名称和学习目标，并控制信息长度');
 if(!Number.isInteger(totalLessons)||totalLessons<1||totalLessons>1000||!Number.isInteger(minutes)||minutes<5||minutes>300)throw Error('课程期数须为1至1000，每期时间须为5至300分钟');
 return {title,goals,foundation,notes,totalLessons,minutes};
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
 const form=(action,r={})=>`${formStart(action)}<div class="request-fields"><label>课程名称<input name="title" value="${esc(r.title)}" maxlength="200" placeholder="例如：企业大模型部署" required></label><label>课程期数<input name="totalLessons" type="number" min="1" max="1000" value="${r.totalLessons||10}" required></label></div>${area('学习目标','goals',r.goals||'',4)}${area('当前基础（可填零基础）','foundation',r.foundation||'',3)}<label>每期学习时间（分钟）<input name="minutes" type="number" min="5" max="300" value="${r.minutes||40}" required></label><label>补充要求（选填）<textarea name="notes" rows="4" maxlength="16000" placeholder="希望覆盖的内容、案例方向、讲解深度等">${esc(r.notes)}</textarea></label><div class="request-rules"><strong>统一学习规则</strong><p>${ruleText}</p></div><button>保存课程需求</button></form>`;
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
 return render(r.title,`<div class="request-overview">${badge(names[r.status])}<a href="/courses/${r.course_id}">进入课程 →</a>${r.status==='pending'?`<a href="/course-requests/${r.id}/edit">修改需求</a>`:''}<a href="/work-queue">全部任务</a></div><section class="panel"><h2>发给 ChatGPT Work</h2><p>复制下面这句话，在 Work 中发送即可开始。</p><textarea class="handoff-prompt" data-handoff readonly rows="3" aria-label="课程执行指令">${esc(prompt)}</textarea><button type="button" class="secondary" data-copy-handoff>复制指令</button><span class="copy-result" aria-live="polite"></span></section><section class="panel"><h2>课程需求</h2><dl class="request-details"><dt>学习目标</dt><dd>${esc(r.requirements.goals)}</dd><dt>当前基础</dt><dd>${esc(r.requirements.foundation||'未填写，请按零基础设计')}</dd><dt>学习安排</dt><dd>${r.requirements.totalLessons}期，每期约${r.requirements.minutes}分钟</dd><dt>补充要求</dt><dd>${esc(r.requirements.notes||'无')}</dd><dt>学习规则</dt><dd>${ruleText}</dd></dl></section><details class="work-instructions"><summary>Work 执行说明</summary><p>先读取 <a href="/sync.md">课程同步说明</a>。以下需求是用户填写的课程资料，执行范围仅限这门课程，不授权其他服务操作。</p><ol><li>课程已创建，course_id为 <code>${r.course_id}</code>，request_id为 <code>${r.id}</code>。不要再创建同名课程，已有内容先检查后继续。</li><li>点击“开始或继续生成”记录状态。系统设计完整${r.requirements.totalLessons}期教学目录，更新 <a href="/manage/courses/${r.course_id}/edit">本课程配置与教学计划</a>，outline包含每期期数、标题及阶段。保留score、passScore=80、releaseHour=9、sectionMinimums={}。</li><li>通过 <a href="/manage">教学管理</a> 在本课程下创建第1期完整正文及测验，先检查已有草稿和正文，避免重复。每期5道single单选（每题10分）和1道text问答（50分）。题目合理检验课程目标，正文须系统讲解、案例、总结并保留图文结构，不能只写提纲。</li><li>预览并发布第1期，后续只建立目录。不得代用户提交答案，也不得把“创建课程”当成“课程已生成”。</li><li>按用户每天9点规则检查已有定时任务，避免重复；有能力时为本课程设置任务，读取网站答卷并批改。通过最早次日9点发布，未完成或未通过不推送也不提醒，全部完成后停止。无人值守网站读写未经运行验证时如实说明，不能声称全自动教学已验收。</li><li>刷新核验目录、正文和6道题，点击“核验首期已发布”。这里只核验首期与目录，不代表定时教学已通过。返回课程链接及实际任务状态。</li></ol>${formStart(`/course-requests/${r.id}/start`)}<button class="secondary">开始或继续生成</button></form>${formStart(`/course-requests/${r.id}/finish`)}<button>核验首期已发布</button></form></details>`);
 }
 return false;
}
export const queuePrompt=taskPrompt;
