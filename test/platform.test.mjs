import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {platform} from '../platform.mjs';
import {nextRelease,validateReview,validateQuiz,validateAnswers} from '../rules.mjs';
import {md} from '../ui.mjs';
const quiz=[{id:'q1',type:'single',prompt:'组件是什么？',options:['可复用界面单元','数据库备份'],correct:0,points:50,section:'基础'},{id:'q2',type:'text',prompt:'举例说明',points:50,section:'实战'}];
const review={items:[{id:'q1',score:50,feedback:'正确'},{id:'q2',score:32,feedback:'补充具体需求'}],summary:'整体掌握',blindSpots:'边界仍需加强',suggestions:'结合实例复述'};
test('Beijing next-day release and independent promotion rules',()=>{
 assert.equal(nextRelease('2026-11-03T01:00:00Z').toISOString(),'2026-11-04T01:00:00.000Z');
 assert.equal(nextRelease('2026-11-03T16:01:00Z').toISOString(),'2026-11-05T01:00:00.000Z');
 assert.equal(validateReview(quiz,review,{mode:'score',passScore:80,sectionMinimums:{实战:30}}).passed,true);
 assert.equal(validateReview(quiz,review,{mode:'score',passScore:80,sectionMinimums:{实战:40}}).passed,false);
 assert.equal(validateReview(quiz,review,{mode:'completion',passScore:100}).passed,true);
 assert.throws(()=>validateAnswers(quiz,{q1:0,q2:'  '}));
 assert.throws(()=>validateQuiz([{...quiz[0],points:99}]));
 assert.doesNotMatch(md('<script>alert(1)</script>[link](javascript:alert(1))'),/<script|href="javascript/);
});
test('database-backed publish, submit, review, duplicate protection, questions, release gate',async(t)=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec(await readFile(new URL('../db/002-platform.sql',import.meta.url),'utf8'));
 // PGlite is single-process; production advisory lock is a no-op only in this test adapter.
 const query=async(sql,args)=>{if(sql.includes('pg_advisory_xact_lock'))return {rows:[],rowCount:1};const r=await db.query(sql,args);return {...r,rowCount:/^\s*SELECT/i.test(sql)?r.rows.length:(r.affectedRows??r.rows.length)};};
 const pool={query,connect:async()=>({query,release(){}})};
 async function request(path,method='GET',data={}){const f=new URLSearchParams({...data,csrf:'csrf',operation_id:data.operation_id||randomUUID()});let result={};await platform({req:{method,url:path},res:{},path:path.split('?')[0],pool,csrf:'csrf',send:(_r,status,body)=>{result={status,body};},redirect:(_r,url)=>{result={status:303,url};},form:async()=>f});return result;}
 const c=randomUUID(),l=randomUUID(),next=randomUUID();
 await query('INSERT INTO courses(id,title,category,description,goals,config) VALUES($1,$2,$3,$4,$5,$6)',[c,'测试课程','测试','简介','目标',{mode:'completion',totalLessons:2,releaseHour:9}]);
 for(const [id,n] of [[l,1],[next,2]])await query('INSERT INTO lessons(id,course_id,number,stage,title,content,quiz) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,c,n,'阶段一','测试期数','## 知识内容\n这是正文',JSON.stringify(quiz)]);
 await assert.rejects(()=>request(`/manage/lessons/${next}/publish`,'POST'),/上一期/);
 await request(`/manage/lessons/${l}/publish`,'POST');
 const before=(await request(`/lessons/${l}`)).body;assert.match(before,/组件是什么/);assert.doesNotMatch(before,/正确答案/);
 await assert.rejects(()=>request(`/lessons/${l}/submit`,'POST',{answer_q1:'0'}),/完整作答/);
 const op=randomUUID();await request(`/lessons/${l}/submit`,'POST',{answer_q1:'0',answer_q2:'页面组件',operation_id:op});
 await request(`/lessons/${l}/submit`,'POST',{answer_q1:'0',answer_q2:'页面组件',operation_id:op});
 const {rows:subs}=await query('SELECT * FROM submissions');assert.equal(subs.length,1);assert.equal(subs[0].quiz_snapshot.length,2);
 await request(`/manage/courses/${c}/edit`,'POST',{title:'测试课程',category:'测试',description:'简介',goals:'更新教学计划',config:JSON.stringify({mode:'score',totalLessons:2,releaseHour:9,passScore:100})});
 await request(`/manage/submissions/${subs[0].id}/review`,'POST',{review:JSON.stringify(review)});
 const {rows:[completed]}=await query('SELECT * FROM lessons WHERE id=$1',[l]);assert.ok(completed.completed_at);assert.equal(new Date(completed.next_release_at).toISOString(),nextRelease(completed.completed_at).toISOString());
 await assert.rejects(()=>request(`/manage/lessons/${next}/publish`,'POST'),/发布时点/);
 const after=(await request(`/lessons/${l}`)).body;assert.match(after,/正确答案/);assert.match(after,/整体掌握/);
 await request(`/lessons/${l}/questions`,'POST',{question:'请解释组件边界'});
 const {rows:[question]}=await query('SELECT * FROM questions');
 await request(`/manage/questions/${question.id}/answer`,'POST',{answer:'组件应围绕职责划分。'});
 await request(`/lessons/${l}/questions`,'POST',{question:'能再举例吗',parent_id:question.id});
 assert.equal((await query('SELECT * FROM questions')).rows.length,2);
 for(const path of ['/','/courses','/archive','/manage',`/courses/${c}`,`/courses/${c}?tab=quiz`,`/courses/${c}?tab=questions`,`/courses/${c}?tab=progress`,`/manage/lessons/${l}`,`/manage/submissions/${subs[0].id}`])assert.equal((await request(path)).status,200,path);
 await request(`/manage/lessons/${l}/edit`,'POST',{stage:'阶段一',title:'测试期数修订',content:'更新正文',quiz:JSON.stringify(quiz)});
 assert.equal((await query('SELECT * FROM lesson_versions')).rows.length,1);
 await assert.rejects(()=>request(`/manage/lessons/${l}/edit`,'POST',{stage:'阶段一',title:'测试',content:'正文',quiz:JSON.stringify([{...quiz[0],correct:1},quiz[1]])}),/不可更改/);
 assert.equal((await query('SELECT * FROM study_events')).rows.length,8);
 assert.equal((await request('/quizzes')).url,'/courses');
 assert.equal((await request('/questions')).url,'/courses');
 const home=(await request('/')).body;assert.doesNotMatch(home,/<a href="\/quizzes">/);
 const other=randomUUID();await query('INSERT INTO courses(id,title,category,description,goals,config) VALUES($1,$2,$3,$4,$5,$6)',[other,'其他课程','测试','简介','目标',{mode:'completion',totalLessons:1,releaseHour:9}]);
 assert.doesNotMatch((await request(`/courses/${other}?tab=questions`)).body,/请解释组件边界/);
 assert.doesNotMatch((await request(`/courses/${other}?tab=quiz`)).body,/测试期数/);

});
