/* FiveStory YouTube bridge V9 — supports the main 看影片 button and allbobay lists. */
(()=>{
'use strict';
const qp=new URLSearchParams(location.search);
if(!qp.has('sync')||!window.firebase?.database)return;
const room=qp.get('sync')||'demo';
if(!/^[A-Za-z0-9_-]{4,60}$/.test(room))return;
const frame=document.getElementById('syncExternalFrame');
const layer=document.getElementById('fivestorySyncedExternal');
if(!frame||!layer)return;
const resourceURL='https://bobayhsu.github.io/allbobay/';
const actionRef=firebase.database().ref('rooms/'+room+'/screen/videoCommand');
const self='v5-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const began=Date.now();
let last='',remote=false,documentWatched=null,player=null,ready=false,playingID='',queued=null,generation=0,ytPromise=null,ignoreSelectUntil=0;
const active=()=>layer.style.display!=='none'&&(frame.getAttribute('src')||'').startsWith(resourceURL);
// The main 「看影片」 button opens a direct YouTube embed via sync.js.
// Its externalPage is already synchronized by the existing screen state.
const directVideoID='CSuwxPxaJSQ';
const directEmbedPrefix='https://www.youtube-nocookie.com/embed/'+directVideoID;
const directActive=()=>layer.style.display!=='none'&&(frame.getAttribute('src')||'').startsWith(directEmbedPrefix);
let directHandled=false;

function youtubeID(raw){
 try{const u=new URL(raw);const host=u.hostname.toLowerCase();
  if(host==='youtu.be'){const s=u.pathname.split('/')[1];return /^[\w-]{11}$/.test(s)?s:null;}
  if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host)){
   const s=u.searchParams.get('v')||(/^\/(?:embed|shorts|live)\/([\w-]{11})/.exec(u.pathname)||[])[1];
   return /^[\w-]{11}$/.test(s||'')?s:null;
  }
 }catch(_){}return null;
}
const panel=document.createElement('div');panel.id='fivestoryVideoPanel';
panel.style.cssText='position:fixed;inset:0;z-index:2147483200;display:none;flex-direction:column;background:#0b1020;color:white;font:15px system-ui,"Microsoft JhengHei",sans-serif;';
panel.innerHTML=`<style>
#fivestoryVideoPanel .fsv-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#1b2540;padding:10px max(10px,env(safe-area-inset-left))}
#fivestoryVideoPanel button{border:0;background:#fff;color:#14213d;border-radius:10px;padding:11px 13px;min-height:44px;font:700 15px system-ui;cursor:pointer}
#fivestoryVideoPanel #fsvSeek{flex:1;min-width:100px;accent-color:#e8c97a}
#fivestoryVideoPanel #fsvPlayer{flex:1;min-height:100px;background:#080c15;display:grid;place-items:center}
#fivestoryVideoPanel #fsvPlayer iframe{max-width:100%}
#fivestoryVideoPanel .fsv-status{font-size:12px;line-height:1.5;color:#ddd;padding:6px 12px;background:#101b32}
@media(max-width:600px){#fivestoryVideoPanel .fsv-bar{gap:6px;padding:7px}#fivestoryVideoPanel button{font-size:13px;padding:8px 10px}#fivestoryVideoPanel #fsvTitle{width:100%;flex:1 1 100%!important}}
</style><div class="fsv-bar"><strong id="fsvTitle" style="flex:1;min-width:110px">同步影片</strong><button id="fsvPlay">▶ 播放</button><button id="fsvPause">Ⅱ 暫停</button><button id="fsvBack">返回列表</button></div><div id="fsvPlayer"></div><div class="fsv-bar"><button id="fsvPrev">−10 秒</button><input id="fsvSeek" type="range" min="0" max="1000" value="0" aria-label="影片進度"><button id="fsvNext">+10 秒</button><button id="fsvMute">開啟聲音</button></div><div id="fsvStatus" class="fsv-status">選片後會同步開啟影片；部分手機與瀏覽器可能要求手動按播放。</div>`;
document.body.appendChild(panel);
const slot=panel.querySelector('#fsvPlayer'),title=panel.querySelector('#fsvTitle'),seekBar=panel.querySelector('#fsvSeek'),status=panel.querySelector('#fsvStatus'),muteButton=panel.querySelector('#fsvMute');
function transmit(data){if(remote)return;actionRef.set({id:self+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),sender:self,at:firebase.database.ServerValue.TIMESTAMP,...data}).catch(e=>{status.textContent='同步寫入失敗，請檢查 Firebase 權限';console.error(e)});}
function api(){if(window.YT?.Player)return Promise.resolve(window.YT);if(ytPromise)return ytPromise;ytPromise=new Promise((resolve,reject)=>{const prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{try{prior?.()}catch(_){}resolve(window.YT)};const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>reject(Error('YouTube API 載入失敗'));document.head.append(s)});return ytPromise;}
function playback(op){if(!ready||!player){queued=op;return;}try{if(op==='play')player.playVideo();if(op==='pause')player.pauseVideo()}catch(e){console.warn(e)}}
function jump(seconds){if(!Number.isFinite(seconds))return;try{if(ready&&player)player.seekTo(Math.max(0,seconds),true)}catch(e){console.warn(e)}}
function close(){generation++;panel.style.display='none';playingID='';ready=false;queued=null;try{player?.destroy()}catch(_){}player=null;slot.replaceChildren()}
function show(id,text){
 if(!/^[\w-]{11}$/.test(id||''))return;
 const token=++generation;playingID=id;title.textContent=text||'YouTube 影片';panel.style.display='flex';status.textContent='正在載入影片…';seekBar.value='0';queued='play';ready=false;
 try{player?.destroy()}catch(_){}player=null;slot.replaceChildren();const mount=document.createElement('div');mount.id='fsvMount';slot.append(mount);
 api().then(YT=>{if(token!==generation||panel.style.display==='none')return;
  player=new YT.Player(mount,{width:'100%',height:'100%',videoId:id,playerVars:{enablejsapi:1,playsinline:1,rel:0,origin:location.origin,autoplay:1,mute:1},events:{onReady:()=>{if(token!==generation)return;ready=true;try{player.mute()}catch(_){}muteButton.textContent='開啟聲音';status.textContent='已載入同步播放器。若未自動播放，請點「播放」。';const p=queued;queued=null;if(p)playback(p)},onError:e=>{status.textContent='此影片可能禁止嵌入播放（YouTube 錯誤碼 '+e.data+'）'}}});
 }).catch(e=>{status.textContent='YouTube 播放器載入失敗';console.error(e)});
}
function select(url,label){const id=youtubeID(url);if(!id||!active())return false;if(Date.now()<ignoreSelectUntil&&id===playingID)return true;ignoreSelectUntil=Date.now()+500;show(id,label);transmit({kind:'select',videoID:id,title:label||'YouTube 影片'});return true;}
// V9: intercept the main page's black 看影片 button at WINDOW capture phase.
// sync.js listens at document capture phase; window receives the event first.
// This bypasses its plain YouTube iframe and opens the synchronized controls.
window.addEventListener('click',e=>{
 const link=e.target?.closest?.('a[data-sync-video="youtube"],a.ytBtn');
 if(!link || !document.contains(link))return;
 const id=youtubeID(link.href);
 if(id!==directVideoID)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 show(id,'許川川田能久大蛇精');
 transmit({kind:'select',videoID:id,title:'許川川田能久大蛇精'});
},true);

