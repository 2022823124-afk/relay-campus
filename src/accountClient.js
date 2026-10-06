import {getSession,sessionKey} from './accountStorage';
const endpoint=()=>import.meta.env.VITE_AI_ENDPOINT?.replace(/\/$/,'');
let refreshing;
const ownerId=getSession()?.user.id;
export function storeSession(data){if(!data.accessToken||!data.refreshToken||!data.user?.id)throw Error('登录结果不完整，请重试。');localStorage.setItem(sessionKey,JSON.stringify({...data,expiresAt:Date.now()+(data.expiresIn||3600)*1000}));}
async function raw(path,body,token){
 const base=endpoint();if(!base)throw Error('账号服务尚未连接，请先以访客继续使用。');
 const response=await fetch(`${base}/account/${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 let data;try{data=await response.json()}catch{data={}}
 if(!response.ok){const error=new Error(typeof data.detail==='string'?data.detail:'账号服务暂时不可用，请稍后重试。');error.status=response.status;throw error}return data;
}
async function refresh(){
 if(!refreshing)refreshing=(async()=>{const session=getSession();if(!session)throw Error('请先登录。');const data=await raw('refresh',{refreshToken:session.refreshToken});storeSession(data);return data.accessToken})().finally(()=>{refreshing=null});
 return refreshing;
}
export async function accountRequest(path,body){
 const session=getSession();if(!session)throw Error('请先登录。');
 if(session.user.id!==ownerId)throw Error('账号已切换，请刷新页面后继续。');
 const token=session.expiresAt<Date.now()+60000?await refresh():session.accessToken;
 try{return await raw(path,body,token)}catch(error){if(error.status!==401)throw error;return raw(path,body,await refresh())}
}
export async function signIn(mode,credentials){const data=await raw(mode,credentials);if(!data.verificationRequired)storeSession(data);return data;}
export async function signOut(){try{await accountRequest('logout',{})}catch{}localStorage.removeItem(sessionKey);location.reload();}
