import {marked} from 'marked';
import sanitize from 'sanitize-html';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Declarative course diagrams render on the server without executable HTML or scripts.
marked.use({extensions:[{name:'layers',level:'block',start(src){return src.indexOf('```layers');},tokenizer(src){
 const match=/^```layers[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/.exec(src);
 if(match)return {type:'layers',raw:match[0],text:match[1]};
},renderer(token){
 try{
 const data=JSON.parse(token.text);
 if(!Array.isArray(data.layers)||data.layers.length<1||data.layers.length>30)throw Error('invalid layers');
 if(data.title!==undefined&&typeof data.title!=='string')throw Error('invalid title');
 const tones=['blue','purple','teal','gray'];
 const layers=data.layers.map((x,i)=>{
 if(!x||typeof x.title!=='string'||!x.title.trim()||(x.description!==undefined&&typeof x.description!=='string'))throw Error('invalid layer');
 const tone=tones.includes(x.tone)?x.tone:tones[Math.min(i,tones.length-1)];
 return `<div class="course-layer tone-${tone}"><strong>${esc(x.title)}</strong>${x.description?`<p>${esc(x.description)}</p>`:''}</div>${i<data.layers.length-1?'<div class="layer-arrow" aria-hidden="true">↓</div>':''}`;
 }).join('');
 return `<figure class="course-layers" aria-label="${esc(data.title||'分层结构图')}">${data.title?`<figcaption>${esc(data.title)}</figcaption>`:''}${layers}</figure>`;
 }catch{return `<pre><code class="language-layers">${esc(token.text)}</code></pre><p class="diagram-error">结构图格式有误，请检查 layers 数据。</p>`;}
}}]});
export const diagramHelp=`<details class="diagram-help"><summary>插入分层结构图</summary><p class="muted">在正文中使用 layers 代码块。每层支持标题、说明和配色，网站保留上下层级与箭头，手机端自动换行。可使用 blue、purple、teal、gray 配色。</p><pre>\`\`\`layers
{
  "title": "系统分层结构",
  "layers": [
    {"title": "① 业务应用层", "description": "智能问答、公文助手", "tone": "blue"},
    {"title": "② 模型服务层", "description": "推理服务与模型", "tone": "purple"},
    {"title": "③ 基础设施层", "description": "GPU、内存、存储、网络", "tone": "teal"}
  ]
}
\`\`\`</pre></details>`;
export const md=s=>sanitize(marked.parse(s||''),{allowedTags:sanitize.defaults.allowedTags.concat(['h1','h2','img','figure','figcaption']),allowedClasses:{figure:['course-layers'],div:['course-layer','layer-arrow','tone-blue','tone-purple','tone-teal','tone-gray'],p:['diagram-error']},allowedAttributes:{...sanitize.defaults.allowedAttributes,img:['src','alt','title','loading','decoding'],code:['class'],figure:['class','aria-label'],div:['class'],p:['class']},allowedSchemes:['https'],allowProtocolRelative:false,transformTags:{img:(_tag,attrs)=>({tagName:'img',attribs:{...attrs,loading:'lazy',decoding:'async'}})}}).replace(/<p>(<img [^>]*>)<\/p>/g,(_match,img)=>{const caption=img.match(/title="([^"]*)"/);return `<figure>${img}${caption?`<figcaption>${caption[1]}</figcaption>`:''}</figure>`;}).replace(/<table>/g,'<div class="table-scroll"><table>').replace(/<\/table>/g,'</table></div>');
export function lessonDocument(content){const headings=[];let index=0;const html=md(content).replace(/<h([23])>([\s\S]*?)<\/h\1>/g,(_match,level,label)=>{const id=`chapter-${++index}`;headings.push({id,level:Number(level),label:label.replace(/<[^>]*>/g,'')});return `<h${level} id="${id}">${label}</h${level}>`;});return {html,headings};}

export const time=d=>d?new Date(d).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
export const badge=s=>`<span class="badge">${esc(s)}</span>`;
export function layout(title,body,options={}){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Chen Study</title><link rel="stylesheet" href="/assets/style.css"><script src="/assets/study.js" defer></script></head><body class="${options.lesson?'lesson-page':''}"><header><a class="brand" href="/">Chen<span>Study</span></a><nav aria-label="主导航"><a href="/">学习首页</a><a href="/courses">课程中心</a><a href="/archive">学习档案</a><a href="/manage">教学管理</a></nav></header><main>${options.lesson?'':`<h1>${esc(title)}</h1>`}${body}</main><footer>Chen Study · <a href="/sync">课程同步说明</a></footer></body></html>`;}
export const hidden=(csrf,operation)=>`<input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="operation_id" value="${operation}">`;
export const field=(label,name,value='',type='text')=>`<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" required></label>`;
export const area=(label,name,value='',rows=5)=>`<label>${esc(label)}<textarea name="${name}" rows="${rows}" required>${esc(value)}</textarea></label>`;

export function loginPage(failed=false){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录 · Chen Study</title><link rel="stylesheet" href="/assets/style.css"></head><body class="login-page"><div class="login-shell"><section class="login-story"><a class="brand" href="/">Chen<span>Study</span></a><div class="story-body"><div class="eyebrow">你的个人课程学习空间</div><h1>让学习有方向，<br>让知识有积累。</h1><p>从一门课程开始，将理解、练习和思考<br>串成一条持续前进的学习路径。</p><div class="story-steps"><div><span>01</span><p><strong>系统学习</strong><br>清晰的目标与课程路径</p></div><div><span>02</span><p><strong>练习与反馈</strong><br>在每一期中巩固理解</p></div><div><span>03</span><p><strong>长期积累</strong><br>留存笔记、问答与进步</p></div></div></div><small>一步一步，把知识变成自己的能力。</small></section><section class="login-form-panel"><div class="login-form-inner"><span class="login-kicker">WELCOME BACK</span><h2>欢迎回来</h2><p class="muted">登录 Chen Study，继续你的学习旅程。</p>${failed?'<p class="notice error" role="alert">密码不正确，请重新输入。</p>':''}<form method="post" action="/login"><label for="study-password">访问密码</label><input id="study-password" name="password" type="password" autocomplete="current-password" placeholder="输入你的访问密码" required><button type="submit">进入学习空间 <span aria-hidden="true">→</span></button></form><p class="login-note">专注于你的课程、练习与每一次进步。</p></div><small class="login-bottom">CHEN STUDY / PERSONAL LEARNING</small></section></div></body></html>`;}
