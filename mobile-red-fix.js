/* Mobile-only red emphasis resize. Does not modify desktop or synchronization. */
(()=>{'use strict';
  const phone=()=>window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches;
  function run(){
    if(!phone())return;
    document.querySelectorAll('#stage .slide p.step').forEach(p=>{
      const px=parseFloat(getComputedStyle(p).fontSize);
      if(!px||!Number.isFinite(px))return;
      const target=px+'px';
      p.querySelectorAll('b > span[style*="C41F27"],b > span[style*="c41f27"]').forEach(span=>{
        span.parentElement.style.setProperty('font-size',target,'important');
        span.style.setProperty('font-size',target,'important');
        span.style.setProperty('line-height','inherit','important');
        span.style.setProperty('vertical-align','baseline','important');
      });
    });
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;run()},200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  if(document.fonts?.ready)document.fonts.ready.then(schedule);
  window.addEventListener('resize',schedule,{passive:true});
  setTimeout(schedule,1100);
})();
