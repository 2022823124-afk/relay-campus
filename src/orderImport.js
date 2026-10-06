const categories=['数码装备','书籍文具','宿舍好物','绿植生活'];
export function validateOrderResult(data){
 if(data?.source!=='Order Screenshot'||data.requiresConfirmation!==true||!Array.isArray(data.items))throw Error('识别结果不完整，请换一张清楚的订单截图。');
 const items=data.items.slice(0,8).filter(i=>i&&typeof i.name==='string'&&i.name.trim()).map(i=>({name:i.name.trim().slice(0,40),specification:typeof i.specification==='string'?i.specification.slice(0,120):'',category:categories.includes(i.category)?i.category:'',purchasePrice:typeof i.purchasePrice==='number'&&Number.isFinite(i.purchasePrice)&&i.purchasePrice>=0&&i.purchasePrice<=1000000?i.purchasePrice:null}));
 if(!items.length)throw Error('截图中没有可读取的商品，请补拍清楚或手动填写。');
 return {items,platform:['京东','淘宝','天猫','拼多多','闲鱼','其他'].includes(data.platform)?data.platform:'未知',purchaseDate:validMonth(data.purchaseDate),orderStatus:['completed','pending','cancelled'].includes(data.orderStatus)?data.orderStatus:'unknown'};
}
export function validMonth(value){const m=typeof value==='string'&&value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);return m?value:'';}
export function orderDraft(item){return [item.name,item.specification&&`订单截图中的规格：${item.specification}`,'当前使用状况、瑕疵与配件待我补充。'].filter(Boolean).join('\n');}
export function applyOrderCandidate(current,candidate,image,scope){
 if(scope==='history')return {...current,history:'upload',proof:image,previousPrice:candidate.purchasePrice==null?'':String(candidate.purchasePrice),date:validMonth(candidate.purchaseDate),source:candidate.platform==='未知'?'订单截图（来源待核对）':`${candidate.platform}订单截图`,confirmed:false};
 return {...current,name:candidate.name,category:candidate.category,description:orderDraft(candidate),confirmed:false};
}
