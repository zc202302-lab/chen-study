import http from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {equal,sign,validSession} from './security.mjs';
const {ADMIN_PASSWORD,SESSION_SECRET,APP_ORIGIN='https://study.ziboxiaozhushou.cn'}=process.env;
if(!ADMIN_PASSWORD||ADMIN_PASSWORD.length<16||!SESSION_SECRET||SESSION_SECRET.length<32)throw Error('Missing secure configuration');
const pool=new pg.Pool({max:4,connectionTimeoutMillis:5000,statement_timeout:8000});
pool.on('error',()=>console.error('database_pool_error'));
await pool.query(await readFile(new URL('./db/001-probe.sql',import.meta.url),'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(title,body)=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Chen Study</title><style>body{margin:0;background:#f5f6f8;color:#182332;font:17px/1.8 system-ui,sans-serif}main{max-width:800px;margin:48px auto;padding:28px;background:white}h1{font-size:27px}h2{font-size:21px}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #ddd;padding:10px}input,button{font:inherit;padding:10px;max-width:100%;box-sizing:border-box}button{background:#245b88;color:white;border:0;cursor:pointer}label{display:block}small{color:#546375}a{color:#245b88}@media(max-width:600px){main{margin:0;padding:20px}table{font-size:14px}}</style><main><small>CHEN STUDY / 阶段1通信验证</small><h1>${title}</h1>${body}</main></html>`;
function send(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",...headers});res.end(body);}
function redirect(res,path,headers={}){send(res,303,'',{Location:path,...headers});}
async function form(req){let text='';for await(const part of req){text+=part;if(Buffer.byteLength(text)>8192)throw Error('body_limit');}return new URLSearchParams(text);}
const attempts=new Map();
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 try{
 if(path==='/healthz'&&req.method==='GET'){await pool.query('SELECT 1');return send(res,200,'ok');}
 if(req.method==='GET'&&path==='/')return redirect(res,'/work-test');
 if(req.method==='GET'&&path==='/login')return send(res,200,page('管理登录','<p>仅包含虚构测试数据。请使用服务器上设置的测试管理密码。</p><form method="post" action="/login"><label>管理密码<input name="password" type="password" autocomplete="current-password" required></label><button>登录</button></form>'));
 if(req.method==='POST'&&req.headers.origin!==APP_ORIGIN)return send(res,403,'来源校验失败');
 if(path==='/login'&&req.method==='POST'){
 const address=req.socket.remoteAddress,now=Date.now();let a=attempts.get(address);
 if(!a||now-a.start>600000){a={start:now,count:0};attempts.set(address,a);}
 if(++a.count>20)return send(res,429,'尝试过多，请十分钟后再试');
 const f=await form(req);if(!equal(f.get('password'),ADMIN_PASSWORD))return send(res,401,page('登录失败','<a href="/login">重新登录</a>'));
 attempts.delete(address);const raw=`${Date.now()+7*86400000}.${randomBytes(16).toString('hex')}`;
 return redirect(res,'/work-test',{'Set-Cookie':`study_session=${raw}.${sign(raw,SESSION_SECRET)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`});
 }
 const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('study_session='))?.slice(14);
 if(!validSession(token,SESSION_SECRET))return redirect(res,'/login');
 if(path==='/work-test'&&req.method==='GET'){
 const {rows:[c]}=await pool.query("SELECT * FROM work_probe WHERE id='work-test-001'");
 const {rows:runs}=await pool.query('SELECT * FROM probe_runs ORDER BY created_at DESC LIMIT 12');
 const csrf=sign(token,SESSION_SECRET),op=randomUUID();
 return send(res,200,page('Work 通信测试',`<p>测试课程，不关联正式课程。状态由 PostgreSQL 实时读取。</p><table><tbody>${Object.entries({'课程编号':c.id,'课程名称':c.title,'当前期数':c.lesson,'当前状态':c.status,'记录版本':c.version,'下一期是否解锁':c.status==='completed'?'是（测试标记）':'否','更新时间':c.updated_at.toISOString()}).map(([k,v])=>`<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table><h2>执行测试</h2><form method="post" action="/work-test/complete"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="operation_id" value="${op}"><button>将测试状态设为 completed 并记录本次执行</button></form><p><a href="/work-test">刷新数据库记录</a></p><h2>最近执行记录</h2>${runs.map(r=>`<p><strong>${esc(r.outcome)}</strong> · ${esc(r.created_at.toISOString())}<br>操作编号：${esc(r.operation_id)}<br>${esc(r.previous_status)} → ${esc(r.new_status)}，版本 ${r.record_version}</p>`).join('')||'<p>暂无执行记录</p>'}<small>页面显示成功仍需服务器SQL独立核验；定时浏览器能力尚未通过验收。</small>`));
 }
 if(path==='/work-test/complete'&&req.method==='POST'){
 const f=await form(req),op=f.get('operation_id');
 if(!equal(f.get('csrf'),sign(token,SESSION_SECRET))||!/^[a-f0-9-]{36}$/.test(op||''))return send(res,400,'提交校验失败');
 const client=await pool.connect();try{
 await client.query('BEGIN');
 const {rows:[c]}=await client.query("SELECT * FROM work_probe WHERE id='work-test-001' FOR UPDATE");
 const old=await client.query('SELECT 1 FROM probe_runs WHERE operation_id=$1',[op]);
 if(!old.rowCount){
 const changed=c.status!=='completed';
 const version=c.version+(changed?1:0);
 if(changed)await client.query("UPDATE work_probe SET status='completed',version=$1,updated_at=now() WHERE id=$2",[version,c.id]);
 await client.query('INSERT INTO probe_runs(operation_id,course_id,previous_status,new_status,record_version,outcome) VALUES($1,$2,$3,$4,$5,$6)',[op,c.id,c.status,'completed',version,changed?'updated':'already_completed']);
 }
 await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 return redirect(res,'/work-test');
 }
 send(res,404,'Not Found');
 }catch(e){console.error(JSON.stringify({event:'request_failed',path,code:e.code||'internal_error'}));send(res,503,page('操作未确认成功','<p>服务器处理失败，请检查应用日志及数据库。不要把本次操作视为成功。</p>'));}
});
server.requestTimeout=15000;server.listen(3000,'0.0.0.0');
process.on('SIGTERM',()=>server.close(async()=>{await pool.end();process.exit(0);}));
