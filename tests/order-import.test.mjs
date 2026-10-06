import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrderResult,applyOrderCandidate} from '../src/orderImport.js';
test('order candidates never overwrite the asking price or verified condition',()=>{
 const current={name:'原名',description:'底座有划痕',price:'30',condition:'使用过',image:'actual-photo',confirmed:true};
 const c={name:'暖光台灯',category:'宿舍好物',specification:'白色',purchasePrice:79,purchaseDate:'2024-10',platform:'京东'};
 const listing=applyOrderCandidate(current,c,'receipt','listing');
 assert.equal(listing.price,'30');assert.equal(listing.image,'actual-photo');assert.equal(listing.condition,'使用过');assert.equal(listing.confirmed,false);
 const history=applyOrderCandidate(current,c,'receipt','history');
 assert.equal(history.name,'原名');assert.equal(history.description,'底座有划痕');assert.equal(history.previousPrice,'79');assert.equal(history.proof,'receipt');assert.equal(history.date,'2024-10');assert.equal(history.source,'京东订单截图');assert.equal(history.confirmed,false);
});
test('missing values clear stale history instead of borrowing them from a previous order',()=>{
 const d=applyOrderCandidate({previousPrice:'50',date:'2020-01'},{purchasePrice:null,purchaseDate:'',platform:'未知'},'new-receipt','history');
 assert.equal(d.previousPrice,'');assert.equal(d.date,'');assert.equal(d.source,'订单截图（来源待核对）');
});
test('malformed service responses are rejected or reduced to safe candidates',()=>{
 assert.throws(()=>validateOrderResult({items:[{name:'灯'}]}));
 const d=validateOrderResult({source:'Order Screenshot',requiresConfirmation:true,items:[{name:'灯',purchasePrice:'80',address:'secret',condition:'全新'}],platform:'invented',purchaseDate:'2024-13'});
 assert.equal(d.items[0].purchasePrice,null);assert.equal(d.purchaseDate,'');assert.equal(d.platform,'未知');assert.equal(d.items[0].address,undefined);assert.equal(d.items[0].condition,undefined);
});
