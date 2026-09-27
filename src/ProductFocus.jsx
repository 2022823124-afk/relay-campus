import React,{useState} from 'react';
import {buildFocus,getFocusOptions} from './focusGuide';
import {WritingAssistant} from './WritingAssistant';

export function FocusChoices({item,value,onChange}){
 return <div className="focus-choices" role="group" aria-label="物品关注点"><span>我更在意</span>{getFocusOptions(item).map(([key,label])=><button type="button" key={key} aria-pressed={value===key} onClick={()=>onChange(key)}>{label}</button>)}</div>;
}
function FocusMessage({message,onAsk}){
 const [draft,setDraft]=useState(message);
 return <details className="focus-message"><summary>查看并编辑询问消息</summary><label className="field">询问消息<textarea rows={4} maxLength={1500} value={draft} onChange={e=>setDraft(e.target.value)}/></label><button type="button" className="btn purple" disabled={!draft.trim()} onClick={()=>onAsk(draft.trim())}>带入聊天，确认后发送</button><small>当前为聊天演示，不会发送给真实卖家。</small></details>;
}
export function ProductFocus({item,focus,onFocus,onAsk}){
 const summary=buildFocus(item,focus);
 return <section className="product-focus" aria-label="按关注点了解物品">
  <FocusChoices item={item} value={summary.key} onChange={onFocus}/>
  <p className="focus-intro">先看你关心的，再把不清楚的问明白。</p>
  <div className="focus-reading" aria-live="polite" aria-atomic="true">
   <h3>{summary.label} · 已有信息</h3>
   {summary.facts.length?<ul className="focus-facts">{summary.facts.map((fact,index)=><li key={index}><small>{fact.label}</small><p>{fact.value}</p></li>)}</ul>:<p className="focus-empty">物主暂未说明相关情况。</p>}
   <p className="focus-source">按关键词展示物主原文，相关程度需自行核对；物主陈述未经平台验证。</p>
   {summary.missing.length>0&&<p className="focus-missing"><b>描述未提及</b>{summary.missing.join('、')}，请向物主确认。</p>}
   <h3>可以这样问</h3><ul className="focus-questions">{summary.questions.map(q=><li key={q}>{q}</li>)}</ul>
  </div>
  <FocusMessage key={`${item.id}:${summary.key}:${summary.message}`} message={summary.message} onAsk={onAsk}/>
  <WritingAssistant mode="buyer" name={item.name} description={item.description||''} focusContext={summary.context} onApply={onAsk}/>
  <small>切换关注点只调整阅读重点，完整描述始终显示在下方。</small>
 </section>;
}
