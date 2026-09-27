import React,{useEffect,useRef} from 'react';
import './brand.css';
export const brandMark=`${import.meta.env.BASE_URL}assets/xiaoya-mark.svg`;
export function BrandWelcome({onEnter}){
 const title=useRef();
 useEffect(()=>{title.current?.focus()},[]);
 return <main className="brand-welcome" aria-labelledby="welcome-title">
  <section className="welcome-identity">
   <div className="welcome-emblem"><img src={brandMark} alt="两片新叶、微笑和紫色小挎包组成的小芽标志"/></div>
   <h1 id="welcome-title" ref={title} tabIndex={-1}>小芽<span>接力</span></h1>
   <p className="welcome-tagline">让好物，再长出一个故事。</p>
  </section>
  <div className="welcome-bottom"><button className="welcome-enter" onClick={onEnter}>进入小芽接力</button></div>
 </main>;
}