// allbobay V5 sends this message directly, avoiding its window.open() behavior.
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.type!=='fivestory-video-select-v5')return;select(e.data.url,e.data.title)});
// Legacy allbobay support: intercept clicks at capture phase before its own window.open handler.
function onClick(e){if(!active()||remote)return;const el=e.target.closest?.('[data-url],a[href]');if(!el)return;const url=el.getAttribute('data-url')||el.getAttribute('href');if(!youtubeID(url))return;
 e.preventDefault();e.stopImmediatePropagation();select(url,(el.textContent||'YouTube 影片').trim());}
function unbind(){if(documentWatched){documentWatched.removeEventListener('click',onClick,true);documentWatched=null}}
function bind(){unbind();try{const d=frame.contentDocument;if(!d?.body||!frame.contentWindow.location.href.startsWith(resourceURL))return;d.addEventListener('click',onClick,true);documentWatched=d}catch(e){console.warn('無法監控影片資源頁面',e)}}
frame.addEventListener('load',bind);
setInterval(()=>{
 if(active()&&!documentWatched)bind();
 // Show synchronized controls on both devices when sync.js opens the fixed video.
 if(directActive()){
  if(!directHandled){directHandled=true;show(directVideoID,'許川川田能久大蛇精');}
  return;
 }
 directHandled=false;
 if(!active()&&panel.style.display!=='none')close();
},250);
panel.querySelector('#fsvPlay').onclick=()=>{playback('play');transmit({kind:'playback',op:'play'})};
panel.querySelector('#fsvPause').onclick=()=>{playback('pause');transmit({kind:'playback',op:'pause'})};
panel.querySelector('#fsvBack').onclick=()=>{
 const wasDirect=directActive();
 close();transmit({kind:'close'});
 // Exit the parent's external-video overlay, so the old YouTube iframe does not remain behind.
 if(wasDirect){directHandled=true;document.getElementById('syncExternalClose')?.click();}
};
function offset(n){let now=0;try{now=player?.getCurrentTime()||0}catch(_){}const t=Math.max(0,now+n);jump(t);transmit({kind:'seek',seconds:t})}
panel.querySelector('#fsvPrev').onclick=()=>offset(-10);panel.querySelector('#fsvNext').onclick=()=>offset(10);
seekBar.onchange=()=>{let duration=0;try{duration=player?.getDuration()||0}catch(_){}if(duration>0){const t=duration*Number(seekBar.value)/1000;jump(t);transmit({kind:'seek',seconds:t})}};
muteButton.onclick=()=>{if(!ready||!player)return;try{if(player.isMuted()){player.unMute();muteButton.textContent='靜音'}else{player.mute();muteButton.textContent='開啟聲音'}}catch(_){}};
setInterval(()=>{if(panel.style.display==='none'||!ready||!player||seekBar.matches(':active'))return;try{const duration=player.getDuration();if(duration>0)seekBar.value=String(Math.max(0,Math.min(1000,Math.floor(player.getCurrentTime()/duration*1000))))}catch(_){}},600);
actionRef.on('value',snap=>{const cmd=snap.val();if(!cmd?.id||cmd.id===last||cmd.sender===self)return;last=cmd.id;if(typeof cmd.at==='number'&&cmd.at<began-2000)return;
 remote=true;try{if(cmd.kind==='select'&&/^[\w-]{11}$/.test(cmd.videoID||''))show(cmd.videoID,cmd.title);
 else if(cmd.kind==='playback'&&['play','pause'].includes(cmd.op))playback(cmd.op);
 else if(cmd.kind==='seek')jump(Number(cmd.seconds));else if(cmd.kind==='close'){const wasDirect=directActive();close();if(wasDirect){directHandled=true;document.getElementById('syncExternalClose')?.click()}}}finally{remote=false}
},e=>{status.textContent='同步讀取失敗';console.error(e)});
})();
