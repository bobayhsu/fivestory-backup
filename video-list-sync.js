/* FiveStory video list synchronization V7.
 * Observe actual DOM state in the allbobay iframe. Keep this separate from YouTube playback commands.
 */
(()=>{
 'use strict';
 const q=new URLSearchParams(location.search);
 if(!q.has('sync')||!window.firebase?.database)return;
 const room=q.get('sync')||'demo';
 if(!/^[A-Za-z0-9_-]{4,60}$/.test(room))return;
 const frame=document.getElementById('syncExternalFrame');
 const layer=document.getElementById('fivestorySyncedExternal');
 if(!frame||!layer)return;
 const ref=firebase.database().ref('rooms/'+room+'/screen/videoListState');
 const baseURL='https://bobayhsu.github.io/allbobay/';
 const self='list7-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const began=Date.now();
 let doc=null,observer=null,armed=false,applying=false,lastSent='',lastReceived='',queued=null,sendTimer=null,remoteRevision=0;
 const active=()=>layer.style.display!=='none'&&(frame.getAttribute('src')||'').startsWith(baseURL);
 const elements=()=>({cards:[...doc.querySelectorAll('details.card')], menus:[...doc.querySelectorAll('.custom-select')]});
 function capture(){
  if(!doc)return null;
  const {cards,menus}=elements();
  return {
   cards:cards.map(d=>!!d.open),
   menus:menus.map(m=>m.classList.contains('open')),
   labels:menus.map(m=>m.querySelector('.custom-select-button')?.textContent||'')
  };
 }
 function commit(){
  sendTimer=null;
  if(!armed||!active()||applying||!doc)return;
  const state=capture(), serialized=JSON.stringify(state);
  if(serialized===lastSent)return;
  lastSent=serialized;
  ref.set({sender:self,at:firebase.database.ServerValue.TIMESTAMP,nonce:self+'-'+Date.now(),state})
   .catch(e=>{console.error('影片列表同步寫入失敗：',e);lastSent='';});
 }
 function schedule(){
  if(!armed||applying||!active())return;
  if(sendTimer)clearTimeout(sendTimer);
  sendTimer=setTimeout(commit,90);
 }
 function apply(state){
  if(!state||!Array.isArray(state.cards)||!Array.isArray(state.menus))return;
  if(!active()||!doc){queued=state;return;}
  applying=true;
  try{
   const {cards,menus}=elements();
   cards.forEach((d,i)=>{if(typeof state.cards[i]==='boolean' && d.open!==state.cards[i])d.open=state.cards[i]});
   menus.forEach((m,i)=>{
    if(typeof state.menus[i]==='boolean')m.classList.toggle('open',state.menus[i]);
    if(typeof state.labels?.[i]==='string'){
      const button=m.querySelector('.custom-select-button');
      if(button && button.textContent!==state.labels[i])button.textContent=state.labels[i];
    }
   });
   lastSent=JSON.stringify(capture());
  }finally{
   // MutationObserver callbacks and native <details> toggle events may be asynchronous.
   setTimeout(()=>{applying=false;},180);
  }
 }
 function unbind(){
  if(observer){observer.disconnect();observer=null;}
  if(doc){doc.removeEventListener('toggle',schedule,true);doc.removeEventListener('click',schedule,true);}
  doc=null;armed=false;
  if(sendTimer){clearTimeout(sendTimer);sendTimer=null;}
 }
 function bind(){
  unbind();
  if(!active())return;
  try{
   const d=frame.contentDocument;
   if(!d?.body||!frame.contentWindow.location.href.startsWith(baseURL))return;
   doc=d;
   // Observe real state rather than guessing whether a click will open/close.
   observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.attributeName==='open'||m.attributeName==='class'||m.type==='characterData'||m.type==='childList'))schedule();
   });
   observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open','class'],characterData:true,childList:true});
   doc.addEventListener('toggle',schedule,true);
   doc.addEventListener('click',schedule,true);
   lastSent=JSON.stringify(capture());
   armed=true;
   if(queued){const state=queued;queued=null;apply(state);}
   const badge=document.getElementById('syncState');if(badge)badge.title='影片列表同步 V7 已連接';
  }catch(e){console.warn('影片列表無法連接 iframe：',e);}
 }
 frame.addEventListener('load',bind);
 setInterval(()=>{if(active()&&!doc)bind();if(!active()&&doc)unbind();},500);
 ref.on('value',snap=>{
  const packet=snap.val();
  if(!packet?.state || packet.sender===self || packet.nonce===lastReceived)return;
  lastReceived=packet.nonce||'';
  if(typeof packet.at==='number' && packet.at<began-2000)return;
  apply(packet.state);
 },e=>console.error('影片列表同步讀取失敗：',e));
})();
