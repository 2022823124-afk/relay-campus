import React,{useState,useEffect,useRef} from 'react';
import {Sparkle} from '@phosphor-icons/react';
import {generateWriting,aiAvailable} from './ai';
import './writing-assistant.css';

export function WritingAssistant({mode,name,description,onApply,focusContext=''}){
 const seller=mode==='seller';
 const [note,setNote]=useState(''),[result,setResult]=useState(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(null);
 useEffect(()=>{request.current?.abort();request.current=null;setResult(null);setText('');setError('');setBusy(false);return()=>{request.current?.abort();request.current=null}},[name,description,focusContext]);
 const generate=async()=>{
  request.current?.abort();const controller=new AbortController();request.current=controller;
  setBusy(true);setError('');setResult(null);
  const timer=setTimeout(()=>controller.abort(),60000);
  try{const data=await generateWriting({mode,name,description,note:seller?note:[focusContext,note].filter(Boolean).join('\n').slice(0,1000)},controller.signal);if(request.current!==controller)return;setResult(data);setText(data[seller?'description':'message']);}
  catch(e){if(request.current===controller)setError(e.name==='AbortError'?'生成超时，请重试；原内容仍保留。':e.message);}
  finally{clearTimeout(timer);if(request.current===controller)setBusy(false);}
 };
 return <details className="writing-assistant"><summary><Sparkle size={19}/>{seller?'补充一句，让 AI 帮你说清楚':'补充用途，让 AI 细化问题'}</summary>
 <p>{seller?'补充功能、磨损或配件，AI 整理成待确认文案。':'已结合上方关注点。可补充用途，再生成更具体的问题和询问消息。'}</p>
 <label className="field">{seller?'补充真实情况':'你的用途或在意的地方（可选）'}<textarea maxLength={seller?1000:500} rows={2} value={note} disabled={busy} onChange={e=>{setNote(e.target.value);setResult(null)}} placeholder={seller?'例如：灯能正常亮，底座有划痕，带电源线。':'例如：想在宿舍看书用，担心灯光太暗。'}/></label>
 <p className="fine-print">点击生成会发送物品名称、描述、关注点和补充文字。AI 建议需核对，不代表平台验证。</p>{!aiAvailable&&<p className="fine-print">AI 服务尚未连接。{seller?'你可以继续手动填写。':'上方的问题和询问消息仍可直接使用。'}</p>}
 <button type="button" className="outline-button" disabled={!aiAvailable||busy||!name.trim()||!description.trim()} onClick={generate}>{busy?'正在生成…':seller?'生成新版描述':'生成问题与询问消息'}</button>
 {error&&<p className="error" role="alert">{error}</p>}
 {result&&<div className="writing-result" aria-live="polite">{result.questions.length>0&&<><b>{seller?'这些还需要你确认':'建议向物主确认'}</b><ul>{result.questions.map(q=><li key={q}>{q}</li>)}</ul></>}
 <label className="field">{seller?'新版描述 · 可编辑':'询问消息 · 可编辑'}<textarea rows={4} maxLength={1500} value={text} onChange={e=>setText(e.target.value)}/></label>
 <button type="button" className="btn purple" disabled={!text.trim()} onClick={()=>{onApply(text.trim());setResult(null)}}>{seller?'核对后采用描述':'带入聊天，自己确认发送'}</button>
 {!seller&&<p className="fine-print">当前聊天为演示，消息不会发送给真实卖家。</p>}</div>}
 </details>;
}
