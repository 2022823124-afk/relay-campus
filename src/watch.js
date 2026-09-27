export const snapshot=i=>({price:i.price,condition:i.condition,description:i.description,sold:Boolean(i.sold)});
export function changesSince(item,before,focus='price'){
 if(!before)return [];
 const changes=[];
 if(item.sold&&!before.sold)changes.push('已成交');
 if(Number(item.price)!==Number(before.price))changes.push(`报价 ¥${before.price} → ¥${item.price}`);
 if(focus==='condition'&&item.condition!==before.condition)changes.push(`成色更新：${item.condition}`);
 if(focus!=='price'&&item.description!==before.description)changes.push('物主描述有更新');
 return changes;
}
