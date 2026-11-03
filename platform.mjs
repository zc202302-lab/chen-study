import {randomUUID} from 'node:crypto';
import {esc,md,time,badge,layout,lessonDocument,hidden,field,area} from './ui.mjs';
import {nextRelease,validateConfig,validateQuiz,validateAnswers,validateReview} from './rules.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const empty=s=>`<p class="empty">${s}</p>`;
const error=s=>{throw new Error(s);};
const isComplete=l=>Boolean(l.completed_at||l.history?.passed);
const completionTime=l=>l.history?.passed?`${esc(l.history.date)}（历史记录迁移，原时刻不详）`:time(l.completed_at);
const publicationTime=l=>l.history?`历史课程，原发布时间不详（迁移发布：${time(l.published_at)}）`:time(l.published_at);
const status=l=>isComplete(l)?(l.history?.passed?'已通过（历史迁移）':'已完成'):l.published_at?'学习中':'待发布';
function withOutline(ls,config){
 const rows=[...ls];for(const x of config.outline||[])if(!rows.some(l=>l.number===x.number))rows.push({...x,id:null,published_at:null,completed_at:null});
 return rows.sort((a,b)=>a.number-b.number);
}
function historyReview(l){
 const h=l.history;if(!h)return '';
 return `<section class="panel"><h3>历史答卷与批改 · ${h.score} / 100</h3><p>${esc(h.date)}（历史记录迁移，原答题及批改时刻不详）</p><p>${esc(h.source)}</p>${l.quiz.map((x,i)=>{const r=h.review.items.find(r=>r.id===x.id);return `<div class="panel"><strong>${i+1}. ${esc(x.prompt)}</strong><p>你的答案：${esc(x.type==='single'?x.options[h.answers[x.id]]:h.answers[x.id])}</p><p>得分：${r.score} / ${x.points}</p>${md(r.feedback)}</div>`;}).join('')}<h3>本期点评</h3>${md(h.review.summary)}<h3>知识盲区</h3>${md(h.review.blindSpots)}<h3>改进建议</h3>${md(h.review.suggestions)}${badge(h.passed?'已通过（历史记录迁移）':'尚未通过')}</section>`;
}
const sampleConfig={mode:'completion',totalLessons:10,releaseHour:9,sectionMinimums:{}};
const sampleQuiz=[{id:'q1',type:'single',prompt:'示例题干，请替换为正式课程题目。',options:['选项一','选项二'],correct:0,points:100,section:'基础知识',explanation:'请填写标准解析'}];
export async function platform({req,res,path,pool,csrf,send,redirect,form}){
 const q=async(sql,args=[])=> (await pool.query(sql,args)).rows;
 const render=(title,body,options)=>send(res,200,layout(title,body,options));
 const formStart=action=>`<form method="post" action="${action}">${hidden(csrf,randomUUID())}`;
 const event=async(client,f,action,subject,details={})=>client.query('INSERT INTO study_events(id,operation_id,action,subject_id,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),f.get('operation_id'),action,subject,details]);
 const transact=async(f,fn)=>{
 if(!uuid.test(f.get('operation_id')||''))error('操作编号无效');
 const c=await pool.connect();try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(731104)");
 const exists=await c.query('SELECT 1 FROM study_events WHERE operation_id=$1',[f.get('operation_id')]);
 if(!exists.rowCount){
 const target=path.match(/^\/(?:manage\/)?(courses|lessons|submissions|questions)\/([\da-f-]+)\//);
 const kind=target?.[1],id=target?.[2]||(path==='/manage/lessons'?f.get('course_id'):null);
 if(id&&!path.endsWith('/restore')){
 const lookup=kind==='submissions'?'SELECT l.course_id id FROM submissions s JOIN lessons l ON l.id=s.lesson_id WHERE s.id=$1':kind==='questions'?'SELECT l.course_id id FROM questions q JOIN lessons l ON l.id=q.lesson_id WHERE q.id=$1':kind==='lessons'?'SELECT course_id id FROM lessons WHERE id=$1':'SELECT id FROM courses WHERE id=$1';
 const {rows:[owner]}=await c.query(lookup,[id]);
 if(!owner)error('课程或记录不存在');
 const {rows:[active]}=await c.query('SELECT id FROM courses WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[owner.id]);
 if(!active)error('课程已删除，请先在教学管理中恢复');
 }
 await fn(c);
 }
 await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 };
 const getLesson=async(id)=>{const rows=await q('SELECT l.*,c.title course_title,c.config,c.status course_status FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE l.id=$1',[id]);return rows[0]||error('课时不存在');};
 const courseRows=cs=>cs.map(c=>`<div class="row"><div><small>${esc(c.category)} · ${c.config.totalLessons}期</small><h3><a href="/courses/${c.id}">${esc(c.title)}</a></h3><p class="muted">${esc(c.description)}</p></div><div>${badge(`${c.completed_count||0} / ${c.config.totalLessons} 已完成`)}<p><small>更新 ${time(c.updated_at)}</small></p></div></div>`).join('');
 const quizRows=rows=>rows.map(r=>`<div class="row"><div><small>${esc(r.course_title)}</small><h3><a href="/lessons/${r.id}#quiz">第${r.number}期 · ${esc(r.title)}</a></h3></div>${badge(isComplete(r)?'已完成':r.reviewed_at?'已点评':r.submitted_at?'待批改':'待答题')}</div>`).join('');
 const courseQuery=`SELECT c.*, (SELECT count(*)::int FROM lessons l WHERE l.course_id=c.id AND (l.completed_at IS NOT NULL OR (l.history->>$$passed$$)::boolean IS TRUE)) completed_count FROM (SELECT * FROM courses WHERE deleted_at IS NULL) c`;
 if(req.method==='POST'){
 const f=await form(req);if(f.get('csrf')!==csrf)error('页面已过期，请刷新后重试');
 const removal=path.match(/^\/manage\/courses\/([\da-f-]+)\/(delete|restore)$/);
 if(removal&&uuid.test(removal[1])){
 await transact(f,async c=>{
 const {rows:[course]}=await c.query('SELECT * FROM courses WHERE id=$1 FOR UPDATE',[removal[1]]);
 if(!course)error('课程不存在');
 if(removal[2]==='delete'){
 if(course.deleted_at)error('课程已删除');
 if(f.get('confirm_title')!==course.title)error('课程名称不一致，请输入完整课程名称确认删除');
 await c.query('UPDATE courses SET deleted_at=now() WHERE id=$1',[course.id]);
 await event(c,f,'course_deleted',course.id,{title:course.title});
 }else{
 if(!course.deleted_at)error('课程未删除，无需恢复');
 await c.query('UPDATE courses SET deleted_at=NULL WHERE id=$1',[course.id]);
 await event(c,f,'course_restored',course.id,{title:course.title});
 }
 });return redirect(res,'/manage');
 }
 if(path==='/manage/courses'){
 const config=validateConfig(JSON.parse(f.get('config')||'{}'));const title=f.get('title')?.trim();if(!title)error('课程名称不能为空');
 await transact(f,async c=>{const id=randomUUID();await c.query('INSERT INTO courses(id,title,category,description,goals,config) VALUES($1,$2,$3,$4,$5,$6)',[id,title,f.get('category'),f.get('description'),f.get('goals'),config]);await event(c,f,'course_created',id);});return redirect(res,'/courses');
 }
 let edit=path.match(/^\/manage\/courses\/([\da-f-]+)\/edit$/);
 if(edit&&uuid.test(edit[1])){
 const config=validateConfig(JSON.parse(f.get('config')||'{}'));if(!f.get('title')?.trim())error('课程名称不能为空');
 await transact(f,async c=>{const {rows:[old]}=await c.query('SELECT * FROM courses WHERE id=$1 FOR UPDATE',[edit[1]]);if(!old)error('课程不存在');const {rows:[max]}=await c.query('SELECT coalesce(max(number),0) n FROM lessons WHERE course_id=$1',[old.id]);if(config.totalLessons<max.n)error('总期数不能小于已有课时编号');await c.query('UPDATE courses SET title=$1,category=$2,description=$3,goals=$4,config=$5,updated_at=now() WHERE id=$6',[f.get('title'),f.get('category'),f.get('description'),f.get('goals'),config,old.id]);await event(c,f,'course_updated',old.id,{previousConfig:old.config});});return redirect(res,'/manage');
 }
 edit=path.match(/^\/manage\/lessons\/([\da-f-]+)\/edit$/);
 if(edit&&uuid.test(edit[1])){
 const quiz=validateQuiz(JSON.parse(f.get('quiz')||'[]'));if(!f.get('title')?.trim()||!f.get('content')?.trim())error('课时标题与正文不能为空');
 await transact(f,async c=>{const {rows:[old]}=await c.query('SELECT * FROM lessons WHERE id=$1 FOR UPDATE',[edit[1]]);if(!old)error('课时不存在');if(old.published_at){const {rows:[same]}=await c.query('SELECT $1::jsonb=$2::jsonb same',[JSON.stringify(old.quiz),JSON.stringify(quiz)]);if(!same.same)error('已发布测验不可更改，请保留历史题目');}await c.query('INSERT INTO lesson_versions(lesson_id,revision,snapshot) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[old.id,old.revision,old]);await c.query('UPDATE lessons SET stage=$1,title=$2,content=$3,quiz=$4,revision=revision+1 WHERE id=$5',[f.get('stage'),f.get('title'),f.get('content'),JSON.stringify(quiz),old.id]);await c.query('UPDATE courses SET updated_at=now() WHERE id=$1',[old.course_id]);await event(c,f,'lesson_updated',old.id,{previousRevision:old.revision});});return redirect(res,'/manage');
 }
 if(path==='/manage/lessons'){
 const course=f.get('course_id');if(!uuid.test(course))error('请选择课程');const number=Number(f.get('number')),quiz=validateQuiz(JSON.parse(f.get('quiz')||'[]'));if(!Number.isInteger(number)||number<1||!f.get('title')?.trim()||!f.get('content')?.trim())error('课时编号、标题或正文无效');
 await transact(f,async c=>{const {rows:[courseRow]}=await c.query('SELECT * FROM courses WHERE id=$1 FOR UPDATE',[course]);if(!courseRow||number>courseRow.config.totalLessons)error('课时超出课程配置范围');const id=randomUUID();await c.query('INSERT INTO lessons(id,course_id,number,stage,title,content,quiz) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,course,number,f.get('stage'),f.get('title'),f.get('content'),JSON.stringify(quiz)]);await event(c,f,'lesson_drafted',id);});return redirect(res,'/manage');
 }
 let historyMatch=path.match(/^\/manage\/lessons\/([\da-f-]+)\/history$/);
 if(historyMatch&&uuid.test(historyMatch[1])){
 const date=f.get('date'),source=f.get('source')?.trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date(Date.now()+8*3600000).toISOString().slice(0,10)||!source)error('请提供真实的历史日期和来源');
 const answers=JSON.parse(f.get('answers')||'{}'),review=JSON.parse(f.get('review')||'{}');
 await transact(f,async c=>{
 const {rows:[l]}=await c.query('SELECT l.*,c.config FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE l.id=$1 FOR UPDATE OF l,c',[historyMatch[1]]);
 if(!l?.published_at)error('请先保存并发布对应历史课时');
 const {rowCount}=await c.query('SELECT id FROM submissions WHERE lesson_id=$1',[l.id]);if(l.history||isComplete(l)||rowCount)error('已有学习记录，不能覆盖或合并');
 validateAnswers(l.quiz,answers);const result=validateReview(l.quiz,review,l.config);
 for(const x of l.quiz)if(x.type==='single'&&review.items.find(r=>r.id===x.id).score!==(answers[x.id]===x.correct?x.points:0))error('单选题历史得分与答案不一致');
 const history={date,source,answers,review,...result,quizSnapshot:l.quiz,configSnapshot:l.config};
 await c.query('UPDATE lessons SET history=$1,next_release_at=$2 WHERE id=$3',[history,result.passed?nextRelease(`${date}T12:00:00+08:00`,l.config.releaseHour):null,l.id]);
 const {rows:[count]}=await c.query('SELECT count(*)::int n FROM lessons WHERE course_id=$1 AND (completed_at IS NOT NULL OR coalesce((history->>$$passed$$)::boolean,false))',[l.course_id]);
 await c.query('UPDATE courses SET updated_at=now(),status=CASE WHEN $2>=($3::int) THEN $$completed$$ ELSE status END WHERE id=$1',[l.course_id,count.n,l.config.totalLessons]);
 await event(c,f,'history_imported',l.id,{date,score:result.score,passed:result.passed,source});
 });return redirect(res,`/lessons/${historyMatch[1]}#quiz`);
 }
 let m=path.match(/^\/manage\/lessons\/([\da-f-]+)\/publish$/);
 if(m&&uuid.test(m[1])){
 await transact(f,async c=>{const {rows:[l]}=await c.query('SELECT l.*,c.config,c.status course_status FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE l.id=$1 FOR UPDATE OF l,c',[m[1]]);if(!l)error('课时不存在');if(l.course_status!=='active')error('课程未处于学习中');if(l.published_at)error('已经发布，无需重复发布');
 if(l.number>1){const {rows:[prev]}=await c.query('SELECT * FROM lessons WHERE course_id=$1 AND number=$2',[l.course_id,l.number-1]);if(!prev||!isComplete(prev)||!prev.next_release_at||new Date(prev.next_release_at)>new Date())error('上一期未完成，或尚未到下一个北京时间发布时点');}
 await c.query('UPDATE lessons SET published_at=now() WHERE id=$1',[l.id]);await c.query('UPDATE courses SET updated_at=now() WHERE id=$1',[l.course_id]);await event(c,f,'lesson_published',l.id,{number:l.number});});return redirect(res,'/manage');
 }
 m=path.match(/^\/lessons\/([\da-f-]+)\/submit$/);
 if(m&&uuid.test(m[1])){
 await transact(f,async c=>{const {rows:[l]}=await c.query('SELECT l.*,c.config FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE l.id=$1 FOR UPDATE OF l,c',[m[1]]);if(!l?.published_at||isComplete(l))error('当前课时不可提交');const {rowCount}=await c.query('SELECT 1 FROM submissions WHERE lesson_id=$1 AND reviewed_at IS NULL',[l.id]);if(rowCount)error('已有待批改答卷，请等待点评');const answers={};for(const x of l.quiz){answers[x.id]=x.type==='single'?Number(f.get(`answer_${x.id}`)):f.get(`answer_${x.id}`);if(x.type==='single'&&!f.has(`answer_${x.id}`))answers[x.id]=null;}validateAnswers(l.quiz,answers);const id=randomUUID();await c.query('INSERT INTO submissions(id,lesson_id,operation_id,lesson_revision,quiz_snapshot,answers,config_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,l.id,f.get('operation_id'),l.revision,JSON.stringify(l.quiz),answers,l.config]);await event(c,f,'quiz_submitted',id);});return redirect(res,`/lessons/${m[1]}#quiz`);
 }
 m=path.match(/^\/manage\/submissions\/([\da-f-]+)\/review$/);
 if(m&&uuid.test(m[1])){
 const review=JSON.parse(f.get('review')||'{}');
 await transact(f,async c=>{const {rows:[s]}=await c.query('SELECT * FROM submissions WHERE id=$1 FOR UPDATE',[m[1]]);if(!s||s.reviewed_at)error('答卷不存在或已经批改');const {rows:[l]}=await c.query('SELECT l.*,c.config FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE l.id=$1 FOR UPDATE OF l,c',[s.lesson_id]);const result=validateReview(s.quiz_snapshot,review,s.config_snapshot||l.config);await c.query('UPDATE submissions SET review=$1,score=$2,passed=$3,reviewed_at=now() WHERE id=$4',[review,result.score,result.passed,s.id]);
 if(result.passed){const {rows:[now]}=await c.query('SELECT now() completed');await c.query('UPDATE lessons SET completed_at=$1,next_release_at=$2 WHERE id=$3 AND completed_at IS NULL',[now.completed,nextRelease(now.completed,(s.config_snapshot||l.config).releaseHour),l.id]);const count=await c.query('SELECT count(*)::int n FROM lessons WHERE course_id=$1 AND (completed_at IS NOT NULL OR coalesce((history->>$$passed$$)::boolean,false))',[l.course_id]);if(count.rows[0].n>=l.config.totalLessons)await c.query("UPDATE courses SET status='completed',updated_at=now() WHERE id=$1",[l.course_id]);else await c.query('UPDATE courses SET updated_at=now() WHERE id=$1',[l.course_id]);}
 await event(c,f,'quiz_reviewed',s.id,result);});return redirect(res,'/manage');
 }
 m=path.match(/^\/lessons\/([\da-f-]+)\/questions$/);
 if(m&&uuid.test(m[1])){
 const question=f.get('question')?.trim();if(!question||question.length>30000)error('问题内容须为1至30000字');
 await transact(f,async c=>{const {rows:[l]}=await c.query('SELECT * FROM lessons WHERE id=$1',[m[1]]);if(!l?.published_at)error('课时未发布');const parent=f.get('parent_id')||null;if(parent){if(!uuid.test(parent))error('追问编号无效');const {rowCount}=await c.query('SELECT 1 FROM questions WHERE id=$1 AND lesson_id=$2',[parent,l.id]);if(!rowCount)error('追问须属于同一课时');}const id=randomUUID();await c.query('INSERT INTO questions(id,lesson_id,parent_id,operation_id,question) VALUES($1,$2,$3,$4,$5)',[id,l.id,parent,f.get('operation_id'),question]);await event(c,f,'question_asked',id);});return redirect(res,`/lessons/${m[1]}#questions`);
 }
 m=path.match(/^\/manage\/questions\/([\da-f-]+)\/answer$/);
 if(m&&uuid.test(m[1])){const answer=f.get('answer')?.trim();if(!answer)error('回答不能为空');await transact(f,async c=>{const r=await c.query('UPDATE questions SET answer=$1,answered_at=now() WHERE id=$2 AND answered_at IS NULL RETURNING id',[answer,m[1]]);if(!r.rowCount)error('问题已回答或不存在');await event(c,f,'question_answered',m[1]);});return redirect(res,'/manage');}
 return false;
 }
 if(req.method!=='GET')return false;
 if(path==='/assets/style.css'||path==='/assets/study.js')return false;
 if(path==='/'){
 const cs=await q(courseQuery+' ORDER BY c.updated_at DESC');
 const pending=await q(`SELECT l.*,c.title course_title,s.submitted_at,s.reviewed_at FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL LEFT JOIN LATERAL (SELECT * FROM submissions WHERE lesson_id=l.id ORDER BY submitted_at DESC LIMIT 1) s ON true WHERE l.published_at IS NOT NULL AND l.completed_at IS NULL AND NOT coalesce((l.history->>$$passed$$)::boolean,false) ORDER BY l.published_at DESC`);
 const events=await q('SELECT * FROM study_events ORDER BY created_at DESC LIMIT 8');
 const questions=await q('SELECT q.*,l.title lesson_title FROM questions q JOIN lessons l ON l.id=q.lesson_id JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL ORDER BY q.created_at DESC LIMIT 3');
 return render('学习首页',`<div class="stats dashboard-stats"><div><strong>${cs.length}</strong><span>全部课程</span></div><div><strong>${cs.filter(c=>c.status==='active').length}</strong><span>正在学习</span></div><div><strong>${cs.filter(c=>c.status==='completed').length}</strong><span>已完成课程</span></div><div><strong>${pending.filter(l=>!l.submitted_at).length}</strong><span>待完成测验</span></div></div><section class="current-learning"><div class="section-heading"><h2>继续学习</h2><a href="/courses">全部课程 →</a></div>${pending.map(l=>`<div class="panel learning-task"><div><small>${esc(l.course_title)} · 第${l.number}期</small><h3><a href="/lessons/${l.id}">${esc(l.title)}</a></h3>${badge(l.reviewed_at?'已点评':l.submitted_at?'待批改':'待完成测验')}</div><a class="button" href="/lessons/${l.id}">继续学习 →</a></div>`).join('')||empty('暂无待完成课时')} </section><div class="dashboard-bottom"><section><h2>我的课程</h2><div class="course-list">${courseRows(cs.slice(0,5))||empty('暂无课程')}</div></section><aside>${questions.length?`<h2>最近问答</h2>${questions.map(x=>`<p><a href="/lessons/${x.lesson_id}#questions">${esc(x.question)}</a><br>${badge(x.answered_at?'已回答':'待回答')}</p>`).join('')}`:''}${events.length?`<h2>最近动态</h2><div class="activity-list">${events.slice(0,4).map(e=>`<div><span>${esc(eventName(e.action))}</span><small>${time(e.created_at)}</small></div>`).join('')}</div>`:''}</aside></div>`);
 }
 if(path==='/courses'){
 const url=new URL(req.url,'http://localhost'),search=url.searchParams.get('q')||'',cat=url.searchParams.get('category')||'';
 const cs=await q(courseQuery+" WHERE (c.title ILIKE $1 OR c.description ILIKE $1) AND ($2='' OR c.category=$2) ORDER BY c.updated_at DESC",[`%${search}%`,cat]);const cats=await q('SELECT DISTINCT category FROM courses WHERE deleted_at IS NULL ORDER BY category');
 const cards=cs.map(c=>{const total=c.config.totalLessons,done=Number(c.completed_count)||0;return `<article class="catalog-card"><div class="catalog-card-top"><span class="catalog-category">${esc(c.category)||'综合课程'}</span><span class="catalog-count">${total} 期</span></div><h2><a href="/courses/${c.id}">${esc(c.title)}</a></h2><p class="catalog-description">${esc(c.description)||'课程内容持续更新中。'}</p><div class="catalog-card-bottom"><div class="catalog-progress"><div><span>学习进度</span><strong>${done}<span> / ${total} 期</span></strong></div><progress aria-label="${esc(c.title)}完成进度" value="${done}" max="${total}"></progress></div><a class="catalog-entry" href="/courses/${c.id}">进入课程 <span aria-hidden="true">→</span></a></div></article>`;}).join('');
 return render('课程中心',`<section class="course-catalog"><form class="search catalog-search" role="search"><label>搜索课程<input name="q" value="${esc(search)}" placeholder="课程名称或学习方向"></label><label>课程类别<select name="category"><option value="">全部类别</option>${cats.map(x=>`<option ${cat===x.category?'selected':''}>${esc(x.category)}</option>`).join('')}</select></label><button>查找</button></form><div class="catalog-toolbar"><span>${search||cat?'筛选结果':'全部课程'} <strong>${cs.length}</strong></span><a href="/manage">管理课程 →</a></div><div class="catalog-grid">${cards||`<div class="catalog-empty">没有匹配的课程${search||cat?'，<a href="/courses">查看全部课程</a>':'。'}</div>`}</div></section>`);
 }
 let m=path.match(/^\/courses\/([\da-f-]+)$/);
 if(m&&uuid.test(m[1])){
 const [c]=await q(courseQuery+' WHERE c.id=$1',[m[1]]);if(!c)error('课程不存在');const ls=withOutline(await q('SELECT * FROM lessons WHERE course_id=$1 ORDER BY number',[c.id]),c.config);let stage='';
 const tab=new URL(req.url,'http://localhost').searchParams.get('tab')||'overview';
 const tabs=`<nav class="course-tabs" aria-label="课程内导航">${[['overview','课程概览'],['quiz','本课程测验'],['questions','本课程问答'],['progress','学习进度']].map(([key,label])=>`<a ${tab===key?'aria-current="page"':''} href="/courses/${c.id}?tab=${key}">${label}</a>`).join('')}</nav>`;
 if(tab==='quiz'){const rows=await q(`SELECT l.*,c.title course_title,s.submitted_at,s.reviewed_at FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL LEFT JOIN LATERAL (SELECT * FROM submissions WHERE lesson_id=l.id ORDER BY submitted_at DESC LIMIT 1) s ON true WHERE l.course_id=$1 AND l.published_at IS NOT NULL ORDER BY l.number`,[c.id]);return render(c.title,`${tabs}<h2>本课程测验</h2>${quizRows(rows)||empty('课程发布后，在对应期数中完成测验。')}`);}
 if(tab==='questions'){const rows=await q('SELECT q.*,l.title lesson_title,l.number FROM questions q JOIN lessons l ON l.id=q.lesson_id WHERE l.course_id=$1 ORDER BY q.created_at',[c.id]);return render(c.title,`${tabs}<h2>本课程问答</h2>${rows.map(x=>`<div class="panel"><small>第${x.number}期 · ${esc(x.lesson_title)} · ${time(x.created_at)}</small><h3><a href="/lessons/${x.lesson_id}#questions">${esc(x.question)}</a></h3>${x.answer?md(x.answer):badge('待回答')}</div>`).join('')||empty('暂无问答，可在本期课程中提问。')}`);}
 if(tab==='progress')return render(c.title,`${tabs}<h2>本课程学习进度</h2><p>已完成 ${c.completed_count} / ${c.config.totalLessons} 期</p><table><tr><th>期数</th><th>状态</th><th>发布于</th><th>完成于</th></tr>${ls.map(l=>`<tr><td>${l.published_at?`<a href="/lessons/${l.id}">第${l.number}期 · ${esc(l.title)}</a>`:`第${l.number}期 · ${esc(l.title)}`}</td><td>${status(l)}</td><td>${publicationTime(l)}</td><td>${completionTime(l)}</td></tr>`).join('')}</table>`);
 const current=ls.find(l=>l.published_at&&!isComplete(l))||ls.filter(l=>l.published_at).at(-1);
 return render(c.title,`${tabs}<div class="course-summary"><div><p>${badge(c.category)} ${badge(c.status==='completed'?'已完成':'学习中')}</p><p class="course-progress">已完成 <strong>${c.completed_count}</strong> / ${c.config.totalLessons} 期</p><progress aria-label="课程完成进度" value="${c.completed_count}" max="${c.config.totalLessons}"></progress></div>${current?`<a class="button" href="/lessons/${current.id}">${isComplete(current)?'回顾课程':'继续学习'} →</a>`:''}</div><h2>课程目录</h2><div class="lesson-directory">${ls.map(l=>{let h='';if(l.stage!==stage){stage=l.stage;h=`<h3>${esc(stage)}</h3>`;}return h+`<div class="row"><div>${l.published_at?`<a href="/lessons/${l.id}"><span class="lesson-number">${String(l.number).padStart(2,'0')}</span>${esc(l.title)}</a>`:`第${l.number}期 · ${esc(l.title)}`}</div>${badge(status(l))}</div>`;}).join('')||empty('教学目录尚未创建')}</div><details class="course-plan"><summary>课程介绍与学习计划</summary><p class="muted">${esc(c.description)}</p>${md(c.goals)}<p class="muted">${c.config.mode==='completion'?'完成全部测验并获得点评即可晋级':`总分须达到 ${c.config.passScore}，同时满足分项要求`}。下一期最早于完成后的下一个北京时间${c.config.releaseHour}:00发布。</p></details>`);
 }
 m=path.match(/^\/lessons\/([\da-f-]+)$/);
 if(m&&uuid.test(m[1])){
 const l=await getLesson(m[1]);if(!l.published_at)error('此课时尚未发布');const ss=await q('SELECT * FROM submissions WHERE lesson_id=$1 ORDER BY submitted_at DESC',[l.id]);const latest=ss[0];const qs=await q('SELECT * FROM questions WHERE lesson_id=$1 ORDER BY created_at',[l.id]);
 const lessonList=withOutline(await q('SELECT id,number,title,stage,published_at,completed_at,history FROM lessons WHERE course_id=$1 ORDER BY number',[l.course_id]),l.config);
 let quiz='';
 if(!isComplete(l)&&!latest?.reviewed_at&&latest)quiz='<p class="notice">已提交，等待 Work 批改。</p>';
 else if(!isComplete(l)){quiz=`${formStart(`/lessons/${l.id}/submit` ).replace('<form ','<form data-quiz ')}<p class="progress" data-progress>答题进度</p>${l.quiz.map((x,i)=>`<fieldset><legend>${i+1}. ${esc(x.prompt)}</legend>${x.type==='single'?x.options.map((o,j)=>`<label class="option"><input type="radio" name="answer_${esc(x.id)}" value="${j}" required>${String.fromCharCode(65+j)}. ${esc(o)}</label>`).join(''):`<label>你的回答<textarea name="answer_${esc(x.id)}" rows="7" maxlength="30000" required></textarea></label>`}</fieldset>`).join('')}<p class="muted">全部作答后统一提交，提交前可修改。</p><button type="submit">提交全部答案</button></form>`;}
 const reviews=ss.map((s,i)=>`<details ${i===0?'open':''}><summary>第${ss.length-i}次提交 · ${time(s.submitted_at)} · ${s.reviewed_at?'已点评':'待批改'}</summary>${s.quiz_snapshot.map((x,n)=>{const r=s.review?.items.find(v=>v.id===x.id);return `<div class="panel"><strong>${n+1}. ${esc(x.prompt)}</strong><p>你的答案：${esc(x.type==='single'?x.options[s.answers[x.id]]:s.answers[x.id])}</p>${s.reviewed_at?`<p>得分：${r?.score} / ${x.points}</p>${x.type==='single'?`<p>正确答案：${esc(x.options[x.correct])}</p>${md(x.explanation||'')}`:''}${md(r?.feedback||'')}`:''}</div>`;}).join('')}${s.reviewed_at?`<h3>本期点评 · ${s.score} / 100</h3>${md(s.review.summary)}<h3>知识盲区</h3>${md(s.review.blindSpots)}<h3>改进建议</h3>${md(s.review.suggestions)}<p>${badge(s.passed?'本期已完成':'尚未满足完成条件，可重新作答')}</p>`:''}</details>`).join('');
 const doc=lessonDocument(l.content);let directoryStage='';
 const directory=lessonList.map(x=>{const group=x.stage!==directoryStage?`<p class="directory-stage">${esc(x.stage)}</p>`:'';directoryStage=x.stage;return group+(x.published_at?`<a class="directory-lesson ${x.id===l.id?'is-current':''}" ${x.id===l.id?'aria-current="page"':''} href="/lessons/${x.id}"><span class="directory-number">${String(x.number).padStart(2,'0')}</span><span>${esc(x.title)}<small>${isComplete(x)?'已完成':'学习中'}</small></span></a>`:`<div class="directory-lesson is-locked"><span class="directory-number">${String(x.number).padStart(2,'0')}</span><span>${esc(x.title)}<small>待发布</small></span></div>`);}).join('');
 return render(l.title,`<div class="lesson-workspace"><aside class="lesson-sidebar"><details class="directory-disclosure" open><summary>课程目录</summary><div class="directory-body"><a class="directory-course" href="/courses/${l.course_id}">${esc(l.course_title)}</a><nav class="lesson-directory-nav" aria-label="课程期次目录">${directory}</nav><div class="chapter-directory"><p class="directory-label">本期内容</p><nav aria-label="本期章节目录">${doc.headings.map(h=>`<a class="chapter-link ${h.level===3?'subchapter':''}" href="#${h.id}">${h.label}</a>`).join('')}<a class="chapter-link" href="#quiz">本期测验</a><a class="chapter-link" href="#questions">本期问答</a></nav></div><a class="directory-progress" href="/courses/${l.course_id}?tab=progress">查看学习进度 →</a></div></details></aside><div class="lesson-main"><div class="lesson-breadcrumb"><a href="/courses">课程中心</a><span>/</span><a href="/courses/${l.course_id}">${esc(l.course_title)}</a><span>/ 第${l.number}期</span></div><div class="reading lesson-paper"><div class="lesson-heading"><div class="lesson-meta"><span>第 ${String(l.number).padStart(2,'0')} 期</span><span>${esc(l.stage)}</span>${badge(status(l))}</div><h1>${esc(l.title)}</h1><div class="lesson-tools"><a href="#quiz">前往测验 ↓</a><a href="#questions">提出问题</a><a href="/manage/lessons/${l.id}/edit">编辑课时</a><a href="/manage/lessons/${l.id}/history">迁移历史记录</a></div></div><article class="lesson-article">${doc.html}</article><section id="quiz"><h2>本期测验</h2>${quiz}${historyReview(l)}${reviews}${isComplete(l)?`<p class="notice">本期完成于 ${completionTime(l)}。下一期最早发布：${time(l.next_release_at)}。</p>`:''}</section><section id="questions">${qs.length?`<h2>本期学习问答</h2>${qs.map(x=>`<div class="panel"><small>${time(x.created_at)}${x.parent_id?' · 追问':''}</small><h3>${esc(x.question)}</h3>${x.answer?md(x.answer):badge('待回答')}${x.answer?`<small>回答于 ${time(x.answered_at)}</small>`:''}</div>`).join('')}`:''}<h2>提出问题</h2>${formStart(`/lessons/${l.id}/questions`)}<label>关联追问<select name="parent_id"><option value="">新问题</option>${qs.map(x=>`<option value="${x.id}">${esc(x.question.slice(0,60))}</option>`).join('')}</select></label>${area('问题内容','question','',4)}<button>提交问题</button></form></section><div class="actions">${lessonList.filter(x=>x.published_at&&Math.abs(x.number-l.number)===1).map(x=>`<a class="button secondary" href="/lessons/${x.id}">${x.number<l.number?'上一期':'下一期'}：${esc(x.title)}</a>`).join('')}</div></div></div></div>`,{lesson:true});
 }
 if(path==='/quizzes'||path==='/questions')return redirect(res,'/courses');
 if(path==='/archive'){
 const cs=await q(courseQuery+' ORDER BY c.created_at');const rows=await q('SELECT l.*,c.title course_title FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL ORDER BY c.created_at,l.number');const events=await q('SELECT * FROM study_events ORDER BY created_at DESC LIMIT 100');
 return render('学习档案',`<h2>课程学习历史</h2>${courseRows(cs)||empty('尚无课程记录')}<h2>课时进度</h2><table><tr><th>课程 / 课时</th><th>发布</th><th>完成</th><th>状态</th></tr>${rows.map(l=>`<tr><td>${esc(l.course_title)}<br>第${l.number}期 ${esc(l.title)}</td><td>${publicationTime(l)}</td><td>${completionTime(l)}</td><td>${status(l)}</td></tr>`).join('')}</table><h2>最近100条执行记录</h2>${events.map(e=>`<div class="row"><div>${esc(eventName(e.action))}<br><small>${esc(e.operation_id)}</small></div><small>${time(e.created_at)}</small></div>`).join('')||empty('暂无执行记录')}`);
 }
 const deletion=path.match(/^\/manage\/courses\/([\da-f-]+)\/delete$/);
 if(deletion&&uuid.test(deletion[1])){
 const [c]=await q(courseQuery+' WHERE c.id=$1',[deletion[1]]);if(!c)error('课程不存在或已删除');
 const [counts]=await q('SELECT count(*)::int lessons FROM lessons WHERE course_id=$1',[c.id]);
 return render('删除课程',`<div class="panel deletion-panel"><h2>${esc(c.title)}</h2><p>删除后，本课程将从课程中心、首页和学习列表中移除，相关学习操作暂停。</p><p class="muted">已有 ${counts.lessons} 个课时。正文、答卷、问答及学习进度均会保留，可在教学管理的“已删除课程”中恢复。</p>${formStart(`/manage/courses/${c.id}/delete`)}<label>输入完整课程名称确认删除<input name="confirm_title" required autocomplete="off" placeholder="${esc(c.title)}"></label><div class="actions"><button class="danger" type="submit">确认删除课程</button><a href="/manage">取消</a></div></form></div>`);
 }
 if(path==='/manage'){
 const deleted=await q('SELECT id,title,deleted_at FROM courses WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
 const cs=await q(courseQuery+' ORDER BY c.created_at');const pending=await q('SELECT s.*,l.title,l.number,c.title course_title FROM submissions s JOIN lessons l ON l.id=s.lesson_id JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE s.reviewed_at IS NULL ORDER BY s.submitted_at');const questions=await q('SELECT q.*,l.title FROM questions q JOIN lessons l ON l.id=q.lesson_id JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE q.answered_at IS NULL ORDER BY q.created_at');const drafts=await q('SELECT l.*,c.title course_title FROM lessons l JOIN courses c ON c.id=l.course_id AND c.deleted_at IS NULL WHERE l.published_at IS NULL ORDER BY c.created_at,l.number');
 return render('Work 教学管理',`<p class="notice">定时无人值守浏览器仍待实测。所有提交在事务完成后保存，操作可在学习档案中追溯。</p><div class="stats"><div><strong>${pending.length}</strong><span>待批改答卷</span></div><div><strong>${questions.length}</strong><span>待回答问题</span></div><div><strong>${drafts.length}</strong><span>待发布课时</span></div></div><h2>待批改测验</h2>${pending.map(s=>`<div class="row"><div><small>${esc(s.course_title)}</small><h3>第${s.number}期 · ${esc(s.title)}</h3></div><a class="button" href="/manage/submissions/${s.id}">读取答卷与批改</a></div>`).join('')||empty('暂无待批改答卷')}<h2>待回答问题</h2>${questions.map(x=>`<div class="panel"><small>${esc(x.title)} · ${time(x.created_at)}</small><h3>${esc(x.question)}</h3><a href="/lessons/${x.lesson_id}#questions">查看课程及问答上下文</a>${formStart(`/manage/questions/${x.id}/answer`)}${area('完整回答（Markdown）','answer','',8)}<button>保存回答</button></form></div>`).join('')||empty('暂无待回答问题')}<h2>下一期待发布课程</h2>${drafts.map(l=>`<div class="row"><div><small>${esc(l.course_title)}</small><h3>第${l.number}期 · ${esc(l.title)}</h3><a href="/manage/lessons/${l.id}">预览草稿</a></div>${formStart(`/manage/lessons/${l.id}/publish`)}<button>校验条件并发布</button></form></div>`).join('')||empty('暂无课时草稿')}<details><summary>创建课程</summary>${formStart('/manage/courses')}${field('课程名称','title')}${field('课程类别','category')}${area('课程简介','description')}${area('课程目标与教学计划（Markdown）','goals')}${area('独立晋级配置（JSON）','config',JSON.stringify(sampleConfig,null,2),8)}<p class="muted">mode：completion为完成制，score为分数制。分数制设置passScore及sectionMinimums。totalLessons为课程总期数，releaseHour为北京时间发布小时。</p><button>创建课程</button></form></details><details><summary>创建单期课程草稿</summary>${formStart('/manage/lessons')}<label>所属课程<select name="course_id" required><option value="">请选择</option>${cs.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></label>${field('期数','number','1','number')}${field('所属阶段','stage')}${field('课时标题','title')}${area('完整教学正文（Markdown，自定义章节结构）','content','',18)}${area('测验题目（JSON）','quiz',JSON.stringify(sampleQuiz,null,2),15)}<p class="muted">支持single单选和text开放题；id须唯一，points总计100；section用于分项评分。single的correct为从0开始的选项编号。</p><button>保存草稿</button></form></details><h2>课程配置维护</h2>${cs.map(c=>`<p><a href="/manage/courses/${c.id}/edit">编辑 ${esc(c.title)} 的配置与教学计划</a><a class="delete-link" href="/manage/courses/${c.id}/delete">删除课程</a></p>`).join('')}<details class="deleted-courses"><summary>已删除课程（${deleted.length}）</summary>${deleted.map(c=>`<div class="row"><div><strong>${esc(c.title)}</strong><br><small>删除于 ${time(c.deleted_at)}</small></div>${formStart(`/manage/courses/${c.id}/restore`)}<button class="secondary">恢复课程</button></form></div>`).join('')||empty('暂无已删除课程')}</details><h2>全部课程进度</h2>${courseRows(cs)||empty('尚未创建课程')}<p><a href="/archive">查看完整执行记录</a> · <a href="/work-test">通信测试</a></p>`);
 }
 m=path.match(/^\/manage\/courses\/([\da-f-]+)\/edit$/);if(m&&uuid.test(m[1])){const [c]=await q('SELECT * FROM courses WHERE id=$1 AND deleted_at IS NULL',[m[1]]);if(!c)error('课程不存在');return render('维护课程配置',`${formStart(`/manage/courses/${c.id}/edit`)}${field('课程名称','title',c.title)}${field('课程类别','category',c.category)}${area('课程简介','description',c.description)}${area('目标与教学计划','goals',c.goals,14)}${area('晋级配置（JSON）','config',JSON.stringify(c.config,null,2),10)}<button>保存配置</button></form><p class="muted">调整晋级规则适用于后续提交，不重新计算已有完成记录。</p>`);}
 m=path.match(/^\/manage\/lessons\/([\da-f-]+)\/history$/);if(m&&uuid.test(m[1])){
 const l=await getLesson(m[1]);const subs=await q('SELECT id FROM submissions WHERE lesson_id=$1',[l.id]);
 return render('迁移历史学习记录',`<p>${esc(l.course_title)} / 第${l.number}期 · ${esc(l.title)}</p><p>仅导入已存在的历史答卷与原批改，不创建新的考试。日期只记录已知年月日，不补造时刻。服务器按课程规则核算分数和晋级。</p>${l.history||isComplete(l)||subs.length?'<p>已有学习记录，禁止覆盖或合并。</p>':`${formStart(`/manage/lessons/${l.id}/history`)}${field('原学习日期（北京时间，年月日）','date','','date')}${area('历史来源说明','source','',3)}${area('原始答案（JSON，单选选项从0开始）','answers','{}',8)}${area('原始逐题批改（JSON）','review',JSON.stringify({items:l.quiz.map(x=>({id:x.id,score:0,feedback:''})),summary:'',blindSpots:'',suggestions:''},null,2),18)}<button>保存历史答卷与进度</button></form>`}<a href="/lessons/${l.id}">返回课时</a>`);
 }
 m=path.match(/^\/manage\/lessons\/([\da-f-]+)\/edit$/);if(m&&uuid.test(m[1])){const l=await getLesson(m[1]);return render('维护课时内容',`${formStart(`/manage/lessons/${l.id}/edit`)}${field('课时标题','title',l.title)}${field('阶段','stage',l.stage)}${area('完整教学正文（Markdown）','content',l.content,24)}${area('测验配置（已发布题目须保持不变）','quiz',JSON.stringify(l.quiz,null,2),16)}<button>保存新版本</button></form><p>旧正文版本会保存，已有答卷使用原题目快照。</p>`);}
 m=path.match(/^\/manage\/lessons\/([\da-f-]+)$/);if(m&&uuid.test(m[1])){const l=await getLesson(m[1]);return render('课程草稿预览',`<p>${esc(l.course_title)} · 第${l.number}期 · ${badge(status(l))}</p><div class="reading"><h2>${esc(l.title)}</h2><article>${md(l.content)}</article><h2>测验配置（含标准答案）</h2><pre>${esc(JSON.stringify(l.quiz,null,2))}</pre></div><a href="/manage/lessons/${l.id}/edit">编辑草稿</a> · <a href="/manage">返回管理</a>`);}
 m=path.match(/^\/manage\/submissions\/([\da-f-]+)$/);if(m&&uuid.test(m[1])){
 const [s]=await q('SELECT * FROM submissions WHERE id=$1',[m[1]]);if(!s)error('答卷不存在');const l=await getLesson(s.lesson_id);const reviews={items:s.quiz_snapshot.map(x=>({id:x.id,score:0,feedback:'请填写逐题点评'})),summary:'请填写整体点评',blindSpots:'请填写知识盲区；如无则说明',suggestions:'请填写改进建议'};
 return render('读取与批改答卷',`<p>${esc(l.course_title)} / 第${l.number}期 · ${esc(l.title)}</p><p>提交时间：${time(s.submitted_at)}；课程规则：<code>${esc(JSON.stringify(s.config_snapshot||l.config))}</code></p><details><summary>查看完整课程正文</summary><article>${md(l.content)}</article></details><h2>完整题目、答案及评分标准</h2><pre>${esc(JSON.stringify({quiz:s.quiz_snapshot,answers:s.answers},null,2))}</pre>${s.reviewed_at?'<p>此答卷已批改。</p>':`${formStart(`/manage/submissions/${s.id}/review`)}${area('逐题点评与评分（JSON）','review',JSON.stringify(reviews,null,2),24)}<p class="muted">服务器根据题目分值及课程配置判断是否完成；不接受客户端直接指定晋级结果。</p><button>保存点评并更新进度</button></form>`}`);
 }
 return false;
}
function eventName(name){return ({course_deleted:'删除课程（可恢复）',course_restored:'恢复课程',course_updated:'更新课程配置',lesson_updated:'保存课时新版本',course_created:'创建课程',lesson_drafted:'保存课程草稿',lesson_published:'发布新一期课程',quiz_submitted:'提交测验',quiz_reviewed:'批改测验并更新进度',question_asked:'保存学习问题',question_answered:'保存课程回答',history_imported:'迁移历史答卷与批改'})[name]||name;}
