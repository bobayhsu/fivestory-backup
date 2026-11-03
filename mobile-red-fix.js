/* FiveStory mobile red text fix. Load after the main inline scripts. */
(()=>{'use strict';
const isPhone=()=>matchMedia('(pointer: coarse) and (max-width: 1400px)').matches;
function fix(){
 if(!isPhone())return;
 document.querySelectorAll('#stage .slide p.step').forEach(p=>{
  const size=getComputedStyle(p).fontSize;
  p.querySelectorAll('b > span[style*="C41F27"], b > span[style*="c41f27"]').forEach(span=>{
   const parent=span.parentElement;
   parent.style.setProperty('font-size',size,'important');
   span.style.setProperty('font-size',size,'important');
   span.style.setProperty('line-height','inherit','important');
   span.style.setProperty('vertical-align','baseline','important');
  });
 });
}
function apply(){setTimeout(fix,150);setTimeout(fix,700);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
if(document.fonts?.ready)document.fonts.ready.then(apply);
window.addEventListener('resize',apply,{passive:true});
})();
