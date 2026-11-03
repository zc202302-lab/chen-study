import {test} from 'node:test';
import assert from 'node:assert/strict';
import {md,lessonDocument,layout} from '../ui.mjs';
test('illustrated lessons preserve safe media and build unique chapter anchors',()=>{
 const doc=lessonDocument('## 概念\n### 示例\n## 概念\n\n![系统结构](https://example.com/diagram.png "图1：系统结构")');
 assert.deepEqual(doc.headings.map(h=>[h.id,h.level,h.label]),[['chapter-1',2,'概念'],['chapter-2',3,'示例'],['chapter-3',2,'概念']]);
 assert.match(doc.html,/<figure><img[^>]+loading="lazy"[^>]*>/);
 assert.match(doc.html,/<figcaption>图1：系统结构<\/figcaption>/);
 assert.doesNotMatch(md('<img src="javascript:alert(1)" onerror="alert(1)"><script>alert(1)</script>'),/src="javascript:|onerror|<script/);
 const page=layout('课程','<h1>阅读标题</h1>',{lesson:true});
 assert.equal((page.match(/<h1>/g)||[]).length,1);
});

test('layered diagrams preserve ordered blocks, arrows and safe editable text',()=>{
 const content='## 技术体系\n\n```layers\n'+JSON.stringify({title:'五层技术体系',layers:[{title:'① 业务应用层',description:'智能问答、公文助手',tone:'blue'},{title:'② AI应用编排层',description:'RAG、Agent、工作流',tone:'blue'},{title:'③ 模型推理服务层',description:'vLLM、Ollama',tone:'purple'},{title:'④ 模型层',description:'语言模型、向量模型',tone:'purple'},{title:'⑤ 基础设施层',description:'GPU、CPU、内存',tone:'teal'}]})+'\n```\n\n## 下一章';
 const doc=lessonDocument(content);assert.equal(doc.headings.length,2);
 assert.equal((doc.html.match(/class="course-layer /g)||[]).length,5);
 assert.equal((doc.html.match(/class="layer-arrow"/g)||[]).length,4);
 assert.match(doc.html,/tone-purple/);assert.match(doc.html,/⑤ 基础设施层/);
 assert.ok(doc.html.indexOf('业务应用层')<doc.html.indexOf('基础设施层'));
 const malicious=md('```layers\n'+JSON.stringify({layers:[{title:'<script>alert(1)</script>',description:'<img src=x onerror=alert(1)>',tone:'blue" onclick="alert(1)'}]})+'\n```');
 assert.doesNotMatch(malicious,/<script|<img|onclick=/);assert.match(malicious,/&lt;script&gt;/);
 assert.match(md('```layers\n{invalid}\n```'),/结构图格式有误/);
 assert.match(md('```js\nconst x=1;\n```'),/language-js/);
});
