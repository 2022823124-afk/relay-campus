import React, {useEffect,useState} from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./phone-demo.css";
import "./icon-system.css";

// A real narrow viewport keeps every existing mobile breakpoint, fixed toolbar
// and modal identical to the phone experience. The embedded page never nests.
function Presentation(){
 const embedded=window.self!==window.top;
 const [desktop,setDesktop]=useState(()=>window.matchMedia('(min-width:601px)').matches);
 useEffect(()=>{
  const query=window.matchMedia('(min-width:601px)');
  const change=()=>setDesktop(query.matches);
  query.addEventListener('change',change);
  return ()=>query.removeEventListener('change',change);
 },[]);
 if(embedded||!desktop)return <App/>;
 return <main className="phone-demo-stage"><div className="phone-demo-device"><iframe className="phone-demo-screen" title="小芽接力 · 手机版演示" src={window.location.href}/></div></main>;
}
createRoot(document.getElementById("root")).render(<React.StrictMode><Presentation/></React.StrictMode>);
