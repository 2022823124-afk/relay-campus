// Optional trusted backend. Never ship model credentials in a browser bundle.
export function aiHeaders(){return {'Content-Type':'application/json'};}
export async function analyzePhoto(image,signal,note=''){
 const endpoint=import.meta.env.VITE_AI_ENDPOINT;
 if(!endpoint)throw new Error('图片 AI 尚未连接。可以继续手动填写，照片不会上传。');
 const r=await fetch(`${endpoint.replace(/\/$/,'')}/listing-draft`,{method:'POST',headers:aiHeaders(),body:JSON.stringify({image,note:note.slice(0,1000)}),signal});
 if(r.status===401)throw new Error('服务暂未开放，请联系网站维护者。');
 if(!r.ok)throw new Error(r.status===503?'识别服务尚未配置完成，请继续手动填写。':r.status===429?'识别服务正忙，请稍后重试。':'AI 暂时不可用，请手动填写或稍后重试。');
 const d=await r.json();
 if(typeof d.name!=='string'||typeof d.description!=='string')throw new Error('AI 返回内容不完整，请手动确认。');
 return {cameraGuide:d.cameraGuide&&['lamp','book','plant','device','furniture','generic'].includes(d.cameraGuide.frame)&&['title','angle'].every(k=>typeof d.cameraGuide[k]==='string'&&d.cameraGuide[k].length<=120)?d.cameraGuide:null,photoTips:Array.isArray(d.photoTips)?d.photoTips.filter(t=>t&&['side','defect'].includes(t.slot)&&['title','reason','angle'].every(k=>typeof t[k]==='string'&&t[k].trim()&&t[k].length<=120)).slice(0,2):[],name:d.name.slice(0,40),description:d.description.slice(0,1500),category:['数码装备','书籍文具','宿舍好物','绿植生活'].includes(d.category)?d.category:'',questions:Array.isArray(d.questions)?[...new Set(d.questions.filter(q=>['function','defects','accessories'].includes(q)))].slice(0,3):[],guidance:'AI 草稿 · 待你确认。'+(typeof d.guidance==='string'?d.guidance.slice(0,300):'请核对真实状况、功能与配件。')};
}
export const aiAvailable=Boolean(import.meta.env.VITE_AI_ENDPOINT);

export async function generateWriting(payload,signal){
 const endpoint=import.meta.env.VITE_AI_ENDPOINT;
 if(!endpoint)throw new Error('AI 服务尚未连接，可以继续自己填写。');
 const response=await fetch(`${endpoint.replace(/\/$/,'')}/writing-assist`,{method:'POST',headers:aiHeaders(),body:JSON.stringify(payload),signal});
 if(!response.ok)throw new Error(response.status===401?'服务暂未开放，请联系网站维护者。':response.status===429?'服务正忙，请稍后重试。':'生成暂时不可用，你填写的内容已保留。');
 const data=await response.json();
 if(!Array.isArray(data.questions)||data.questions.some(q=>typeof q!=='string')||typeof data[payload.mode==='seller'?'description':'message']!=='string')throw new Error('生成内容不完整，请重试。');
 return data;
}

export async function askPlatform(messages,signal){
 const endpoint=import.meta.env.VITE_AI_ENDPOINT;
 if(!endpoint)throw new Error('AI 服务尚未连接，请稍后再试。');
 const response=await fetch(`${endpoint.replace(/\/$/,'')}/platform-chat`,{method:'POST',headers:aiHeaders(),body:JSON.stringify({messages:messages.slice(-7)}),signal});
 if(!response.ok)throw new Error(response.status===429?'AI 正忙，请稍后重试。':response.status===401?'服务暂未开放，请联系网站维护者。':'AI 暂时无法回复，请重试。');
 const data=await response.json();
 if(typeof data.answer!=='string'||!data.answer.trim()||data.source!=='model')throw new Error('AI 回复不完整，请重试。');
 return data.answer;
}
