import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const password=randomBytes(16).toString('hex');
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,ADMIN_PASSWORD:password,ADMIN_PASSWORD_B64:'',SESSION_SECRET:randomBytes(32).toString('hex'),APP_ORIGIN:'http://127.0.0.1:3000'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
try{
 let ready=false;for(let i=0;i<80;i++){try{ready=(await fetch('http://127.0.0.1:3000/healthz')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,150));}
 assert.ok(ready,'server did not become ready: '+logs);
 const login=await fetch('http://127.0.0.1:3000/login',{method:'POST',redirect:'manual',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password})});
 assert.equal(login.status,303);assert.equal(login.headers.get('location'),'/');const cookie=login.headers.get('set-cookie').split(';')[0];
 for(const path of ['/','/courses','/questions','/quizzes','/archive','/manage','/work-test','/assets/style.css','/assets/study.js']){const r=await fetch('http://127.0.0.1:3000'+path,{headers:{Cookie:cookie},redirect:'manual'});assert.equal(r.status,200,path);}
 const forbidden=await fetch('http://127.0.0.1:3000/manage/courses',{method:'POST',headers:{Origin:'http://untrusted.invalid',Cookie:cookie},body:''});assert.equal(forbidden.status,403);
 console.log('Real PostgreSQL HTTP/auth/static/page smoke checks passed');
}finally{child.kill('SIGTERM');}
