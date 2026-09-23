export const emptyGarden=()=>({events:[],coupons:[],boosts:[]});
export function awardRelay(garden,item,now=Date.now()){
 if(!item?.id||item.status!=='PUBLISHED'||!item.confirmed||item.sold||!Number.isFinite(Number(item.price))||Number(item.price)<0||garden.events.some(e=>e.itemId===item.id))return garden;
 const free=Number(item.price)===0, eventId=`relay:${item.id}`;
 const event={id:eventId,itemId:item.id,name:item.name,image:item.image||'',img:item.img,free,points:free?40:20,at:now,story:''};
 return {...garden,events:[...garden.events,event],coupons:[...garden.coupons,...Array.from({length:free?2:1},(_,i)=>({id:`${eventId}:${i}`,eventId,usedAt:null}))]};
}
export function growth(garden){const points=garden.events.reduce((n,e)=>n+e.points,0);const levels=[{at:0,name:'一颗接力种子'},{at:20,name:'第一片新叶'},{at:60,name:'故事在枝头'},{at:120,name:'长成一座小岛'}];const level=[...levels].reverse().find(l=>points>=l.at);return {points,level,next:levels.find(l=>l.at>points),freeCount:garden.events.filter(e=>e.free).length};}
export function redeemBoost(garden,couponId,item,now=Date.now()){
 const coupon=garden.coupons.find(c=>c.id===couponId&&!c.usedAt);
 if(!coupon)return {error:'这张券已使用或不存在。'};
 if(!item||item.status!=='PUBLISHED'||!item.confirmed||item.sold||!(Number(item.price)>0))return {error:'请选择自己已发布且仍在售的收费物品。'};
 if(garden.boosts.some(b=>now-b.startedAt<7*86400000))return {error:'每 7 天可使用一次曝光券，请稍后再来。'};
 return {garden:{...garden,coupons:garden.coupons.map(c=>c.id===couponId?{...c,usedAt:now}:c),boosts:[...garden.boosts,{itemId:item.id,startedAt:now,expiresAt:now+86400000}]}};
}
export function activeBoosts(garden,items,now=Date.now()){return garden.boosts.filter(b=>b.expiresAt>now).map(b=>items.find(i=>i.id===b.itemId&&!i.sold&&i.status==='PUBLISHED')).filter(Boolean).slice(0,1);}
