import {useState,useEffect,useRef} from 'react';
import {readLocal,writeLocal,storageKey} from './accountStorage';
import {aiHeaders} from './ai';
import {snapshot} from './watch';
const read=readLocal;
export function useWatchlist(items,setItems,saved){
 const [baselines,setBaselines]=useState(()=>read('relay-watch-baselines',{}));
 const [focuses,setFocuses]=useState(()=>read('relay-watch-focus',{}));
 const [sync,setSync]=useState(''),[refresh,setRefresh]=useState(0);
 const latest=useRef(items);latest.current=items;
 useEffect(()=>{setBaselines(old=>{const next={};for(const id of saved){const i=items.find(x=>x.id===id);if(old[id])next[id]=old[id];else if(i)next[id]=snapshot(i)}return JSON.stringify(next)===JSON.stringify(old)?old:next})},[saved,items]);
 useEffect(()=>{writeLocal('relay-watch-baselines',baselines)},[baselines]);
 useEffect(()=>{writeLocal('relay-watch-focus',focuses)},[focuses]);
 useEffect(()=>{const listener=e=>{if(e.key===storageKey('relay-items')&&e.newValue){try{const data=JSON.parse(e.newValue);if(Array.isArray(data))setItems(old=>JSON.stringify(old)===e.newValue?old:data)}catch{}}};window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener)},[setItems]);
 const ids=saved.join('|');
 useEffect(()=>{if(!ids){setSync('');return}let stopped=false,controller;let running=false;
 async function check(){if(document.hidden||running)return;const cloud=latest.current.filter(i=>saved.includes(i.id)&&i.databaseSaved).map(i=>i.id).slice(0,50);if(!cloud.length){setSync('本机收藏 · 示例物品不提供实时行情');return}const base=import.meta.env.VITE_AI_ENDPOINT;if(!base){setSync('未连接更新服务');return}running=true;controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);try{const r=await fetch(`${base.replace(/\/$/,'')}/watch-updates`,{method:'POST',headers:aiHeaders(),body:JSON.stringify({ids:cloud}),signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(stopped)return;const rows=Array.isArray(data.items)?data.items.filter(x=>cloud.includes(x.id)&&Number.isFinite(x.price)&&x.price>=0&&typeof x.description==='string'&&typeof x.condition==='string'&&Number.isInteger(x.version)&&typeof x.sold==='boolean'):[];setItems(old=>old.map(i=>{const r=rows.find(x=>x.id===i.id);return r&&r.version>=(i.version||1)?{...i,...r}:i}));setSync(rows.length?`已检查 ${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} · 每30秒检查`:'暂无可同步的公开版本 · 保留本机记录')}catch{if(!stopped)setSync('更新检查失败 · 已保留上次信息')}finally{clearTimeout(timer);running=false}}
 check();const timer=setInterval(check,30000);document.addEventListener('visibilitychange',check);return()=>{stopped=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',check)}},[ids,refresh,setItems]);
 return {baselines,focuses,sync,refresh:()=>setRefresh(x=>x+1),setFocus:(id,value)=>setFocuses(s=>({...s,[id]:value})),acknowledge:()=>setBaselines(Object.fromEntries(items.filter(i=>saved.includes(i.id)).map(i=>[i.id,snapshot(i)])))};
}
