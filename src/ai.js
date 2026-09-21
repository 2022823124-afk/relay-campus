// Optional trusted backend. Never ship model credentials in a browser bundle.
export function readAccessCode(){try{return sessionStorage.getItem('relay-access-code')||''}catch{return ''}}
export function saveAccessCode(value){try{sessionStorage.setItem('relay-access-code',value)}catch{}}
export function aiHeaders(){const code=readAccessCode();return {'Content-Type':'application/json',...(code?{'X-Relay-Access':code}:{})};}
export async function analyzePhoto(image,signal,note=''){
 const endpoint=import.meta.env.VITE_AI_ENDPOINT;
 if(!endpoint)throw new Error('图片 AI 尚未连接。可以继续手动填写，照片不会上传。');
 const r=await fetch(`${endpoint.replace(/\/$/,'')}/listing-draft`,{method:'POST',headers:aiHeaders(),body:JSON.stringify({image,note:note.slice(0,1000)}),signal});
 if(r.status===401)throw new Error('请在“AI 服务访问码”中填写正确的课堂体验码。');
 if(!r.ok)throw new Error(r.status===503?'识别服务尚未配置完成，请继续手动填写。':r.status===429?'识别服务正忙，请稍后重试。':'AI 暂时不可用，请手动填写或稍后重试。');
 const d=await r.json();
 if(typeof d.name!=='string'||typeof d.description!=='string')throw new Error('AI 返回内容不完整，请手动确认。');
 return {name:d.name.slice(0,40),description:d.description.slice(0,1500),category:['数码装备','书籍文具','宿舍好物','绿植生活'].includes(d.category)?d.category:'',questions:Array.isArray(d.questions)?[...new Set(d.questions.filter(q=>['function','defects','accessories'].includes(q)))].slice(0,3):[],guidance:'AI 草稿 · 待你确认。'+(typeof d.guidance==='string'?d.guidance.slice(0,300):'请核对真实状况、功能与配件。')};
}
export const aiAvailable=Boolean(import.meta.env.VITE_AI_ENDPOINT);
