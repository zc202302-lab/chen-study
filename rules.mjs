import {validateSchedule} from './schedule.mjs';
export function nextRelease(completedAt,hour=9){
 const date=new Date(completedAt);const beijing=new Date(date.getTime()+8*3600000);
 return new Date(Date.UTC(beijing.getUTCFullYear(),beijing.getUTCMonth(),beijing.getUTCDate()+1,hour-8));
}
export function validateConfig(c){
 if(!c||!['completion','score'].includes(c.mode))throw Error('晋级模式必须为 completion 或 score');
 if(!Number.isInteger(c.totalLessons)||c.totalLessons<1||c.totalLessons>10000)throw Error('总期数须为1至10000');
 if(c.mode==='score'&&(!Number.isFinite(c.passScore)||c.passScore<0||c.passScore>100))throw Error('及格分数须为0至100');
 if(!Number.isInteger(c.releaseHour)||c.releaseHour<0||c.releaseHour>23)throw Error('发布时间须为0至23点（北京时间）');
 if(c.sectionMinimums!==undefined&&(!c.sectionMinimums||typeof c.sectionMinimums!=='object'||Array.isArray(c.sectionMinimums)||Object.values(c.sectionMinimums).some(n=>!Number.isFinite(n)||n<0||n>100)))throw Error('分项最低分配置无效');
 if(c.schedule!==undefined)validateSchedule(c.schedule);
 if(c.outline!==undefined){
 if(!Array.isArray(c.outline)||c.outline.length>c.totalLessons)throw Error('教学目录须为期次列表');
 const ids=new Set();for(const x of c.outline){if(!x||!Number.isInteger(x.number)||x.number<1||x.number>c.totalLessons||ids.has(x.number)||typeof x.title!=='string'||!x.title.trim()||typeof x.stage!=='string')throw Error('目录编号、标题或阶段无效');ids.add(x.number);}
 }
 return c;
}
export function validateQuiz(q){
 if(!Array.isArray(q)||q.length<1||q.length>100)throw Error('测验必须包含1至100道题');
 const ids=new Set();for(const x of q){
 if(!x||typeof x.id!=='string'||!(/^[A-Za-z0-9_-]+$/.test(x.id))||ids.has(x.id)||!['single','text'].includes(x.type)||typeof x.prompt!=='string'||!x.prompt.trim())throw Error('题目编号须唯一，类型为single或text，题干不能为空');
 ids.add(x.id);
 if(!Number.isFinite(x.points)||x.points<=0)throw Error('每题须设置正数分值points');
 if(x.type==='single'&&(!Array.isArray(x.options)||x.options.length<2||x.options.some(o=>typeof o!=='string')||!Number.isInteger(x.correct)||x.correct<0||x.correct>=x.options.length))throw Error('单选题选项或正确答案无效');
 }
 const sum=q.reduce((s,x)=>s+x.points,0);if(Math.abs(sum-100)>0.01)throw Error('题目分值合计必须为100');return q;
}
export function validateAnswers(quiz,answers){
 for(const q of quiz){const a=answers[q.id];if(q.type==='single'?(!Number.isInteger(a)||a<0||a>=q.options.length):(typeof a!=='string'||!a.trim()||a.length>30000))throw Error('请完整作答全部题目');}return answers;
}
export function validateReview(quiz,review,config){
 if(!review||!Array.isArray(review.items)||review.items.length!==quiz.length)throw Error('必须逐题提交点评');
 let score=0;const sections={};
 for(const q of quiz){const matches=review.items.filter(x=>x.id===q.id);const r=matches[0];if(matches.length!==1||typeof r.feedback!=='string'||!r.feedback.trim()||!Number.isFinite(r.score)||r.score<0||r.score>q.points)throw Error('逐题点评或得分不完整');score+=r.score;const section=q.section||'默认';sections[section]=(sections[section]||0)+r.score;}
 for(const k of ['summary','blindSpots','suggestions'])if(typeof review[k]!=='string'||!review[k].trim())throw Error('请完整填写总结、知识盲区和改进建议');
 const passed=config.mode==='completion'||(score>=config.passScore&&Object.entries(config.sectionMinimums||{}).every(([s,min])=>(sections[s]||0)>=min));
 return {score,passed,sections};
}
