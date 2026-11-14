const timePattern=/^([01]\d|2[0-3]):[0-5]\d$/;
function beforePush(pushTime){const [h,m]=pushTime.split(':').map(Number),n=Math.max(0,h*60+m-60);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
export function scheduleOf(config={}){
 const s=config.schedule||{pushTime:String(config.releaseHour??9).padStart(2,'0')+':00',reviewTime:'10:00',mode:'progress'};
 return {...s,gradingTime:s.gradingTime||beforePush(s.pushTime),timezone:'Asia/Shanghai'};
}
export function validateSchedule(s){
 if(!s||!['daily','progress'].includes(s.mode)||![s.pushTime,s.reviewTime].every(x=>timePattern.test(x))||s.reviewTime<=s.pushTime)throw Error('请选择推送规则，并设置有效时间；复查时间须晚于推送时间（北京时间）');
 const normalized=scheduleOf({schedule:s});
 if(!timePattern.test(normalized.gradingTime)||normalized.gradingTime>=s.pushTime)throw Error('批改时间须早于推送时间（北京时间），请预留足够批改时间');
 return normalized;
}
export function nextSlot(date,time){const d=new Date(new Date(date).getTime()+8*3600000),[h,m]=time.split(':').map(Number);return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1,h-8,m));}
export function scheduleText(c){const s=scheduleOf(c);return `北京时间${s.gradingTime}批改，${s.pushTime}推送，${s.reviewTime}复查补漏；${s.mode==='daily'?'每天推送，不受测验进度限制':'进度推送：完成一期测验后，最早次日推送下一期'}。批改任务提前读取待批改答卷并保存点评；推送任务重新读取最新结果。若批改延迟，复查时重新检查条件，补发当天应推送但未发布的期次，已发布则跳过，不重复发布。`;}
export function scheduleFields(c={}){const s=scheduleOf(c);return `<fieldset><legend>推送设置（北京时间）</legend><label>批改时间<input type="time" name="gradingTime" value="${s.gradingTime}" required></label><label>推送时间<input type="time" name="pushTime" value="${s.pushTime}" required></label><label>复查时间<input type="time" name="reviewTime" value="${s.reviewTime}" required></label><label>推送规则<select name="pushMode"><option value="daily" ${s.mode==='daily'?'selected':''}>每天推送</option><option value="progress" ${s.mode==='progress'?'selected':''}>进度推送</option></select></label><p class="muted">批改时间须早于推送时间，建议至少预留60分钟。复查用于补发应推送但遗漏的课程，不重复发布；批改延迟时会重新检查推送条件。进度推送须先完成上一期测验。</p><p class="muted">保存后，请让 Work 同步已有批改、推送和复查任务；网站设置不会自动修改外部定时任务。</p></fieldset>`;}
