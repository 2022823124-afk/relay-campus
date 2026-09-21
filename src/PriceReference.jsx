import React,{useEffect,useRef,useState} from 'react';
import {localPriceReference} from './priceReference';
import {aiAvailable,aiHeaders} from './ai';
import {ServiceAccess} from './ServiceAccess';

export function PriceReference({name,items,onAdopt,currentPrice}){
 const local=localPriceReference(name,items),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef(),generation=useRef(0);
 useEffect(()=>{generation.current++;controller.current?.abort();setResult(null);setError('');setBusy(false);return()=>{generation.current++;controller.current?.abort()}},[name]);
 const search=async()=>{
  const version=generation.current;setBusy(true);setError('');setResult(null);const request=new AbortController();controller.current=request;const timer=setTimeout(()=>request.abort(),60000);
  try{const response=await fetch(`${import.meta.env.VITE_AI_ENDPOINT.replace(/\/$/,'')}/price-reference`,{method:'POST',headers:aiHeaders(),body:JSON.stringify({name}),signal:request.signal});
   if(response.status===401)throw new Error('请填写正确的 AI 服务访问码后重试。');
   if(!response.ok)throw new Error(response.status===503?'联网比价服务尚未配置，暂时不能获取市场价。':'暂时查不到可靠的参考价，请稍后重试。');
   const value=await response.json();if(!Array.isArray(value.samples))throw new Error('价格数据格式不完整。');
   if(version===generation.current)setResult(value);
  }catch(e){if(version===generation.current)setError(e.name==='AbortError'?'查询超时，可以先自己定价。':e.message)}finally{clearTimeout(timer);if(version===generation.current)setBusy(false)}
 };
 const samples=result?result.samples:local.samples;
 const suggested=result?result.suggested:local.suggested;
 return <aside className="price-reference" aria-label="参考报价"><h4>参考报价</h4><p className="fine-print">点价格直接填入，点商品查看详情。</p>
  <p className="fine-print">{result?'公开网页报价参考，可能不是同一型号或成色；不代表已成交。':'本站目前是演示市集，下列为同类示例挂牌价，不是实时市场价。'}</p>
  {samples.length>0?<ul>{samples.slice(0,6).map((s,i)=><li key={s.id||s.url||i}><div>{s.id?<a className="reference-product" href={`?item=${encodeURIComponent(s.id)}`} target="_blank" rel="noreferrer">{s.name} ↗</a>:s.url&&/^https?:\/\//.test(s.url)?<a className="reference-product" href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>:<b>{s.name||s.title}</b>}<small>{s.source||'公开网页报价'}{s.publishedAt?` · 页面日期 ${s.publishedAt}`:''}</small></div><button className="reference-price" aria-label={`采用参考价 ${s.price} 元`} aria-pressed={currentPrice!==''&&Number(currentPrice)===s.price} onClick={()=>onAdopt(String(s.price))}><b>¥{s.price}</b><small>{currentPrice!==''&&Number(currentPrice)===s.price?'已填入':'点击采用'}</small></button></li>)}</ul>:<p className="fine-print">还没有可比较的同类价格，补全物品名称或型号再试。</p>}
  {Number.isFinite(suggested)&&suggested>0?<div className="price-adopt"><span>{result?'报价中位数参考':'示例报价中位数'} <b>¥{suggested}</b><small>基于 {samples.length} 条样本，非估值；请结合成色判断</small></span><button className="outline-button" onClick={()=>onAdopt(String(suggested))}>采用 ¥{suggested}</button></div>:samples.length>0&&<p className="fine-print">少于 3 条可比样本，暂不生成推荐价。</p>}
  {result?.checkedAt&&<p className="fine-print">查询时间：{new Date(result.checkedAt).toLocaleString('zh-CN')}</p>}
  {aiAvailable?<><button className="outline-button" disabled={busy||!name.trim()} onClick={search}>{busy?'正在查找价格来源…':'联网查参考价'}</button><p className="fine-print">仅发送物品名称查询，不上传照片和历史凭证。不会覆盖你的报价。</p></>:<p className="fine-print">联网市场比价尚未连接。接入价格检索服务后可在这里查询有来源的参考价。</p>}
  {error&&<p className="error" role="status">{error}</p>}
  {aiAvailable&&error&&<ServiceAccess/>}
 </aside>;
}
