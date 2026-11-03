/* FiveStory video resource list sync V6. Adds category/dropdown state syncing; preserves V5 player. */
(()=>{
'use strict';
const q=new URLSearchParams(location.search);
if(!q.has('sync')||!window.firebase?.database)return;
const room=q.get('sync')||'demo';
if(!/^[A-Za-z0-9_-]{4,60}$/.test(room))return;
const iframe=document.getElementById('syncExternalFrame');
const layer=document.getElementById('fivestorySyncedExternal');
if(!iframe||!layer)return;
const ref=firebase.database().ref('rooms/'+room+'/screen/videoCommand');
const self='video-list-v6-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let watched=null, applying=false,last='', pending=null;
const active=()=>layer.style.display!=='none' && (iframe.getAttribute('src')||'').startsWith('https://bobayhsu.github.io/allbobay/');
function send(data){
 if(applying||!active())return;
 ref.set({sender:self,id:self+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),at:firebase.database.ServerValue.TIMESTAMP,kind:'listUI',...data}).catch(e=>console.error('影片列表同步失敗',e));
}
function onClick(e){
 if(applying||!active()||!watched)return;
 const summary=e.target.closest?.('details.card > summary');
 if(summary){
  const d=summary.closest('details.card');
  const n=[...watched.querySelectorAll('details.card')].indexOf(d);
  if(n<0)return;
  // Native details toggling completes after click; send final state, not merely a toggle.
  setTimeout(()=>send({part:'category',index:n,opened:d.open}),0);
  return;
 }
 const b=e.target.closest?.('.custom-select-button');
 if(b){
  const s=b.closest('.custom-select');
  const n=[...watched.querySelectorAll('.custom-select')].indexOf(s);
  if(n<0)return;
  setTimeout(()=>send({part:'dropdown',index:n,opened:s.classList.contains('open')}),30);
 }
}
function unbind(){if(watched){watched.removeEventListener('click',onClick,true);watched=null}}
function bind(){
 unbind();
 try{
  const d=iframe.contentDocument;
  if(!d?.body||!iframe.contentWindow.location.href.startsWith('https://bobayhsu.github.io/allbobay/'))return;
  watched=d;d.addEventListener('click',onClick,true);
  if(pending){const x=pending;pending=null;apply(x)}
 }catch(e){console.warn('影片列表 iframe 讀取失敗',e)}
}
function apply(cmd){
 if(!active()||!watched){pending=cmd;return}
 const n=cmd.index;
 if(!Number.isInteger(n)||n<0||n>200)return;
 applying=true;
 try{
  if(cmd.part==='category'){
   const d=watched.querySelectorAll('details.card')[n];
   if(d&&d.open!==!!cmd.opened)d.open=!!cmd.opened;
  } else if(cmd.part==='dropdown'){
   const s=watched.querySelectorAll('.custom-select')[n];
   if(s&&s.classList.contains('open')!==!!cmd.opened){
    const btn=s.querySelector('.custom-select-button');
    // Use the site's own click handler to preserve other menu behavior.
    if(btn)btn.click();else s.classList.toggle('open',!!cmd.opened);
   }
  }
 }finally{setTimeout(()=>{applying=false},60)}
}
iframe.addEventListener('load',bind);
setInterval(()=>{if(active()&&!watched)bind();if(active()&&pending&&watched){const x=pending;pending=null;apply(x)}},450);
const started=Date.now();
ref.on('value',snap=>{
 const cmd=snap.val();
 if(!cmd?.id||cmd.id===last||cmd.sender===self||cmd.kind!=='listUI')return;
 last=cmd.id;
 if(typeof cmd.at==='number'&&cmd.at<started-2000)return;
 apply(cmd);
},e=>console.error('影片列表同步讀取失敗',e));
})();
