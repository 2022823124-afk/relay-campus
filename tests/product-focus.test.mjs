import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFocus,getFocusOptions} from '../src/focusGuide.js';
const item={id:'1',name:'二手耳机',category:'数码装备',price:120,condition:'八成新',description:'功能正常，耳垫有使用痕迹。不含充电线，电池续航未知。'};
test('preserves negative and uncertain statements verbatim',()=>{
 const s=buildFocus(item,'function');
 assert.ok(s.facts.some(f=>f.value==='不含充电线，电池续航未知。'));
 assert.ok(s.questions.some(q=>q.includes('电池')));
 assert.ok(!s.facts.some(f=>f.value.includes('电池正常')));
});
test('missing cleaning information is not inferred from condition',()=>{
 const s=buildFocus(item,'clean');
 assert.deepEqual(s.facts,[]);assert.deepEqual(s.missing,['清洁情况','污渍与异味']);
 assert.ok(s.message.includes('清洁'));
});
test('clearly stated facets are not asked again',()=>{
 const s=buildFocus({...item,description:'已经清洗过，未发现污渍或异味。'},'clean');
 assert.deepEqual(s.missing,[]);assert.equal(s.facts.length,1);
 assert.match(s.questions[0],/还有需要特别提醒/);
});
test('free gifts have zero cost but no bargaining question',()=>{
 const s=buildFocus({...item,price:0},'price');
 assert.equal(s.facts[0].value,'免费接力 · 物品费用为 ¥0');
 assert.ok(!s.message.includes('报价还能商量'));assert.ok(s.message.includes('额外费用'));
});
test('invalid stored preferences fall back and options fit the category',()=>{
 assert.equal(buildFocus(item,'edition').key,'price');
 assert.ok(getFocusOptions(item).some(([key])=>key==='function'));
 assert.ok(getFocusOptions({name:'英文诗集',category:'书籍文具'}).some(([key])=>key==='edition'));
 assert.ok(!getFocusOptions({name:'铅笔',category:'书籍文具'}).some(([key])=>key==='edition'));
 assert.ok(getFocusOptions({name:'一包纸想卖5元'}).some(([key])=>key==='supplies'));
 assert.ok(getFocusOptions({category:'绿植生活'}).some(([key])=>key==='care'));
});
test('missing or placeholder fields do not become facts',()=>{
 assert.equal(buildFocus({},'price').facts.length,0);
 assert.equal(buildFocus({condition:'见物品描述'},'condition').facts.length,0);
 assert.equal(buildFocus({price:''},'price').facts.length,0);
});
test('switching interest changes questions and AI context without changing source data',()=>{
 const before=JSON.stringify(item),a=buildFocus(item,'price'),b=buildFocus(item,'condition');
 assert.notEqual(a.message,b.message);assert.match(b.context,/新旧/);
 assert.equal(JSON.stringify(item),before);
 assert.ok(b.facts.some(f=>f.value.includes('使用痕迹')));
});
