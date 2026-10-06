import {useEffect,useRef,useState} from 'react';
import {accountRequest} from './accountClient';
export function useCloudAccount(account,snapshot,hydrate){
 const [loading,setLoading]=useState(Boolean(account)),[status,setStatus]=useState(account?'正在加载云端记录…':'访客记录保存在这台设备'),[tick,setTick]=useState(0);
 const latest=useRef(snapshot),apply=useRef(hydrate),revision=useRef(0),baseline=useRef(''),active=useRef(true),ready=useRef(false),saving=useRef(false),blocked=useRef(false),timer=useRef();
 latest.current=snapshot;apply.current=hydrate;
 const load=async()=>{
  if(!account||saving.current)return;
  clearTimeout(timer.current);ready.current=false;blocked.current=false;setLoading(true);setStatus('正在加载云端记录…');
  try{const result=await accountRequest('state');if(!active.current)return;revision.current=result.revision;if(result.state)apply.current(result.state);baseline.current=result.state?JSON.stringify(result.state):'';ready.current=true;setStatus('云端记录已加载');setTick(t=>t+1)}catch(e){if(active.current){blocked.current=true;setStatus(e.message||'连接失败，本机记录已保留。')}}finally{if(active.current)setLoading(false)}
 };
 useEffect(()=>{active.current=true;if(account)load();return()=>{active.current=false;clearTimeout(timer.current)}},[]);
 const encoded=JSON.stringify(snapshot);
 useEffect(()=>{
  if(!account||!ready.current||blocked.current||loading||saving.current||encoded===baseline.current)return;
  setStatus('等待保存…');
  timer.current=setTimeout(async()=>{saving.current=true;const sent=JSON.stringify(latest.current);setStatus('正在同步…');try{const result=await accountRequest('state',{revision:revision.current,state:JSON.parse(sent)});if(!active.current)return;revision.current=result.revision;baseline.current=sent;setStatus('已同步到账号')}catch(e){if(active.current){blocked.current=true;setStatus(e.status===409?'其他设备已更新，自动同步已暂停。重新加载前请保留本机新改动。':e.message||'同步失败，本机记录已保留。')}}finally{saving.current=false;if(active.current)setTick(t=>t+1)}},1000);
  return()=>clearTimeout(timer.current);
 },[encoded,loading,tick]);
 return {loading,status,reload:load};
}
