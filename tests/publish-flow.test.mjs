import test from 'node:test';
import assert from 'node:assert/strict';
import {draftFromNote,validPrice,validatePublish,answerDescription} from '../src/publishFlow.js';

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
