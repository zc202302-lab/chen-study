import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,ADMIN_PASSWORD:'',ADMIN_PASSWORD_B64:'',SESSION_SECRET:randomBytes(32).toString('hex'),APP_ORIGIN:'http://127.0.0.1:3000',APP_REVISION:'a'.repeat(40)},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
try{
 let ready=false;for(let i=0;i<80;i++){try{ready=(await fetch('http://127.0.0.1:3000/healthz')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,150));}
 assert.ok(ready,'server did not become ready: '+logs);
 for(const path of ['/sync','/sync.md']){
 const response=await fetch('http://127.0.0.1:3000'+path,{redirect:'manual'});
 assert.equal(response.status,200,'public guide: '+path);
 const text=await response.text();assert.match(text,/课程同步说明/);assert.match(text,/不授权删除/);
 assert.match(response.headers.get('content-type'),path.endsWith('.md')?/text\/plain/:/text\/html/);
 }
 const openPage=await fetch('http://127.0.0.1:3000/manage',{redirect:'manual'});
 assert.equal(openPage.status,200);const cookie=openPage.headers.get('set-cookie').split(';')[0];
 assert.match(cookie,/^study_nonce=/);
 assert.equal(await (await fetch('http://127.0.0.1:3000/version')).text(),'a'.repeat(40));
 for(const path of ['/','/courses','/archive','/manage','/courses/new','/work-queue','/work-test','/assets/style.css','/assets/study.js']){const r=await fetch('http://127.0.0.1:3000'+path,{redirect:'manual'});assert.equal(r.status,200,path);}
 for(const path of ['/quizzes','/questions']){const r=await fetch('http://127.0.0.1:3000'+path,{headers:{Cookie:cookie},redirect:'manual'});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/courses');}
 const oldLogin=await fetch('http://127.0.0.1:3000/login',{redirect:'manual'});assert.equal(oldLogin.status,303);assert.equal(oldLogin.headers.get('location'),'/');
 const page=await (await fetch('http://127.0.0.1:3000/work-test',{headers:{Cookie:cookie}})).text();
 const csrf=page.match(/name="csrf" value="([^"]+)"/)[1];
 const op=page.match(/name="operation_id" value="([^"]+)"/)[1];
 const submit=(csrfValue,cookieValue)=>fetch('http://127.0.0.1:3000/work-test/complete',{method:'POST',redirect:'manual',headers:{Origin:'http://127.0.0.1:3000',Cookie:cookieValue},body:new URLSearchParams({csrf:csrfValue,operation_id:op})});
 assert.equal((await submit('invalid',cookie)).status,400);
 assert.equal((await submit(csrf,'')).status,400);
 assert.equal((await submit(csrf,cookie)).status,303);
 assert.equal((await submit(csrf,cookie)).status,303);
 const forbidden=await fetch('http://127.0.0.1:3000/manage/courses',{method:'POST',headers:{Origin:'http://untrusted.invalid',Cookie:cookie},body:''});assert.equal(forbidden.status,403);
 console.log('Real PostgreSQL HTTP/open-access/CSRF/static/page smoke checks passed');
}finally{child.kill('SIGTERM');}
