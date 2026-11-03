(()=>{
'use strict';
const query=new URLSearchParams(location.search);
if(!query.has('sync') || window.__TIMER) return;
const room=query.get('sync')||'demo';
// Avoid sending invalid database path characters
if(!/^[a-zA-Z0-9_-]{4,60}$/.test(room)){alert('同步房間代碼須為 4–60 位英數字、底線或連字號');return;}
const badge=document.getElementById('syncState')||document.createElement('div');badge.id='syncState';badge.textContent='同步：準備中';if(!badge.isConnected)document.body.appendChild(badge);
const cfg=window.FIVESTORY_FIREBASE_CONFIG;
if(!cfg || !cfg.apiKey || cfg.apiKey==='請填入'||!cfg.databaseURL||cfg.databaseURL.includes('請填入')){
 badge.textContent='同步尚未設定 Firebase（閱讀操作說明）'; return;
}
if(typeof firebase==='undefined'){badge.textContent='Firebase 程式未載入，請檢查網路';return;}
let db;
try{if(!firebase.apps.length)firebase.initializeApp(cfg);db=firebase.database();}
catch(e){badge.textContent='Firebase 設定錯誤';console.error(e);return;}
// Public room: no Google sign-in. Anyone with the URL can control the shared screen.
// The database rules must explicitly permit reads/writes to this room.
 try{beginSync();}catch(err){badge.textContent='同步啟動失敗：'+err.message;console.error(err);}
function beginSync(){
const ref=db.ref('rooms/'+room+'/screen');
const nodeId=(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function')?crypto.randomUUID():String(Date.now())+Math.random();
const slideEls=[...document.querySelectorAll('#stage > .slide')];
const overlayIds=['formula','ov-map','ov-star','ov-bird','ov-girl','endPage'];

// Two external video links are shown inside the same synchronized page.
// External websites are not controllable by the Firebase screen state.
const externalTargets={
 'https://bobayhsu.github.io/bullseye/':{title:'說書人',frame:'https://bobayhsu.github.io/bullseye/'},
 'https://bobayhsu.github.io/allbobay/':{title:'影片資源',frame:'https://bobayhsu.github.io/allbobay/'},
 'https://www.youtube.com/watch?v=CSuwxPxaJSQ':{title:'看影片',frame:'https://www.youtube-nocookie.com/embed/CSuwxPxaJSQ?rel=0'}
};
let externalPage='';
const layer=document.createElement('div');
layer.id='fivestorySyncedExternal';
layer.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#101010;display:none;flex-direction:column;color:#fff;font-family:sans-serif;';
layer.innerHTML='<div style="display:flex;gap:12px;align-items:center;padding:10px 12px;background:#171717;min-height:46px"><strong id="syncExternalTitle" style="flex:1">影片</strong><a id="syncExternalOpen" style="color:#fff;text-decoration:underline;font-size:14px" href="#" target="_blank" rel="noopener noreferrer">另開網站</a><button id="syncExternalClose" type="button" style="background:#fff;color:#111;border:0;border-radius:9px;padding:9px 14px;font-weight:bold;cursor:pointer">返回故事</button></div><iframe id="syncExternalFrame" title="同步影片視窗" style="flex:1;width:100%;min-height:0;border:0;background:#fff" allow="accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
document.body.appendChild(layer);
const frame=layer.querySelector('#syncExternalFrame');
function showExternal(url){
  if(url===externalPage)return;
  externalPage=url||'';
  layer.style.display=externalPage?'flex':'none';
  if(externalPage){
    const item=externalTargets[externalPage];
    layer.querySelector('#syncExternalTitle').textContent=item.title;
    layer.querySelector('#syncExternalOpen').href=externalPage;
    frame.src=item.frame;
  }else{frame.removeAttribute('src');}
}
layer.querySelector('#syncExternalClose').addEventListener('click',()=>showExternal(''));
// Only the two precise links are intercepted; normal pages retain normal behavior.
document.addEventListener('click',e=>{
 const a=e.target.closest?.('a[href]');
 if(!a)return;
 const key=a.dataset.syncVideo==='resources'?'https://bobayhsu.github.io/allbobay/':a.dataset.syncVideo==='youtube'?'https://www.youtube.com/watch?v=CSuwxPxaJSQ':a.href;
 if(!Object.prototype.hasOwnProperty.call(externalTargets,key))return;
 e.preventDefault();e.stopImmediatePropagation();showExternal(key);
},true);

let connected=false, applying=false, latest='', latestRemote='', pending=null, initial=true;
let timerRevision=0, lastTimerFingerprint='';
const deepCopy=o=>o?JSON.parse(JSON.stringify(o)):null;
const stableTimers=()=>({pv:window.__pvTimerSync?.get(),fm:window.__fmTimerSync?.get()});
function timerKey(){const t=stableTimers();return JSON.stringify({pv:t.pv?{m:t.pv.selectedMinutes,end:t.pv.endAt,remaining:t.pv.endAt?0:t.pv.remaining}:null,fm:t.fm?{t:t.fm.total,end:t.fm.endAt,remaining:t.fm.endAt?0:t.fm.remaining}:null});}
let lastTimerKey='';
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
  practice:[...document.querySelectorAll('#pv .drPage')].map((el,i)=>el.classList.contains('open')?i:null).filter(v=>v!==null),
  drill:document.getElementById('drill')?.classList.contains('open')||false,
  externalPage:externalPage,
  timerMode:document.body.classList.contains('tmode'),
  timers:stableTimers()
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
   document.getElementById('drill')?.classList.toggle('open',!!s.drill);
   showExternal(externalTargets[s.externalPage]?s.externalPage:'');
   // Recreate timer inline mode without opening an extra browser tab.
   if(s.timerMode && !document.body.classList.contains('tmode')) window.__openTimer?.();
   if(!s.timerMode && document.body.classList.contains('tmode')){document.body.classList.remove('tmode');document.getElementById('pv')?.classList.remove('open');document.querySelectorAll('[data-tmh]').forEach(el=>{el.style.display=el.dataset.tmh||'';delete el.dataset.tmh;});}
   window.__pvTimerSync?.apply(s.timers?.pv);
   window.__fmTimerSync?.apply(s.timers?.fm);
   history.replaceState(null,'','#'+(s.slide+1));
   latest=stable(capture());
 }finally{setTimeout(()=>applying=false,100);}
}
function stable(s){const x=deepCopy(s);if(x?.timers?.pv?.endAt)x.timers.pv.remaining=0;if(x?.timers?.fm?.endAt)x.timers.fm.remaining=0;return JSON.stringify(x);}
function send(){
 if(!connected||applying||initial)return;
 const s=capture(), val=stable(s);
 if(val===latest)return;
 latest=val;
 ref.update({v:1,source:nodeId,at:firebase.database.ServerValue.TIMESTAMP,screen:s}).catch(e=>{badge.textContent='寫入失敗：請檢查資料庫規則';console.error(e);});
}
ref.on('value',snap=>{
 const packet=snap.val();
 if(packet?.screen){
  if(packet.source!==nodeId){latestRemote=stable(packet.screen);apply(packet.screen);}
  else latest=stable(packet.screen);
 } else if(initial){
  // First participant initializes the session.
  initial=false;connected=true;send();
 }
 if(initial)initial=false;
 badge.textContent='同步已連線：'+room;
},e=>{badge.textContent='同步連線失敗：檢查資料庫規則';console.error(e);});
db.ref('.info/connected').on('value',s=>{connected=!!s.val();if(!connected)badge.textContent='同步網路中斷';});
// Poll only the compact *state*; write only on change. Helps with nested original handlers.
setInterval(send,400);
}
})();
