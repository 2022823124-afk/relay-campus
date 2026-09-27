import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshot,changesSince} from '../src/watch.js';
const item={price:35,condition:'九成新',description:'底座划痕',sold:false};
test('price change keeps the original saved quote, including free',()=>{assert.deepEqual(changesSince({...item,price:0},snapshot(item)),['报价 ¥35 → ¥0']);assert.deepEqual(changesSince(item,snapshot(item)),[])});
test('description and condition updates follow interest, sold is always visible',()=>{const changed={...item,description:'有污渍',condition:'八成新',sold:true};assert.deepEqual(changesSince(changed,snapshot(item),'price'),['已成交']);assert.deepEqual(changesSince(changed,snapshot(item),'clean'),['已成交','物主描述有更新']);assert.deepEqual(changesSince(changed,snapshot(item),'condition'),['已成交','成色更新：八成新','物主描述有更新'])});
test('old favorites get a baseline, not a fabricated change',()=>assert.deepEqual(changesSince(item,undefined),[]));
