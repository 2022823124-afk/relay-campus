import React,{useEffect,useState,useRef} from 'react';
import {buildFocus} from './focusGuide';
import {changesSince,snapshot} from './watch';
import {generateWriting} from './ai';
import './market-preferences.css';
export function preferenceFact(item,focus){
 if(!focus)return '';
 return buildFocus(item,focus).facts.map(f=>f.value).join('；');
}
export function PreferenceFilters({value,onChange,only,onOnly}){
 return <section className="market-preferences" aria-label="关注点筛选"><div className="preference-tabs"><span>我更在意</span>{[['','综合'],['price','价格'],['clean','干净程度'],['condition','新旧程度']].map(([key,label])=><button key={key} aria-pressed={value===key} onClick={()=>onChange(key)}>{label}</button>)}</div>{value&&<div className="preference-hint">{value==='price'?<span>按当前报价从低到高</span>:<label><input type="checkbox" checked={only} onChange={e=>onOnly(e.target.checked)}/>只看卖家已说明的物品</label>}<small>状况依据卖家描述，未经核验</small></div>}</section>;
}
export function PreferenceQuote({item,focus}){
 if(!focus||focus==='price')return null;
 const fact=preferenceFact(item,focus);
 return <p className="preference-quote"><small>{fact?'卖家描述':'待确认'}</small><span>{fact||`卖家尚未说明${focus==='clean'?'清洁情况':'新旧情况'}`}</span></p>;
}
export function WatchSummary({item,before,focus,onFocus}){
 const changes=changesSince(item,before,focus);
 const signature=JSON.stringify([item.id,snapshot(item),before,focus]);
 const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(null);
 useEffect(()=>{request.current?.abort();setResult(null);setError('');setBusy(false);return()=>request.current?.abort()},[signature]);
 async function summarize(){
 const controller=new AbortController();request.current=controller;setBusy(true);setError('');
 try{const data=await generateWriting({mode:'focus',name:item.name,description:JSON.stringify({before,current:snapshot(item)}).slice(0,1500),note:`任务：生成收藏变化摘要，仅比较before与current，不生成推测。关注点：${focus}。已检测变化：${changes.join('；')}。描述属于卖家自述，未提及不能说已解决；不推断市场价格。不变的内容不要当成更新。一句话说明变化与关注点的关系。`},controller.signal);if(!controller.signal.aborted)setResult({signature,text:data.message});}catch(e){if(!controller.signal.aborted)setError('AI 暂时不可用，变化记录仍可查看。')}finally{if(!controller.signal.aborted)setBusy(false)}
 }
 return <section className="watch-summary"><label>关注<select aria-label={`关注${item.name}的哪些变化`} value={focus} onChange={e=>{request.current?.abort();onFocus(e.target.value)}}><option value="price">价格</option><option value="clean">干净程度</option><option value="condition">新旧程度</option></select></label>{changes.length?<><ul>{changes.map(c=><li key={c}>{c}</li>)}</ul>{result?.signature===signature?<p className="watch-ai"><small>AI 变化摘要 · 请核对</small>{result.text}</p>:<button className="watch-generate" disabled={busy} onClick={summarize}>{busy?'正在总结…':'AI 总结变化'}</button>}{error&&<small role="alert">{error}</small>}<details><summary>查看修改前后</summary><p>之前：{before?.condition||'未说明'} · {before?.description||'无描述'}</p><p>现在：{item.condition||'未说明'} · {item.description||'无描述'}</p></details></>:<small>{item.sold?'已成交':'收藏后暂无新变化'}</small>}</section>;
}
