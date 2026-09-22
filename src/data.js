import {aiHeaders} from './ai';

const endpoint=()=>import.meta.env.VITE_AI_ENDPOINT?.replace(/\/$/,'');

async function post(path,body){
 const base=endpoint();
 if(!base)return {saved:false,reason:'backend-not-configured'};
 try{
  const response=await fetch(`${base}${path}`,{method:'POST',headers:aiHeaders(),body:JSON.stringify(body)});
  if(response.status===401)throw new Error('请填写正确的 AI 服务访问码后重试。');
  if(response.status===503)return {saved:false,reason:'database-not-configured'};
  if(!response.ok)throw new Error(path==='/items'?'交易卡暂时无法保存到云端。':'成交记录暂时无法保存到云端。');
  return response.json();
 }catch(error){
  if(error.message?.includes('访问码'))throw error;
  return {saved:false,reason:'network-error'};
 }
}

export const saveListing=listing=>post('/items',{
 ...listing,
 previousPrice:listing.previousPrice===''?null:Number(listing.previousPrice)
});
export const saveTransaction=(clientItemId,price)=>post('/transactions',{
 clientItemId,price,buyerConfirmed:true,sellerConfirmed:true
});
