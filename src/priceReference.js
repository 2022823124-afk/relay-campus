const groups=[['台灯','落地灯'],['椅','凳'],['耳机'],['相机','单反'],['手机'],['键盘'],['鼠标'],['板材','木板'],['书','诗集'],['盆栽','绿植','花盆']];
export function localPriceReference(name,items=[]){
 const group=groups.find(words=>words.some(w=>name.includes(w)));
 if(!group)return {samples:[],suggested:null};
 const seen=new Set();
 const samples=items.filter(i=>{
  if(i.sold||seen.has(i.id)||!group.some(w=>i.name.includes(w))||i.price===null||!Number.isFinite(Number(i.price))||Number(i.price)<=0)return false;
  seen.add(i.id);return true;
 }).map(i=>({id:i.id,name:i.name,price:Number(i.price),source:'本站示例挂牌价'}));
 const prices=samples.map(s=>s.price).sort((a,b)=>a-b);
 const middle=Math.floor(prices.length/2);
 const median=prices.length?prices.length%2?prices[middle]:(prices[middle-1]+prices[middle])/2:null;
 return {samples,suggested:prices.length>=3?Math.round(median*100)/100:null,min:prices[0],max:prices.at(-1)};
}
