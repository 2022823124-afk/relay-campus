import React,{useState,useEffect,useRef} from 'react';
import {generateWriting} from './ai';
export const focusOptions=[['price','价格'],['clean','清洁'],['condition','新旧']];
export function FocusChoices({value,onChange}){return <div className="focus-choices" aria-label="物品关注点"><span>我更在意</span>{focusOptions.map(([key,label])=><button type="button" key={key} aria-pressed={value===key} onClick={()=>onChange(key)}>{label}</button>)}</div>}
export function ProductFocus({item,focus,onFocus}){
 const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef(null);
 useEffect(()=>{active.current?.abort();active.current=null;setResult(null);setBusy(false);setError('');return()=>{active.current?.abort();active.current=null}},[item.id,item.description,item.price,item.condition,focus]);
 async function generate(){const c=new AbortController();active.current=c;setBusy(true);setError('');const timer=setTimeout(()=>c.abort(),60000);try{const data=await generateWriting({mode:'focus',name:item.name,description:item.description,note:`关注${focusOptions.find(([k])=>k===focus)?.[1]}。当前报价${item.price}元；物主标注成色：${item.condition}。`},c.signal);if(active.current===c)setResult(data)}catch(e){if(active.current===c)setError(e.name==='AbortError'?'生成超时，请重试':e.message)}finally{clearTimeout(timer);if(active.current===c)setBusy(false)}}
 return <section className="product-focus"><FocusChoices value={focus} onChange={onFocus}/><div className="focus-fact">{focus==='price'?`当前报价 ¥${item.price}`:focus==='condition'?`物主标注：${item.condition}`:'清洁情况以物主说明与实物为准'}</div><button className="focus-generate" disabled={busy} onClick={generate}>{busy?'正在整理…':result?'重新生成':'AI 帮我看重点'}</button>{result&&<div className="focus-result" aria-live="polite"><p>{result.message}</p>{result.questions.slice(0,1).map(q=><p key={q} className="focus-question">待确认：{q}</p>)}</div>}{error&&<p role="alert" className="error">{error}</p>}<small>AI 仅整理物主信息，生成时发送这件物品的文字资料。</small></section>
}
