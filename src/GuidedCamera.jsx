import React,{useEffect,useRef,useState} from 'react';
import './guided-camera.css';
const paths={
 lamp:'M65 245H175L163 230H77Z M120 230V153L169 106 M151 66L185 92L160 124L126 98Z',
 book:'M53 65L119 79L187 65V237L120 251L53 237Z M120 79V251',
 plant:'M78 190H163L151 253H90Z M120 190V105 M120 150C66 160 64 108 69 91C113 90 124 123 120 150 M120 123C165 137 177 91 168 72C137 76 119 93 120 123',
 device:'M67 53H173V259H67Z M106 240H134 M105 69H135',
 furniture:'M61 113H179V194H61Z M75 194V254 M165 194V254 M71 113V65H169V113',
 detail:'M66 104V76H94 M146 76H174V104 M174 206V234H146 M94 234H66V206 M108 155H132 M120 143V167',
 generic:'M66 61H174Q186 61 186 73V247Q186 259 174 259H66Q54 259 54 247V73Q54 61 66 61Z'
};
export function GuidedCamera({guide,onSave,onClose}){
 const video=useRef(null),stream=useRef(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState('');
 useEffect(()=>{let cancelled=false;async function start(){try{if(!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600}},audio:false});if(cancelled){media.getTracks().forEach(t=>t.stop());return}stream.current=media;video.current.srcObject=media;await video.current.play();}catch{if(!cancelled)setError('暂时无法打开相机，请允许相机权限，或返回使用照片上传。')}}start();return()=>{cancelled=true;stream.current?.getTracks().forEach(t=>t.stop())}},[]);
 function capture(){const v=video.current;if(!v?.videoWidth)return;const c=document.createElement('canvas');const ratio=Math.min(1,1600/Math.max(v.videoWidth,v.videoHeight));c.width=Math.round(v.videoWidth*ratio);c.height=Math.round(v.videoHeight*ratio);c.getContext('2d').drawImage(v,0,0,c.width,c.height);setPreview(c.toDataURL('image/jpeg',.9));}
 return <section className="guided-camera" aria-label="线框辅助拍照"><header><button type="button" onClick={onClose}>返回核对</button><b>{preview?'确认照片':'对齐轮廓拍摄'}</b></header><div className="guided-view"><video ref={video} muted playsInline style={{display:preview?'none':'block'}} onLoadedData={()=>setReady(true)}/>{preview?<img src={preview} alt="刚拍摄的原始照片"/>:<><svg viewBox="0 0 240 320" aria-label="拍摄参考轮廓"><path d={paths[guide.frame]||paths.generic}/></svg></>}</div><h3>{guide.title||'让物品完整进入框内'}</h3><p>{guide.angle||'保持光线充足，对齐参考轮廓，保留真实使用痕迹。'}</p><small>参考线不自动检测对齐，也不会写入照片。取景画面仅在本机显示。</small>{error&&<p role="alert">{error}</p>}<div className="guided-actions">{preview?<><button type="button" onClick={()=>setPreview('')}>重拍</button><button type="button" className="btn purple" onClick={()=>onSave(preview)}>使用这张照片</button></>:<button type="button" className="btn purple" disabled={!ready||!!error} onClick={capture}>拍照</button>}</div></section>;
}
