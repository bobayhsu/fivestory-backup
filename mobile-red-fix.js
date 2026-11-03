/* FiveStory phone-only red note sizing V5: moderate red notes, not main-text size. */
(()=>{
 'use strict';
 const mobile=()=> /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && innerWidth<=1400);
 if(!mobile())return;
 function fix(){
   const stage=document.getElementById('stage');
   if(!stage)return;
   stage.querySelectorAll('p.step').forEach(p=>{
     const mainSize=parseFloat(getComputedStyle(p).fontSize);
     if(!Number.isFinite(mainSize)||mainSize<5)return;
     // Half of the slideshow's unscaled base font; cap oversized labels.
     const target=Math.max(16,Math.min(36,mainSize*0.52));
     p.querySelectorAll('b span').forEach(span=>{
       const red=getComputedStyle(span).color;
       if(red!=='rgb(196, 31, 39)' && red!=='rgb(210, 38, 46)')return;
       const b=span.closest('b');
       if(b && Math.abs(parseFloat(getComputedStyle(b).fontSize)-target)>0.3)b.style.setProperty('font-size',target+'px','important');
       if(Math.abs(parseFloat(getComputedStyle(span).fontSize)-target)>0.3)span.style.setProperty('font-size',target+'px','important');
       span.style.setProperty('line-height','1.28','important');
       span.style.setProperty('vertical-align','baseline','important');
     });
   });
 }
 function start(){fix();setTimeout(fix,450);setTimeout(fix,1400);setInterval(fix,1200);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 if(document.fonts?.ready)document.fonts.ready.then(fix).catch(()=>{});
 addEventListener('resize',fix,{passive:true});
})();
