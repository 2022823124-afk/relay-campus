import test from 'node:test';
import assert from 'node:assert/strict';
import {draftFromNote,extractOffer,validPrice,validatePublish,answerDescription} from '../src/publishFlow.js';
import {localPriceReference} from '../src/priceReference.js';

test('natural owner offers include no spaces, fullwidth, Chinese and colloquial text',()=>{
 for(const text of ['我想卖10元','我想卖１０元','我想卖十元','我想卖个10元','台灯，我打算卖10块钱','这件卖10元'])assert.equal(extractOffer(text),'10',text);
 assert.equal(extractOffer('我想卖十二元'),'12');
 assert.equal(extractOffer('我想卖两百元'),'200');
 assert.equal(extractOffer('原价100元，我想卖10元'),'10');
 for(const text of ['原价10元','我不想卖10元','以前卖10元','报价10到20元','想卖10万元'])assert.equal(extractOffer(text),'',text);
});

test('references only compare similar positive offers and deduplicate items',()=>{
 const items=[{id:'a',name:'台灯',price:10},{id:'b',name:'暖光台灯',price:20},{id:'c',name:'旧台灯',price:30},{id:'a',name:'台灯',price:100},{id:'x',name:'相机',price:200},{id:'y',name:'台灯',price:0}];
 const r=localPriceReference('台灯',items);assert.equal(r.samples.length,3);assert.equal(r.suggested,20);
 assert.equal(localPriceReference('台灯',items.slice(0,2)).suggested,null);
 assert.equal(localPriceReference('未知物品',items).samples.length,0);
});

test('owner words carry over, historical cost never becomes offer',()=>{
 const d=draftFromNote('台灯，买来 80 元，底座有划痕，想卖 30 元');
 assert.equal(d.price,'30');assert.equal(d.category,'宿舍好物');assert.match(d.description,/划痕/);
 assert.equal(draftFromNote('台灯，原价 80 元').price,'');
 assert.equal(draftFromNote('想卖 30 元或者报价 20 元').price,'');
 assert.equal(draftFromNote('想卖30万元').price,'');
 assert.equal(draftFromNote('想卖30.999元').price,'');
 assert.equal(draftFromNote('').name,'');
});
test('free is valid but empty, negative and nonfinite prices are not',()=>{
 assert.equal(validPrice('0'),true);
 for(const p of ['', ' ', '-1','Infinity','abc'])assert.equal(validPrice(p),false);
});
test('unknown receipt price is allowed without turning it into zero',()=>{
 const d={image:'photo',name:'椅子',description:'状态待确认',category:'宿舍好物',price:'20',history:'upload',proof:'receipt',source:'闲鱼订单',previousPrice:''};
 assert.equal(validatePublish(d),'');
 assert.notEqual(validatePublish({...d,source:''}),'');
 assert.notEqual(validatePublish({...d,previousPrice:'-1'}),'');
});
test('only explicitly selected answers become owner statements',()=>{
 assert.equal(answerDescription('黑色椅子',{}),'黑色椅子');
 assert.equal(answerDescription('黑色椅子',{function:'未测试，功能未知',defects:''}),'黑色椅子\n未测试，功能未知');
});
