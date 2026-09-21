import React,{useState} from 'react';
import {readAccessCode,saveAccessCode} from './ai';

export function ServiceAccess(){
 const [code,setCode]=useState(readAccessCode);
 return <details className="history-disclosure"><summary>AI 服务访问码（首次使用）</summary><label className="field">课堂体验访问码<input type="password" autoComplete="off" value={code} onChange={e=>{setCode(e.target.value);saveAccessCode(e.target.value)}} placeholder="向网站维护者获取"/></label><p className="fine-print">只在当前标签页保存。这里不要填写 DeepSeek API 密钥。</p></details>;
}
