import React,{useEffect,useRef} from 'react';
import {ArrowRight} from '@phosphor-icons/react';
import './brand.css';
export const brandMark=`${import.meta.env.BASE_URL}assets/xiaoya-mark.svg`;
export function BrandWelcome({onEnter}){
 const title=useRef();
 useEffect(()=>{title.current?.focus()},[]);
 return <main className="brand-welcome" aria-labelledby="welcome-title">
  <div className="welcome-top"><span className="welcome-dot"/>小谷围的校园好物社区<span>HELLO, NEXT.</span></div>
  <section className="welcome-identity">
   <div className="welcome-emblem"><span className="welcome-orbit" aria-hidden="true"/><img src={brandMark} alt="两片新叶、微笑和紫色小挎包组成的小芽标志"/><span className="welcome-note">下一站，还会被喜欢。</span></div>
   <p className="welcome-english">XIAOYA · CAMPUS RELAY</p>
   <h1 id="welcome-title" ref={title} tabIndex={-1}>小芽<span>接力</span></h1>
   <p className="welcome-tagline">让好物，再长出一个故事。</p>
   <p className="welcome-description">闲置遇见新同学，<br/>小芽陪你，把喜欢继续传下去。</p>
  </section>
  <div className="welcome-bottom"><div className="welcome-values"><span>校园好物</span><i/><span>免费接力</span><i/><span>小芽陪伴</span></div><button className="welcome-enter" onClick={onEnter}>进入小芽接力 <ArrowRight size={21}/></button><p>从一件好物，认识下一段校园生活。</p></div>
 </main>;
}
