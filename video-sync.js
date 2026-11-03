/* FiveStory video bridge v4 — keep YouTube navigation in the synchronized player. */
(()=>{
'use strict';
const params=new URLSearchParams(location.search);
if(!params.has('sync') || !window.firebase?.database)return;
const room=params.get('sync')||'demo';
if(!/^[a-zA-Z0-9_-]{4,60}$/.test(room))return;
const resourceURL='https://bobayhsu.github.io/allbobay/';
const frame=document.getElementById('syncExternalFrame');
const layer=document.getElementById('fivestorySyncedExternal');
if(!frame||!layer)return;
const ref=firebase.database().ref('rooms/'+room+'/screen/videoCommand');
const sender='video-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const start=Date.now();
let last='', remote=false, watched=null, player=null, ready=false, currentID='', queued=null, pendingClicks=[];
let ytPromise=null, generation=0;
const resourceActive=()=>layer.style.display!=='none' && (frame.getAttribute('src')||'').startsWith(resourceURL);
const panel=document.createElement('div');
panel.id='fivestoryVideoPanel';
panel.style.cssText='position:fixed;inset:0;z-index:2147483200;background:#0b0e16;color:white;display:none;flex-direction:column;font-family:system-ui,"Microsoft JhengHei",sans-serif;';
panel.innerHTML=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 12px;background:#1b2030"><strong id="fsvTitle" style="flex:1;min-width:140px;font-size:15px">影片</strong><button type="button" id="fsvPlay">▶ 播放</button><button type="button" id="fsvPause">Ⅱ 暫停</button><button type="button" id="fsvBack">返回影片列表</button></div><div id="fsvPlayer" style="flex:1;min-height:120px;width:100%;display:grid;place-items:center"></div><div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1b2030;flex-wrap:wrap"><button type="button" id="fsvPrev">−10 秒</button><input id="fsvSeek" aria-label="影片進度" type="range" min="0" max="1000" value="0" style="flex:1;min-width:120px"><button type="button" id="fsvNext">+10 秒</button><button type="button" id="fsvMute">開啟聲音</button><span id="fsvStatus" style="font-size:12px;color:#cbd5e1">若桌機擋住自動播放，請在桌機按一次播放。</span></div>`;
document.body.appendChild(panel);
panel.querySelectorAll('button').forEach(b=>{b.style.cssText='border:0;border-radius:8px;padding:10px 12px;cursor:pointer;background:#fff;color:#151922;font-weight:700'});
const title=panel.querySelector('#fsvTitle'),slot=panel.querySelector('#fsvPlayer'),slider=panel.querySelector('#fsvSeek'),status=panel.querySelector('#fsvStatus'),muteBtn=panel.querySelector('#fsvMute');
function youtubeID(raw){
 try{
  const u=new URL(raw,resourceURL);const host=u.hostname.toLowerCase();
  if(host==='youtu.be')return /^[-\w]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):null;
  if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com','music.youtube.com'].includes(host)){
   const id=u.searchParams.get('v') || (/^\/(?:embed|shorts|live)\/([-\w]{11})/.exec(u.pathname)||[])[1];
   return /^[-\w]{11}$/.test(id||'')?id:null;
  }
 }catch(_){}return null;
}
function transmit(data){
 if(remote)return;
 ref.set({id:sender+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),sender,at:firebase.database.ServerValue.TIMESTAMP,...data}).catch(e=>{console.error('影片同步寫入失敗',e);status.textContent='影片同步寫入失敗：請檢查 Firebase 權限';});
}
function ytAPI(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(ytPromise)return ytPromise;
 ytPromise=new Promise((resolve,reject)=>{
  const prev=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{try{prev?.()}catch(_){}resolve(window.YT)};
  const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>reject(new Error('YouTube API 無法載入'));document.head.appendChild(s);
 });return ytPromise;
}
function setPlayback(op){
 if(!ready||!player){queued=op;return;}
 try{if(op==='play')player.playVideo();else if(op==='pause')player.pauseVideo();}catch(e){console.warn('影片播放控制',e)}
}
function seek(t){if(!Number.isFinite(t))return;if(ready&&player)try{player.seekTo(Math.max(0,t),true)}catch(e){console.warn('影片跳轉',e)}}
function showVideo(id,label){
 if(!/^[-\w]{11}$/.test(id||''))return;
 const token=++generation;currentID=id;title.textContent=label||'YouTube 影片';panel.style.display='flex';status.textContent='正在載入影片…';
 queued='play';ready=false;slider.value=0;
 if(player){try{player.destroy()}catch(_){}player=null}
 slot.replaceChildren();const mount=document.createElement('div');mount.id='fsvYouTubeMount';slot.appendChild(mount);
 ytAPI().then(YT=>{
  if(generation!==token||panel.style.display==='none')return;
  player=new YT.Player(mount,{width:'100%',height:'100%',videoId:id,
   playerVars:{playsinline:1,rel:0,origin:location.origin,enablejsapi:1,autoplay:1,mute:1},
   events:{onReady:()=>{if(generation!==token)return;ready=true;try{player.mute()}catch(_){}muteBtn.textContent='開啟聲音';status.textContent='已同步選片；若未播放，請點「播放」';if(queued){const p=queued;queued=null;setPlayback(p)}},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING)status.textContent='播放中（預設靜音）';},onError:e=>{status.textContent='影片無法嵌入播放（錯誤碼 '+e.data+'）';console.warn('YouTube iframe',e.data)}}});
 }).catch(e=>{status.textContent='無法載入 YouTube 播放器';console.error(e)});
}
function closeVideo(){
 ++generation;panel.style.display='none';currentID='';queued=null;ready=false;
 if(player){try{player.destroy()}catch(_){}player=null}slot.replaceChildren();
}
function play(op){setPlayback(op);transmit({kind:'playback',op})}
panel.querySelector('#fsvPlay').onclick=()=>play('play');
panel.querySelector('#fsvPause').onclick=()=>play('pause');
panel.querySelector('#fsvBack').onclick=()=>{closeVideo();transmit({kind:'close'})};
function delta(n){let t=0;try{t=player?.getCurrentTime()||0}catch(_){}const sec=Math.max(0,t+n);seek(sec);transmit({kind:'seek',seconds:sec})}
panel.querySelector('#fsvPrev').onclick=()=>delta(-10);
panel.querySelector('#fsvNext').onclick=()=>delta(10);
slider.addEventListener('change',()=>{let dur=0;try{dur=player?.getDuration()||0}catch(_){}if(dur>0){const sec=dur*Number(slider.value)/1000;seek(sec);transmit({kind:'seek',seconds:sec})}});
muteBtn.onclick=()=>{if(!player||!ready)return;let m=true;try{m=player.isMuted();if(m)player.unMute();else player.mute()}catch(_){}muteBtn.textContent=m?'靜音':'開啟聲音'};
setInterval(()=>{if(panel.style.display==='none'||!player||!ready||slider.matches(':active'))return;try{const d=player.getDuration(),t=player.getCurrentTime();if(d>0)slider.value=String(Math.max(0,Math.min(1000,Math.floor(t/d*1000))))}catch(_){}},500);
function cssPath(el){
 if(el.id)return '#'+CSS.escape(el.id);
 const p=[];while(el&&el.nodeType===1&&p.length<15){if(el.id){p.unshift('#'+CSS.escape(el.id));break}const parent=el.parentElement;if(!parent)break;const ix=Array.from(parent.children).filter(x=>x.tagName===el.tagName).indexOf(el)+1;p.unshift(el.tagName.toLowerCase()+':nth-of-type('+ix+')');el=parent}return p.join(' > ');
}
function getVideoTarget(target){
 const el=target?.closest?.('a[href], [data-url], [data-video-url], [data-youtube], .custom-select-item');
 if(!el)return null;
 const attr=el.getAttribute('data-url')||el.getAttribute('data-video-url')||el.getAttribute('data-youtube')||el.getAttribute('href');
 let id=youtubeID(attr||'');
 if(!id){const child=el.querySelector?.('a[href]');if(child)id=youtubeID(child.href)}
 return id?{id,title:(el.textContent||'YouTube 影片').trim().slice(0,150)}:null;
}
function videoClick(e){
 if(!resourceActive()||remote)return;
 const v=getVideoTarget(e.target);if(!v)return;
 e.preventDefault();e.stopImmediatePropagation();
 showVideo(v.id,v.title);transmit({kind:'select',videoID:v.id,title:v.title});
}
function generalClick(e){
 if(!resourceActive()||remote)return;
 if(getVideoTarget(e.target))return;
 const el=e.target.closest?.('summary,.custom-select-button,.book-hotspot,.book-close,button:not(.custom-select-item)');
 if(el)transmit({kind:'click',path:cssPath(el)});
}
function applyClick(path){try{const el=frame.contentDocument?.querySelector(path);if(!el)return false;remote=true;try{el.click()}finally{remote=false}return true}catch(_){return false}}
function unbind(){if(watched){watched.removeEventListener('click',videoClick,true);watched.removeEventListener('click',generalClick,true);watched=null}}
function bind(){
 unbind();try{const d=frame.contentDocument;if(!d?.body||!frame.contentWindow.location.href.startsWith(resourceURL))return;
  d.addEventListener('click',videoClick,true);d.addEventListener('click',generalClick,true);watched=d;
  if(pendingClicks.length){const old=pendingClicks.splice(0);old.forEach(p=>{if(!applyClick(p))pendingClicks.push(p)})}
 }catch(e){console.warn('無法監聽影片網站',e)}
}
frame.addEventListener('load',bind);
setInterval(()=>{if(resourceActive()&&!watched)bind();if(!resourceActive()&&panel.style.display!=='none')closeVideo()},700);
ref.on('value',snap=>{
 const cmd=snap.val();if(!cmd?.id||cmd.id===last||cmd.sender===sender)return;
 last=cmd.id;if(typeof cmd.at==='number'&&cmd.at<start-2000)return;
 remote=true;try{
  if(cmd.kind==='select'&&/^[-\w]{11}$/.test(cmd.videoID||''))showVideo(cmd.videoID,cmd.title);
  else if(cmd.kind==='playback'&&['play','pause'].includes(cmd.op))setPlayback(cmd.op);
  else if(cmd.kind==='seek'&&Number.isFinite(cmd.seconds))seek(cmd.seconds);
  else if(cmd.kind==='close')closeVideo();
  else if(cmd.kind==='click'&&typeof cmd.path==='string'){if(!applyClick(cmd.path))pendingClicks.push(cmd.path)}
 }finally{remote=false}
},e=>{status.textContent='影片同步讀取失敗';console.error(e)});
})();
