import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyGarden,awardRelay,growth,redeemBoost,activeBoosts} from '../src/relayGame.js';
const gift={id:'gift',name:'花盆',price:0,status:'PUBLISHED',confirmed:true};
const sale={id:'sale',name:'台灯',price:30,status:'PUBLISHED',confirmed:true};
test('only eligible confirmation awards once per item; free has greater rewards',()=>{
 let g=awardRelay(emptyGarden(),{...gift,status:'REVIEW'},100);assert.equal(g.events.length,0);
 g=awardRelay(g,gift,100);assert.equal(growth(g).points,40);assert.equal(g.coupons.length,2);
 assert.equal(awardRelay(g,{...gift,version:2},200),g);
 g=awardRelay(g,sale,300);assert.equal(growth(g).points,60);assert.equal(g.coupons.length,3);
 assert.equal(awardRelay(g,{...sale,id:'unknown',confirmed:false}),g);
});
test('redemption consumes one coupon, preserves growth and enforces weekly quota',()=>{
 const g=awardRelay(emptyGarden(),gift,100);const coupon=g.coupons[0].id;
 assert.ok(redeemBoost(g,coupon,gift,1000).error);
 const next=redeemBoost(g,coupon,sale,1000).garden;
 assert.equal(growth(next).points,40);assert.equal(next.coupons.filter(c=>!c.usedAt).length,1);
 assert.ok(redeemBoost(next,coupon,sale,2000).error);
 assert.ok(redeemBoost(next,g.coupons[1].id,sale,2000).error);
 assert.ok(redeemBoost(next,g.coupons[1].id,sale,1000+7*86400000).garden);
 assert.equal(activeBoosts(next,[sale],1001).length,1);
 assert.equal(activeBoosts(next,[sale],1000+86400000).length,0);
 assert.equal(activeBoosts(next,[{...sale,sold:true}],1001).length,0);
 assert.equal(activeBoosts(next,[],1001).length,0);
});
