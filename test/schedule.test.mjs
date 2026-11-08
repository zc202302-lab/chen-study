import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSchedule,nextSlot,scheduleText} from '../schedule.mjs';
test('Beijing push and catch-up settings validate minute precision and next day slots',()=>{
const schedule=validateSchedule({pushTime:'09:15',reviewTime:'10:30',mode:'progress'});
assert.equal(schedule.timezone,'Asia/Shanghai');
assert.equal(nextSlot('2026-11-08T23:50:00+08:00',schedule.pushTime).toISOString(),'2026-11-09T01:15:00.000Z');
assert.throws(()=>validateSchedule({...schedule,reviewTime:'09:00'}));
assert.throws(()=>validateSchedule({...schedule,pushTime:'25:00'}));
assert.match(scheduleText({schedule}),/已发布则跳过/);
assert.match(scheduleText({schedule:{...schedule,mode:'daily'}}),/不受测验进度限制/);
});
