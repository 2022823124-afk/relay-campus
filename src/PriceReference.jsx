import React,{useEffect,useRef,useState} from 'react';
import {localPriceReference} from './priceReference';
import {aiHeaders} from './ai';

const priceEndpoint=(import.meta.env.VITE_PRICE_ENDPOINT||import.meta.env.VITE_AI_ENDPOINT||'').replace(/\/$/,'');

export function PriceReference({name,category,items,onAdopt,currentPrice}){
 const local=localPriceReference(name,items),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef(),generation=useRef(0);
 useEffect(()=>{generation.current++;controller.current?.abort();setResult(null);setError('');setBusy(false);return()=>{generation.current++;controller.current?.abort()}},[name,category]);
 const search=async()=>{
  const version=generation.current;setBusy(true);setError('');setResult(null);const request=new AbortController();controller.current=request;const timer=setTimeout(()=>request.abort(),60000);
  try{const response=await fetch(`${priceEndpoint}/price-reference`,{method:'POST',headers:aiHeaders(),body:JSON.stringify({name,category}),signal:request.signal});
   if(response.status===401)throw new Error('服务暂未开放，请联系网站维护者。');
   if(!response.ok){const failure=await response.json().catch(()=>({}));throw new Error(response.status===503&&typeof failure.detail==='string'?failure.detail:response.status===429?'查询较多，请稍后再试。':'价格检索暂时失败，请稍后重试。');}
   const value=await response.json();if(!Array.isArray(value.samples))throw new Error('价格数据格式不完整。');
   if(version===generation.current)setResult(value);
  }catch(e){if(version===generation.current)setError(e.name==='AbortError'?'查询超时，可以先自己定价。':e.message)}finally{clearTimeout(timer);if(version===generation.current)setBusy(false)}
 };
 const samples=result?result.samples:local.samples;
 const suggested=result?result.suggested:local.suggested;
 return <aside className="price-reference" aria-label="参考报价"><h4>参考报价</h4><p className="fine-print">二手报价可点击填入；新品价格单独展示，供你比较。</p>
  <p className="fine-print">{result?.source==='Platform Transaction'?'来自本站双方确认的同类成交记录；仍需结合型号和成色判断。':result?'公开网页报价参考，可能不是同一型号或成色；不代表已成交。':'本站目前是演示市集，下列为同类示例挂牌价，不是实时市场价。'}</p>
  {samples.length>0?<ul>{samples.slice(0,6).map((s,i)=><li key={s.id||s.url||i}><div>{s.id?<a className="reference-product" href={`?item=${encodeURIComponent(s.id)}`} target="_blank" rel="noreferrer">{s.name} ↗</a>:s.url&&/^https?:\/\//.test(s.url)?<a className="reference-product" href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>:<b>{s.name||s.title}</b>}<small>{s.kind==='used'?'二手挂牌价':s.source||'公开网页报价'}{s.condition?` · ${s.condition}`:''}{s.publishedAt?` · 页面日期 ${s.publishedAt}`:''}</small></div><button className="reference-price" aria-label={`采用参考价 ${s.price} 元`} aria-pressed={currentPrice!==''&&Number(currentPrice)===s.price} onClick={()=>onAdopt(String(s.price))}><b>¥{s.price}</b><small>{currentPrice!==''&&Number(currentPrice)===s.price?'已填入':'点击采用'}</small></button></li>)}</ul>:<p className="fine-print">{result?(result.emptyReason||'本次未找到可核对的二手报价，请补充品牌和准确型号。'):'还没有同类示例价格，可以点击下方联网查询。'}</p>}
  {result?.retailSamples?.length>0&&<section aria-label="新品价格参考"><h4>新品价格参考</h4><p className="fine-print">以下是新品标价或定价，不是二手估值；以来源页面实际价格、运费及库存为准。</p><ul>{result.retailSamples.slice(0,6).map((s,i)=><li key={s.url||i}><div><a className="reference-product" href={/^https?:\/\//.test(s.url)?s.url:undefined} target="_blank" rel="noreferrer">{s.title} ↗</a><small>{s.condition||'新品'} · 公开网页报价</small><small>价格依据：{s.quote}</small></div><strong>¥{s.price}</strong></li>)}</ul></section>}
  {Number.isFinite(suggested)&&suggested>0?<div className="price-adopt"><span>{result?.source==='Platform Transaction'?'平台成交中位数':'报价中位数参考'} <b>¥{suggested}</b><small>基于 {samples.length} 条样本，非估值；请结合成色判断</small></span><button className="outline-button" onClick={()=>onAdopt(String(suggested))}>采用 ¥{suggested}</button></div>:samples.length>0&&<p className="fine-print">不同成色和规格的报价不合并估价，请逐条核对。</p>}
  {result&&samples.length===0&&!result.retailSamples?.length&&result.sourceLinks?.length>0&&<div className="price-source-links"><b>检索到的相关页面</b><p className="fine-print">以下尚未提取到可靠价格，可打开原页面核对，不计入参考价。</p><ul>{result.sourceLinks.filter(s=>/^https?:\/\//.test(s.url)).map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title||'查看来源'} ↗</a></li>)}</ul></div>}
  {result?.checkedAt&&<p className="fine-print">查询时间：{new Date(result.checkedAt).toLocaleString('zh-CN')}</p>}
  {priceEndpoint?<><button className="outline-button" disabled={busy||!name.trim()} onClick={search}>{busy?'正在查找价格来源…':'联网查参考价'}</button><p className="fine-print">支持常见商品查询，名称越具体越容易找到：如“罗技 M185 鼠标”“同济 高等数学 第七版 上册”。仅发送名称和分类，不上传照片，也不会覆盖你的报价。</p></>:<p className="fine-print">联网市场比价尚未连接。接入价格检索服务后可在这里查询有来源的参考价。</p>}
  {error&&<p className="error" role="status">{error}</p>}
  
 </aside>;
}
