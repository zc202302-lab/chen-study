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
