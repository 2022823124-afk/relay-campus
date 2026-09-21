// Optional trusted backend. Never ship model credentials in a browser bundle.
export async function analyzePhoto(image,signal){
 const endpoint=import.meta.env.VITE_AI_ENDPOINT;
 if(!endpoint)throw new Error('图片 AI 尚未连接。可以继续手动填写，照片不会上传。');
 const r=await fetch(`${endpoint.replace(/\/$/,'')}/listing-draft`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal});
 if(!r.ok)throw new Error('AI 暂时不可用，请手动填写或稍后重试。');
 const d=await r.json();
 if(typeof d.name!=='string'||typeof d.description!=='string')throw new Error('AI 返回内容不完整，请手动确认。');
 return {name:d.name.slice(0,40),description:d.description.slice(0,1500),guidance:typeof d.guidance==='string'?d.guidance.slice(0,300):''};
}
export const aiAvailable=Boolean(import.meta.env.VITE_AI_ENDPOINT);
