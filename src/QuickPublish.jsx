import React,{useState,useRef,useEffect} from 'react';
import {Camera,Check,CheckCircle,ArrowLeft,ArrowRight,Sparkle,MapPin,UploadSimple} from '@phosphor-icons/react';
import {schools,gates,meetingLabel,validMeeting} from './island';
import {analyzePhoto,aiAvailable} from './ai';
import {readPhoto,brighten} from './Publish';
import {categories,draftFromNote,extractOffer,validatePublish,followups,answerDescription} from './publishFlow';
import {PriceReference} from './PriceReference.jsx';
import {ServiceAccess} from './ServiceAccess';
import './quick-publish.css';

export function Publish({Modal,close,submit,school,items=[]}){
 const [step,setStep]=useState(1),[note,setNote]=useState('');
 const [d,setD]=useState({name:'',image:'',originalImage:'',description:'',category:'',condition:'见物品描述',price:'',school:schools.includes(school)?school:'',gate:'',history:'unknown',proof:'',previousPrice:'',date:'',source:'',sellerFaq:'',confirmed:false});
 const [extra,setExtra]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[adjusted,setAdjusted]=useState(false),[showOriginal,setShowOriginal]=useState(false),[guidance,setGuidance]=useState(''),[questions,setQuestions]=useState([]),[answers,setAnswers]=useState({});
 const controller=useRef(),lastInput=useRef(''),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort()}},[]);
 const set=(k,v)=>setD(p=>({...p,[k]:v,confirmed:k==='confirmed'?v:false}));
 const upload=async(e,k)=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);try{const src=await readPhoto(file);if(k==='image'){setD(v=>({...v,image:src,originalImage:src,confirmed:false}));setAdjusted(false);setGuidance('')}else if(k==='proof')set('proof',src);else{setExtra(v=>({...v,[k]:src}));set('confirmed',false)}setError('')}catch(e){setError(e.message)}finally{setBusy(false)}};
 const prepare=async(useAI)=>{
  if(busy)return;
  if(!d.image)return setError('先拍摄或上传一张物品照片。');
  const fingerprint=d.originalImage+'\n'+note+'\n'+useAI;
  if(lastInput.current===fingerprint){setStep(2);setError('');return;}
  setError('');setBusy(true);
  let draft=draftFromNote(note),message='已带入你的一句话，未进行图片识别。请核对名称、分类和状况。',q=[],failed=false;
  const request=new AbortController();controller.current=request;
  const timer=setTimeout(()=>request.abort(),60000);
  try{
   if(useAI){const r=await analyzePhoto(d.originalImage,request.signal,note);draft={...draft,...r,price:draft.price};message=r.guidance;q=r.questions||[];}
  }catch(e){failed=true;message=(e.name==='AbortError'?'识别超时。':e.message)+' 已保留你的文字，可以直接继续。';}
  finally{clearTimeout(timer);}
  if(mounted.current&&controller.current===request){
   setD(v=>({...v,name:draft.name,description:draft.description,category:draft.category||'',price:draft.price,confirmed:false}));
   setGuidance(message);setQuestions(q);setAnswers({});lastInput.current=failed?'':fingerprint;setStep(2);setBusy(false);
  }
 };
 const adjust=async()=>{setBusy(true);try{set('image',adjusted?d.originalImage:await brighten(d.originalImage));setAdjusted(!adjusted)}catch(e){setError(e.message)}finally{setBusy(false)}};
 const finish=()=>{
  const issue=validatePublish(d);if(issue)return setError(issue);
  if(!validMeeting(d.school,d.gate))return setError('请选择交接学校和校门口类型。');
  if(!d.confirmed)return setError('核对交易卡后，勾选确认即可提交。');
  submit({...d,description:answerDescription(d.description,answers),ownerNote:note,photos:extra,imageAdjusted:adjusted,pickup:meetingLabel(d.school,d.gate),id:`ITEM-${Date.now().toString(36).toUpperCase()}`,price:Number(d.price),owner:'我',platform:[],uploaded:d.history==='upload'?[{price:d.previousPrice===''?null:Number(d.previousPrice),date:d.date||'时间未知',source:d.source,proof:d.proof}]:[],status:'REVIEW',version:1,time:0});
 };
 return <Modal title="拍张照，让好物接力" close={close}>
  <div className="steps quick-steps">{['照片＋一句话','核对并提交'].map((s,i)=><span key={s} className={step===i+1?'active':step>i+1?'done':''} aria-current={step===i+1?'step':undefined}><b>{step>i+1?<Check size={14}/>:i+1}</b>{s}</span>)}</div>
  {step===1?<>
   <p className="modal-lead">不用想怎么填表。先给好物拍张照。</p>
   <label className={`upload-zone ${d.image?'has-photo':''}`}><input disabled={busy} type="file" accept="image/*" aria-label="上传物品照片" onChange={e=>upload(e,'image')}/>{d.image?<img src={showOriginal?d.originalImage:d.image} alt="物品照片"/>:<><Camera size={38}/><b>拍照或从相册选择</b><span>拍完整，保留真实使用痕迹</span></>}</label>
   <label className="field">随口说一句（可选）<textarea maxLength={1000} rows={2} disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder="例如：台灯，开关正常，底座有划痕，想卖 30 元。"/></label>
   {extractOffer(note)!==''&&<p className="offer-detected" role="status">已识别你的报价 <b>¥{extractOffer(note)}</b> · 下一步自动填入，可修改</p>}
   <details className="history-disclosure"><summary>补拍细节或调整照片（可选）</summary>
    <p className="fine-print">侧面拍接口，近一点拍磨损。只上传给 AI 的主图会参与识别。</p>
    <div className="extra-photos">{[['side','补一张侧面'],['defect','补一张缺陷特写']].map(([k,label])=><label key={k}><input disabled={busy} type="file" accept="image/*" aria-label={label} onChange={e=>upload(e,k)}/>{extra[k]?<img src={extra[k]} alt={label}/>:<Camera size={23}/>}<span>{label}</span></label>)}</div>
    {d.image&&<div className="photo-controls"><button className="outline-button" disabled={busy} onClick={adjust}>{adjusted?'恢复原图':'轻微提亮'}</button><label><input type="checkbox" checked={showOriginal} onChange={e=>setShowOriginal(e.target.checked)}/>对照原图</label><small>不修补划痕、不替换背景</small></div>}
   </details>
   <div className="quick-help"><Sparkle size={22}/><div><b>{aiAvailable?'AI 整理，你来核对':'说过的，不用再填一遍'}</b><p>{aiAvailable?'生成名称、分类和描述，只提醒需要补充的地方。':'先把文字带入交易卡。图片 AI 尚未连接，不会上传照片。'}</p></div></div>
   {aiAvailable&&<p className="fine-print">点击“交给 AI 整理”会将本张主图和这句话发送到配置的识别服务。</p>}
   {aiAvailable&&<ServiceAccess/>}
   <div className="modal-actions"><button className="btn purple" disabled={!d.image||busy} onClick={()=>prepare(aiAvailable)}>{busy?'正在整理…':aiAvailable?'交给 AI 整理':'整理成交易卡'}<ArrowRight size={17}/></button>{aiAvailable&&<button className="text-link" disabled={busy} onClick={()=>prepare(false)}>自己填写</button>}</div>
  </>:<>
   <div className="notice compact" role="status">{guidance}</div>
   <div className="quick-card"><img src={d.image} alt="待发布的物品"/><label className="field">物品名称<input maxLength={40} value={d.name} onChange={e=>set('name',e.target.value)}/></label></div>
   <label className="field">物品状况 · 可以直接修改<textarea rows={3} maxLength={1500} value={d.description} onChange={e=>set('description',e.target.value)} placeholder="简单说说功能、磨损和配件；不知道的可以写未知。"/></label>
   {questions.length>0&&<div className="quick-checks"><b>再补充这些就更清楚（可跳过）</b>{questions.filter(k=>followups[k]).map(k=><div key={k}><p>{followups[k].title}</p><div className="quick-questions">{followups[k].choices.map(a=><button key={a} className={`outline-button ${answers[k]===a?'selected':''}`} aria-pressed={answers[k]===a} onClick={()=>{setAnswers(v=>({...v,[k]:v[k]===a?'':a}));set('confirmed',false)}}>{a}</button>)}</div></div>)}</div>}
   <div className="quote-comparison"><div><label className="field">你的报价<input type="number" min="0" step="0.01" inputMode="decimal" value={d.price} onChange={e=>set('price',e.target.value)} placeholder="由你决定"/></label>
   <button className="outline-button quick-free" aria-pressed={d.price==='0'} onClick={()=>set('price','0')}>这件免费送</button>
   <label className="field">物品分类<select value={d.category} onChange={e=>set('category',e.target.value)}><option value="">请选择</option>{categories.map(s=><option key={s}>{s}</option>)}</select></label></div>
   <PriceReference name={d.name} items={items} currentPrice={d.price} onAdopt={value=>set('price',value)}/></div>
   <label className="field">在哪里交接？<select value={d.school} onChange={e=>{set('school',e.target.value);set('gate','')}}><option value="">选择学校</option>{schools.map(s=><option key={s}>{s}</option>)}</select></label>
   <div className="meeting-options quick-meeting" role="group" aria-label="选择规定交接点">{gates.map(g=><button aria-pressed={d.gate===g.id} className={d.gate===g.id?'selected':''} key={g.id} onClick={()=>set('gate',g.id)}><MapPin size={20}/><b>{g.name}</b>{d.gate===g.id&&<CheckCircle size={19}/>}</button>)}</div>
   <details className="history-disclosure"><summary>补充以前的交易记录（可选）{d.history==='upload'?' · 已添加凭证':''}</summary><label className="field">此前交易记录<select value={d.history} onChange={e=>set('history',e.target.value)}><option value="unknown">不知道／没有记录</option><option value="statement">有过交易，仅物主陈述</option><option value="upload">有凭证，可上传</option></select></label>{d.history==='upload'&&<><label className="upload-zone small-upload"><input disabled={busy} type="file" accept="image/*" aria-label="上传历史交易凭证" onChange={e=>upload(e,'proof')}/><UploadSimple size={24}/>{d.proof?'凭证已添加，点击更换':'添加历史凭证'}</label><label className="field">凭证来源<input maxLength={100} value={d.source} onChange={e=>set('source',e.target.value)} placeholder="例如：闲鱼订单截图"/></label><div className="form-row"><label className="field">历史价格（看不清可留空）<input type="number" min="0" step="0.01" value={d.previousPrice} onChange={e=>set('previousPrice',e.target.value)}/></label><label className="field">时间（可选）<input type="month" value={d.date} onChange={e=>set('date',e.target.value)}/></label></div></>}<p className="fine-print">上传记录单独标记，不计入平台交易次数。未知不代表从未交易。</p></details>
   <div className="quick-summary"><b>提交前核对</b><p>{d.price!==''?`报价 ¥${d.price}`:'报价待填写'} · {validMeeting(d.school,d.gate)?meetingLabel(d.school,d.gate):'交接点待选择'}</p><p>历史来源：{d.history==='upload'?'上传凭证':d.history==='statement'?'物主陈述':'未知'}{Object.values(answers).filter(Boolean).length>0?'；补充回答将加入物品描述。':''}</p></div>
   <label className="checkbox-line"><input type="checkbox" checked={d.confirmed} onChange={e=>set('confirmed',e.target.checked)}/>我已核对照片、描述、报价和交接点。</label>
   <p className="fine-print">校门外见面，具体时间双方商量。提交后进入审核；当前为本地演示。</p>
   <div className="modal-actions"><button className="outline-button" disabled={busy} onClick={()=>{setStep(1);set('confirmed',false);setError('')}}><ArrowLeft size={17}/>照片与原话</button><button className="btn purple" disabled={busy||!d.confirmed} onClick={finish}>确认并提交<CheckCircle size={18}/></button></div>
  </>}
  {error&&<p className="error" role="alert">{error}</p>}
 </Modal>;
}
