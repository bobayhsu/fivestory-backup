(()=>{
'use strict';
const query=new URLSearchParams(location.search);
if(!query.has('sync') || window.__TIMER) return;
const room=query.get('sync')||'demo';
// Avoid sending invalid database path characters
if(!/^[a-zA-Z0-9_-]{4,60}$/.test(room)){alert('同步房間代碼須為 4–60 位英數字、底線或連字號');return;}
const badge=document.createElement('div');badge.id='syncState';badge.textContent='同步：準備中';document.body.appendChild(badge);
const cfg=window.FIVESTORY_FIREBASE_CONFIG;
if(!cfg || !cfg.apiKey || cfg.apiKey==='請填入'||!cfg.databaseURL||cfg.databaseURL.includes('請填入')){
 badge.textContent='同步尚未設定 Firebase（閱讀操作說明）'; return;
}
if(typeof firebase==='undefined'){badge.textContent='Firebase 程式未載入，請檢查網路';return;}
let db;
try{if(!firebase.apps.length)firebase.initializeApp(cfg);db=firebase.database();}
catch(e){badge.textContent='Firebase 設定錯誤';console.error(e);return;}
const auth=firebase.auth();
const allowedUid='SdAwYAot8XgXLqcSLjY7H8H7s1A3';
const login=document.createElement('button');
login.textContent='使用 Google 登入同步';
Object.assign(login.style,{position:'fixed',zIndex:'100000',bottom:'52px',left:'8px',background:'#fff',color:'#111',border:'2px solid #c41f27',borderRadius:'12px',padding:'12px',fontSize:'16px',cursor:'pointer'});
document.body.appendChild(login);
login.addEventListener('click',async()=>{
 try{await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());}
 catch(err){badge.textContent='登入失敗：'+err.code;console.error(err);}
});
let started=false;
auth.onAuthStateChanged(user=>{
 if(!user){badge.textContent='請先使用 Google 登入';login.style.display='block';return;}
 if(user.uid!==allowedUid){badge.textContent='此帳號未獲授權控制同步';login.style.display='block';auth.signOut();return;}
 login.style.display='none';badge.textContent='已登入，正在連接同步';
 if(!started){started=true;beginSync();}
});
function beginSync(){
const ref=db.ref('rooms/'+room+'/screen');
const nodeId=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());
const slideEls=[...document.querySelectorAll('#stage > .slide')];
const overlayIds=['formula','ov-map','ov-star','ov-bird','ov-girl','endPage'];
let connected=false, applying=false, latest='', latestRemote='', pending=null, initial=true;
const keysToTrack=['.slide.active','.step.shown','.ovPage.open','#pv.open','#pv .drPage.open','#endPage.open','.hs.on','.fwrap.annOn','.tab.on','.row5.on'];
function capture(){
 const active=document.querySelector('#stage>.slide.active');
 const ix=slideEls.indexOf(active);
 return {
  slide:Math.max(0,ix),
  shown:slideEls.map((el)=>[...el.querySelectorAll('.step')].map((n,i)=>n.classList.contains('shown')?i:null).filter(v=>v!==null)),
  pv:document.getElementById('pv')?.classList.contains('open')||false,
  overlays:overlayIds.filter(id=>document.getElementById(id)?.classList.contains('open')),
  activeHotspots:[...document.querySelectorAll('.hs')].map((el,i)=>el.classList.contains('on')?i:null).filter(v=>v!==null),
  activeTabs:[...document.querySelectorAll('#stage .tab, #types .row5, #pv .types .s')].map((el,i)=>el.classList.contains('on')?i:null).filter(v=>v!==null),
  annotations:[...document.querySelectorAll('.fwrap')].map((el,i)=>el.classList.contains('annOn')?i:null).filter(v=>v!==null),
  practice:[...document.querySelectorAll('#pv .drPage')].map((el,i)=>el.classList.contains('open')?i:null).filter(v=>v!==null)
 };
}
function apply(s){
 if(!s||!Number.isInteger(s.slide)||s.slide<0||s.slide>=slideEls.length)return;
 applying=true;
 try{
   // DOM only: don't call jump/show, as that would reset local interface unexpectedly.
   slideEls.forEach((el,i)=>el.classList.toggle('active',i===s.slide));
   slideEls.forEach((el,i)=>{const shown=new Set(s.shown?.[i]||[]);el.querySelectorAll('.step').forEach((n,j)=>n.classList.toggle('shown',shown.has(j)));});
   const n=document.getElementById('num'),b=document.getElementById('bar');
   if(n)n.textContent=(s.slide+1)+' / '+slideEls.length;
   if(b)b.style.width=((s.slide+1)/slideEls.length*100)+'%';
   document.getElementById('pv')?.classList.toggle('open',!!s.pv);
   overlayIds.forEach(id=>document.getElementById(id)?.classList.toggle('open',(s.overlays||[]).includes(id)));
   document.querySelectorAll('.hs').forEach((el,i)=>el.classList.toggle('on',(s.activeHotspots||[]).includes(i)));
   document.querySelectorAll('#stage .tab, #types .row5, #pv .types .s').forEach((el,i)=>el.classList.toggle('on',(s.activeTabs||[]).includes(i)));
   document.querySelectorAll('.fwrap').forEach((el,i)=>el.classList.toggle('annOn',(s.annotations||[]).includes(i)));
   document.querySelectorAll('#pv .drPage').forEach((el,i)=>el.classList.toggle('open',(s.practice||[]).includes(i)));
   history.replaceState(null,'','#'+(s.slide+1));
   latest=JSON.stringify(capture());
 }finally{setTimeout(()=>applying=false,100);}
}
function send(){
 if(!connected||applying||initial)return;
 const s=capture(), val=JSON.stringify(s);
 if(val===latest)return;
 latest=val;
 ref.set({v:1,source:nodeId,at:firebase.database.ServerValue.TIMESTAMP,screen:s}).catch(e=>{badge.textContent='寫入失敗：請檢查資料庫規則';console.error(e);});
}
ref.on('value',snap=>{
 const packet=snap.val();
 if(packet?.screen){
  if(packet.source!==nodeId){latestRemote=JSON.stringify(packet.screen);apply(packet.screen);}
  else latest=JSON.stringify(packet.screen);
 } else if(initial){
  // First participant initializes the session.
  initial=false;send();
 }
 if(initial)initial=false;
 badge.textContent='同步已連線：'+room;
},e=>{badge.textContent='同步連線失敗：檢查資料庫規則';console.error(e);});
db.ref('.info/connected').on('value',s=>{connected=!!s.val();if(!connected)badge.textContent='同步網路中斷';});
// Poll only the compact *state*; write only on change. Helps with nested original handlers.
setInterval(send,400);
}
})();
