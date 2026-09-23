import React,{useEffect,useState,useRef} from 'react';
import {Sun,Drop,HandTap,Flower,Star,Leaf,Ticket,Images,Question,ArrowRight,Check,Heart} from '@phosphor-icons/react';
import {RelayGarden} from './RelayGarden';
import './sprout-game.css';
const today=()=>new Date().toLocaleDateString('en-CA');
const initial=()=>{const base={day:today(),suns:[],watered:false,patted:false,love:0,decor:'none',trial:false};try{const c=JSON.parse(localStorage.getItem('relay-sprout-care'));if(!c||typeof c!=='object')return base;return {...base,...c,suns:Array.isArray(c.suns)?c.suns.filter(n=>[0,1,2].includes(n)):[],love:Number.isFinite(c.love)?Math.max(0,c.love):0,decor:['none','star','flower'].includes(c.decor)?c.decor:'none'}}catch{return base}};
const sayings=['你来啦！今天也想晒晒太阳。','旧台灯也可以照亮新故事呀。','不用每天打卡，我会乖乖等你。','送给需要的人，比闲着更开心。','再摸摸我的叶子嘛。'];
export function SproutGame({garden,setGarden,drafts,items,onPublish}){
 const [care,setCare]=useState(initial),[speech,setSpeech]=useState(sayings[0]),[reaction,setReaction]=useState(''),[panel,setPanel]=useState(null),[recordsTab,setRecordsTab]=useState('stories'),[line,setLine]=useState(0);
 const nextRef=useRef(),panelRef=useRef();
 useEffect(()=>{if(panel)panelRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[panel]);
 const day=today(),suns=care.day===day?care.suns:[],watered=care.day===day&&care.watered,patted=care.day===day&&care.patted;
 const level=Math.min(4,1+Math.floor(care.love/6)),coupons=garden.coupons.filter(c=>!c.usedAt).length;
 useEffect(()=>{try{localStorage.setItem('relay-sprout-care',JSON.stringify(care))}catch{}},[care]);
 useEffect(()=>{if(!reaction)return;const timer=setTimeout(()=>setReaction(''),1300);return()=>clearTimeout(timer)},[reaction]);
 const cheer=(text,kind)=>{setSpeech(text);setReaction(kind)};
 const updateDaily=fn=>setCare(c=>fn(c.day===day?c:{...c,day,suns:[],watered:false,patted:false}));
 const collect=n=>{if(suns.includes(n))return;updateDaily(c=>c.suns.includes(n)?c:{...c,suns:[...c.suns,n],love:c.love+1});cheer('暖乎乎的，叶子都舒展开啦！','sun')};
 const water=()=>{if(watered){cheer('今天喝饱啦，谢谢你照顾我。','happy');return}updateDaily(c=>c.watered?c:({...c,watered:true,love:c.love+2}));cheer('咕嘟咕嘟，好舒服呀！','water')};
 const pat=()=>{if(!patted)updateDaily(c=>c.patted?c:({...c,patted:true,love:c.love+1}));const next=(line+1)%sayings.length;setLine(next);cheer(sayings[next],'happy')};
 const trial=()=>{setTimeout(()=>nextRef.current?.scrollIntoView({behavior:'smooth',block:'center'}),50);if(care.trial){cheer('那盆花已经有新主人啦，故事还在继续。','happy');return}setCare(c=>({...c,trial:true,love:c.love+3}));cheer('花盆找到新主人啦！我也长大了一点。','gift')};
 const showRecords=tab=>{setRecordsTab(tab);setPanel(panel===tab?null:tab)};
 return <div className="sprout-game"><div className="sprout-heading"><div><span>MY LITTLE RELAY</span><h3>今天，也一起发芽吧。</h3></div><button className="sprout-help" aria-label="玩法说明" onClick={()=>setPanel(panel==='help'?null:'help')}><Question size={23}/></button></div>
 <div className="sprout-first-guide"><b>从这里开始：点太阳 → 浇水 → 换装扮</b><span>3 亲密值换星星，6 亲密值换小花。接力奖励在下方领取指引。</span></div>
 <section className={`sprout-scene ${reaction?'is-'+reaction:''}`} aria-label="小芽的窗边小窝"><img className="sprout-world" src={`${import.meta.env.BASE_URL}assets/relay-sprout.webp`} alt="紫色花盆里的可爱小芽，住在阳光温暖的窗边"/><div className="sprout-level"><Leaf size={15} weight="fill"/>Lv.{level} 小芽<small>{care.love} 亲密值</small></div><div className="sprout-speech" aria-live="polite">{speech}</div>
 {[0,1,2].filter(n=>!suns.includes(n)).map(n=><button key={n} className={`sprout-sun sunshine-${n}`} aria-label={`收集第 ${n+1} 份阳光`} onClick={()=>collect(n)}><Sun size={29} weight="duotone"/><small>+1</small></button>)}
 <button className="sprout-pet" aria-label="摸摸小芽" onClick={pat}><span><HandTap size={16}/>戳戳我</span></button>
 {care.decor!=='none'&&<span className="sprout-decoration" aria-label={care.decor==='star'?'小芽戴上了星星贴纸':'小芽戴上了小花'}>{care.decor==='star'?<Star size={30} weight="fill"/>:<Flower size={34} weight="duotone"/>}</span>}
 {reaction&&<span key={reaction} className="sprout-reaction" aria-hidden="true">{reaction==='water'?<Drop size={43} weight="duotone"/>:reaction==='sun'?<Sun size={43} weight="fill"/>:<Heart size={43} weight="fill"/>}</span>}
 <div className="sprout-scene-caption">{suns.length===3?'今天的阳光都收好啦':'点一点发光的太阳，给小芽一点温暖'}</div></section>
 <div className="sprout-actions"><button onClick={water}><span><Drop size={25} weight="duotone"/></span><b>{watered?'喝饱啦':'浇点水'}</b><small>{watered?'点一下听回应':'亲密 +2'}</small></button><button onClick={pat}><span><HandTap size={25} weight="duotone"/></span><b>摸摸小芽</b><small>听听它说什么</small></button><button onClick={()=>setPanel(panel==='dress'?null:'dress')}><span><Flower size={25} weight="duotone"/></span><b>换个装扮</b><small>让小窝更可爱</small></button></div>
 {panel==='dress'&&<section ref={panelRef} className="sprout-sheet"><h4>今天戴什么？</h4><div className="sprout-outfits">{[['none','原来的样子',0],['star','小星星',3],['flower','小花花',6]].map(([id,label,need])=><button key={id} disabled={care.love<need} aria-pressed={care.decor===id} onClick={()=>{setCare(c=>({...c,decor:id}));cheer('喜欢！今天又是可爱的一天。','happy')}}>{id==='star'?<Star size={25} weight="duotone"/>:id==='flower'?<Flower size={25} weight="duotone"/>:<Leaf size={25}/>}<b>{label}</b><small>{care.love<need?`${need} 亲密值解锁`:care.decor===id?'穿戴中':'点一下换上'}</small></button>)}</div></section>}
 <button className="sprout-trial" onClick={trial}><span>{care.trial?<Check size={23}/>:<Heart size={23} weight="duotone"/>}</span><div><b>{care.trial?'花盆有了新家，小芽记住啦':'送出一盆花，会发生什么？'}</b><small>{care.trial?'试玩故事已点亮 · 不计入接力奖励':'点一下试玩，小芽陪你见证新故事'}</small></div><ArrowRight size={20}/></button>
 <section ref={nextRef} className="sprout-next"><span className="sprout-next-kicker">{care.trial?'试玩完成 · 下一步，把闲置送出去':'不只是养成，还有接力奖励'}</span><h4>免费送出一件好物，获得接力奖励</h4><div className="sprout-reward-pair"><div><Leaf size={22}/><b>+40</b><span>接力成长值</span></div><div><Ticket size={22}/><b>+2 张</b><span>演示曝光券</span></div></div><ol><li><b>发布免费好物</b><span>拍照、确认信息，等待审核。</span></li><li><b>完成交接确认</b><span>在“我的”完成已发布物品的双方确认演示，才会发奖。</span></li><li><b>用券推荐自己的物品</b><span>进入“我的券”，选一件自己已发布的收费好物，获得 24 小时本机推荐展示。</span></li></ol><p>普通交易：20 成长值 + 1 张券。每件物品奖励一次，每 7 天可用券一次。养成互动和试玩不发券；当前不产生真实跨用户推流。</p><div className="sprout-next-buttons"><button onClick={onPublish}>去免费送一件 <ArrowRight size={18}/></button><button onClick={()=>showRecords('coupons')}>{coupons?`使用我的 ${coupons} 张券`:'查看我的奖励'}<Ticket size={18}/></button></div></section>
 <div className="sprout-footer-links"><button onClick={()=>showRecords('stories')}><Images size={20}/>接力相册</button><button onClick={()=>showRecords('coupons')}><Ticket size={20}/>我的券 {coupons>0&&<b>{coupons}</b>}</button><button onClick={onPublish}><Leaf size={20}/>去送好物</button></div>
 {(panel==='stories'||panel==='coupons')&&<section ref={panelRef} className="sprout-records"><RelayGarden key={recordsTab} initialTab={recordsTab} compact garden={garden} setGarden={setGarden} drafts={drafts} items={items}/></section>}
 {panel==='help'&&<section ref={panelRef} className="sprout-sheet"><h4>小芽的生活，很简单</h4><p>点阳光、浇水、摸摸小芽，攒亲密值解锁装扮。每天可收 3 份阳光，浇水 +2、第一次摸摸 +1；不来打卡也不会枯萎。</p><p>这些互动只用于养成，不兑换曝光。完成平台内的双方确认演示后，接力成长和演示券才会进入“相册 / 我的券”。免费接力 40 点、2 张券；普通交易 20 点、1 张券。同一物品只奖励一次。</p><p>当前是本机游戏，进度只保存在这个浏览器。曝光券仍是本机推荐演示，不产生跨用户推流。</p></section>}
 <p className="sprout-disclaimer">本机养成 · 轻松玩，不用打卡 · 互动不兑换真实流量</p></div>
}
