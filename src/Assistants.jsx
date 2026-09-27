import React,{useState,useRef,useEffect} from 'react';
import {PaperPlaneTilt,Sparkle} from '@phosphor-icons/react';
import {itemReply} from './island';
import {askPlatform} from './ai';
export function Assistant({item,initialMessage=''}){
 const [q,setQ]=useState(initialMessage),[log,setLog]=useState([]),[enabled,setEnabled]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const logRef=useRef(),request=useRef(null);
 useEffect(()=>{const el=logRef.current;if(el)el.scrollTop=el.scrollHeight},[log,busy,error]);
 useEffect(()=>()=>{request.current?.abort();request.current=null},[]);
 async function respond(conversation){
  if(request.current)return;
  const controller=new AbortController();request.current=controller;setBusy(true);setError('');
  const timer=setTimeout(()=>controller.abort(),60000);
  try{const text=await askPlatform(conversation.slice(-7).map(m=>({role:m.role==='you'?'user':'assistant',content:m.text})),controller.signal);if(request.current===controller)setLog(v=>[...v,{role:'assistant',text}])}
  catch(e){if(request.current===controller)setError(e.name==='AbortError'?'回复超时，你的问题已保留。':e.message)}
  finally{clearTimeout(timer);if(request.current===controller){request.current=null;setBusy(false)}}
 }
 const ask=value=>{const text=value.trim().slice(0,1500);if(!text||busy||request.current)return;const conversation=[...log,{role:'you',text}];setQ('');setLog(conversation);if(item){setLog([...conversation,{role:'assistant',text:!enabled?'留言仅保存在本机，尚未发送给真实卖家。':itemReply(text,item)}]);return}respond(conversation)};
 return <div className="assistant"><div className="assistant-heading"><Sparkle size={22}/><div><b>{item?'物品信息助手':'平台 AI 助手'}</b><p>{item?'仅引用卖家确认的信息，不代卖家承诺。':'发布、收藏、交接，直接问。'}</p></div></div><p className="fine-print">{item?'物品规则问答 · 私信尚未接入': '由 AI 生成回答，可能有误；发送时会提交最近几轮对话。'}</p>{item&&<label className="checkbox-line"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>让物品助手回答已确认的信息</label>}<div className="quick-questions">{(item?['多少钱？','状况和缺陷？','在哪里交接？']:['怎么发布？','跨校怎么交接？','收藏后怎么看更新？']).map(s=><button className="outline-button" key={s} disabled={!enabled||busy} onClick={()=>ask(s)}>{s}</button>)}</div><div className="assistant-log" ref={logRef} aria-live="polite">{log.map((m,i)=><div className={`assistant-message ${m.role}`} key={i}><small>{m.role==='you'?'我':item?'物品助手 · 卖家资料':'平台 AI'}</small><p style={{whiteSpace:'pre-wrap'}}>{m.text}</p></div>)}{busy&&<p role="status">AI 正在回复…</p>}{error&&<div role="alert"><p className="error">{error}</p><button className="outline-button" onClick={()=>respond(log)}>重试回复</button></div>}</div><form className="chat-compose" onSubmit={e=>{e.preventDefault();ask(q)}}><input aria-label="向助手提问" maxLength={1500} placeholder={enabled?'输入你的问题…':'给卖家留言（本地演示）'} value={q} onChange={e=>setQ(e.target.value)}/><button className="btn purple" disabled={!q.trim()||busy} aria-label="发送给助手"><PaperPlaneTilt size={20}/></button></form></div>
}
