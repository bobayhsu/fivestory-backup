/* FiveStory mobile red text correction V4.
   The original large index.html has a font calibration routine that assigns
   inline !important font sizes successively to p, b, and span.  Descendant
   sizes can therefore shrink repeatedly on mobile.  Match the host p's
   computed size, then re-check in case webfonts/calibration run later. */
(()=>{
 'use strict';
 const mobile=()=> /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && innerWidth<=1400);
 if(!mobile())return;
 let touched=0, shown=false;
 function fix(){
   const stage=document.getElementById('stage');
   if(!stage)return;
   let found=0, changed=0;
   stage.querySelectorAll('p.step').forEach(p=>{
     const size=parseFloat(getComputedStyle(p).fontSize);
     if(!Number.isFinite(size)||size<5)return;
     p.querySelectorAll('b span').forEach(span=>{
       const c=getComputedStyle(span).color;
       if(c!=='rgb(196, 31, 39)' && c!=='rgb(210, 38, 46)')return;
       found++;
       const b=span.closest('b');
       if(b&&Math.abs(parseFloat(getComputedStyle(b).fontSize)-size)>.35){b.style.setProperty('font-size',size+'px','important');changed++;}
       if(Math.abs(parseFloat(getComputedStyle(span).fontSize)-size)>.35){span.style.setProperty('font-size',size+'px','important');changed++;}
     });
   });
   touched+=changed;
   if(found && !shown){
     shown=true;
     const toast=document.createElement('div');
     toast.textContent='手機紅字修正已啟動（'+found+' 處）';
     toast.style.cssText='position:fixed;left:50%;top:55px;transform:translateX(-50%);z-index:2147483647;background:#242424;color:#fff;border-radius:12px;padding:7px 12px;font:14px sans-serif;pointer-events:none;box-shadow:0 3px 12px #0003';
     document.body.appendChild(toast);setTimeout(()=>toast.remove(),4500);
   }
   const badge=document.getElementById('syncState');
   if(badge)badge.title='手機紅字V4已載入；找到'+found+'處，累計調整'+touched+'次';
 }
 function start(){fix();setTimeout(fix,450);setTimeout(fix,1400);setInterval(fix,1200);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 if(document.fonts?.ready)document.fonts.ready.then(fix).catch(()=>{});
 addEventListener('resize',fix,{passive:true});
})();
