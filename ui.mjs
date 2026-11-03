import {marked} from 'marked';
import sanitize from 'sanitize-html';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const md=s=>sanitize(marked.parse(s||''),{allowedTags:sanitize.defaults.allowedTags.concat(['h1','h2','img']),allowedAttributes:{...sanitize.defaults.allowedAttributes,img:['src','alt'],code:['class']},allowedSchemes:['https'],allowProtocolRelative:false});
export const time=d=>d?new Date(d).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
export const badge=s=>`<span class="badge">${esc(s)}</span>`;
export function layout(title,body){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Chen Study</title><link rel="stylesheet" href="/assets/style.css"><script src="/assets/study.js" defer></script></head><body><header><a class="brand" href="/">Chen<span>Study</span></a><nav aria-label="主导航"><a href="/">学习首页</a><a href="/courses">课程中心</a><a href="/quizzes">测验</a><a href="/questions">问答</a><a href="/archive">学习档案</a><a href="/manage">教学管理</a></nav></header><main><div class="eyebrow">个人学习空间 · 持续积累</div><h1>${esc(title)}</h1>${body}</main><footer>Chen Study · 学习内容与记录保存在你的服务器 · 北京时间</footer></body></html>`;}
export const hidden=(csrf,operation)=>`<input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="operation_id" value="${operation}">`;
export const field=(label,name,value='',type='text')=>`<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" required></label>`;
export const area=(label,name,value='',rows=5)=>`<label>${esc(label)}<textarea name="${name}" rows="${rows}" required>${esc(value)}</textarea></label>`;
