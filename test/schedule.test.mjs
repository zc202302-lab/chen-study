import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSchedule,nextSlot,scheduleText,scheduleOf,scheduleFields} from '../schedule.mjs';
test('Beijing push and catch-up settings validate minute precision and next day slots',()=>{
const schedule=validateSchedule({pushTime:'09:15',reviewTime:'10:30',mode:'progress'});
assert.equal(schedule.timezone,'Asia/Shanghai');
assert.equal(nextSlot('2026-11-08T23:50:00+08:00',schedule.pushTime).toISOString(),'2026-11-09T01:15:00.000Z');
assert.throws(()=>validateSchedule({...schedule,reviewTime:'09:00'}));
assert.throws(()=>validateSchedule({...schedule,pushTime:'25:00'}));
assert.match(scheduleText({schedule}),/已发布则跳过/);
assert.match(scheduleText({schedule:{...schedule,mode:'daily'}}),/不受测验进度限制/);
});

test('grading runs before push, legacy schedules receive an earlier default',()=>{
 assert.equal(scheduleOf().gradingTime,'08:00');
 const legacy={schedule:{pushTime:'09:15',reviewTime:'10:30',mode:'progress'}};
 assert.equal(scheduleOf(legacy).gradingTime,'08:15');
 assert.equal(legacy.schedule.gradingTime,undefined);
 const s=validateSchedule({...legacy.schedule,gradingTime:'07:45'});
 assert.equal(s.gradingTime,'07:45');
 for(const gradingTime of ['09:15','09:30','bad','25:00'])assert.throws(()=>validateSchedule({...s,gradingTime}),/批改时间/);
 assert.match(scheduleFields({schedule:s}),/name="gradingTime" value="07:45"/);
 assert.match(scheduleText({schedule:s}),/07:45批改/);
 assert.match(scheduleText({schedule:s}),/复查时重新检查条件/);
});
