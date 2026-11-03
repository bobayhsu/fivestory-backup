/* FiveStory video resources bridge v1: synchronize selection and controls in the hosted player. */
(()=>{
'use strict';
const q=new URLSearchParams(location.search);
if(!q.has('sync')||!window.firebase?.database)return;
const room=q.get('sync')||'demo';
if(!/^[a-zA-Z0-9_-]{4,60}$/.test(room))return;
const resourceURL='https://bobayhsu.github.io/allbobay/';
const iframe=document.getElementById('syncExternalFrame');
const layer=document.getElementById('fivestorySyncedExternal');
if(!iframe||!layer)return;
const actionRef=firebase.database().ref('rooms/'+room+'/screen/videoCommand');
const myID='video-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const started=Date.now();
let lastID='', remote=false, watched=null, player=null, playerReady=false, videoID='', videoTitle='', queuedPlayback=null, pendingClicks=[];
const isResourcePage=()=>layer.style.display!=='none' && iframe.getAttribute('src')?.startsWith(resourceURL);
const panel=document.createElement('div');
panel.id='fivestoryVideoPanel';
panel.style.cssText='position:fixed;inset:0;z-index:2147483200;background:#0b0e16;color:white;display:none;flex-direction:column;font-family:system-ui,"Microsoft JhengHei",sans-serif;';
panel.innerHTML=`<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:#1b2030"><strong id="fsvTitle" style="flex:1;min-width:170px;font-size:15px">影片</strong><button type="button" id="fsvPlay" style="padding:10px;border:0;border-radius:8px;cursor:pointer">播放</button><button type="button" id="fsvPause" style="padding:10px;border:0;border-radius:8px;cursor:pointer">暫停</button><button type="button" id="fsvBack" style="padding:10px;border:0;border-radius:8px;cursor:pointer">返回影片列表</button></div><div id="fsvPlayer" style="flex:1;min-height:0;width:100%;display:grid;place-items:center"></div><div style="font-size:12px;color:#cbd5e1;padding:7px 12px;background:#1b2030">播放／暫停會送到兩台裝置。部分瀏覽器可能阻擋遠端自動播放，屆時請在桌機按一次播放。</div>`;
document.body.appendChild(panel);
const titleEl=panel.querySelector('#fsvTitle');
const slot=panel.querySelector('#fsvPlayer');
function getYouTubeID(url){try{const u=new URL(url);if(u.hostname==='youtu.be')return /^[\w-]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):null;if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(u.hostname)){const id=u.searchParams.get('v')||(/^\/(?:embed|shorts)\/([\w-]{11})/.exec(u.pathname)||[])[1];return id&&/^[\w-]{11}$/.test(id)?id:null;}}catch(_){}return null;}
function transmit(cmd){if(remote)return;actionRef.set({id:myID+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),sender:myID,at:firebase.database.ServerValue.TIMESTAMP,...cmd}).catch(e=>{console.error('video bridge permission or network:',e);const badge=document.getElementById('syncState');if(badge)badge.title='影片同步權限失敗：檢查 videoAction 規則';});}
let ytApiPromise;
function getYT(){if(window.YT?.Player)return Promise.resolve(window.YT);if(ytApiPromise)return ytApiPromise;ytApiPromise=new Promise((resolve,reject)=>{const previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{previous?.();resolve(window.YT);};const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>reject(Error('YouTube API 無法載入'));document.head.append(s);});return ytApiPromise;}
async function showVideo(id,title){
 if(!id)return;
 videoID=id;videoTitle=title||'影片';panel.style.display='flex';titleEl.textContent=videoTitle;
 if(player){try{player.destroy();}catch(_){}player=null;}
 playerReady=false;slot.replaceChildren();
 const mount=document.createElement('div');mount.id='fsvYouTubeMount';slot.appendChild(mount);
 try{const YT=await getYT();if(videoID!==id||panel.style.display==='none')return;
  player=new YT.Player('fsvYouTubeMount',{width:'100%',height:'100%',videoId:id,playerVars:{playsinline:1,rel:0,origin:location.origin},events:{onReady:()=>{playerReady=true;if(queuedPlayback){const p=queuedPlayback;queuedPlayback=null;setPlayback(p);}},onError:e=>console.warn('YouTube player error',e.data)}});
 }catch(err){slot.textContent='無法載入 YouTube 播放器，請檢查網路或影片嵌入權限。';console.error(err);}
}
function setPlayback(op){if(!playerReady||!player){queuedPlayback=op;return;}try{if(op==='play')player.playVideo();else if(op==='pause')player.pauseVideo();}catch(err){console.warn('YouTube playback action',err);}}
function closeVideo(){panel.style.display='none';videoID='';videoTitle='';queuedPlayback=null;playerReady=false;if(player){try{player.destroy();}catch(_){}player=null;}slot.replaceChildren();}
function sendPlayback(op){setPlayback(op);transmit({kind:'playback',op});}
panel.querySelector('#fsvPlay').addEventListener('click',()=>sendPlayback('play'));
panel.querySelector('#fsvPause').addEventListener('click',()=>sendPlayback('pause'));
panel.querySelector('#fsvBack').addEventListener('click',()=>{closeVideo();transmit({kind:'close'});});
function cssPath(el){
 if(el.id)return '#'+CSS.escape(el.id);
 let parts=[];while(el&&el.nodeType===1&&parts.length<12){if(el.id){parts.unshift('#'+CSS.escape(el.id));break;}
 const tag=el.tagName.toLowerCase();const parent=el.parentElement;
 if(!parent)break;
 const ix=Array.from(parent.children).filter(x=>x.tagName===el.tagName).indexOf(el)+1;
 parts.unshift(tag+':nth-of-type('+ix+')');el=parent;
 }return parts.join(' > ');
}
function handleGeneralClick(e){
 if(!isResourcePage()||remote)return;
 const el=e.target.closest?.('summary,.custom-select-button,.book-hotspot,.book-close,button:not(.custom-select-item)');
 if(!el)return;
 transmit({kind:'click',path:cssPath(el)});
}
function applyClick(path){
 try{const d=iframe.contentDocument;const el=d?.querySelector(path);if(!el)return false;
 remote=true;try{el.click();}finally{remote=false;}return true;
 }catch(e){return false;}
}
function handleResourceClick(e){if(!isResourcePage())return;const item=e.target.closest?.('.custom-select-item[data-url]');if(!item)return;
 const id=getYouTubeID(item.dataset.url);if(!id)return;
 e.preventDefault();e.stopImmediatePropagation();
 const title=(item.textContent||'影片').trim();showVideo(id,title);transmit({kind:'select',videoID:id,title});
}
function bind(){if(watched){watched.removeEventListener('click',handleResourceClick,true);watched.removeEventListener('click',handleGeneralClick,true);watched=null;}
 try{const d=iframe.contentDocument;if(!d||!d.body||!iframe.contentWindow.location.href.startsWith(resourceURL))return;
 d.addEventListener('click',handleResourceClick,true);d.addEventListener('click',handleGeneralClick,true);watched=d;if(pendingClicks.length){const todo=pendingClicks.splice(0);for(const path of todo){if(!applyClick(path))pendingClicks.push(path);}}
 }catch(e){console.warn('影片資源網站無法取得 iframe 操作權限',e);}
}
iframe.addEventListener('load',bind);
setInterval(()=>{if(isResourcePage()&&!watched)bind();if(!isResourcePage()&&panel.style.display!=='none')closeVideo();},700);
actionRef.on('value',snap=>{const cmd=snap.val();if(!cmd||!cmd.id||cmd.id===lastID||cmd.sender===myID)return;lastID=cmd.id;
 if(typeof cmd.at==='number'&&cmd.at<started-2000)return;
 remote=true;
 try{if(cmd.kind==='select'&&getYouTubeID('https://youtu.be/'+cmd.videoID)===cmd.videoID)showVideo(cmd.videoID,cmd.title);
 else if(cmd.kind==='playback'&&['play','pause'].includes(cmd.op))setPlayback(cmd.op);
 else if(cmd.kind==='close')closeVideo();
 else if(cmd.kind==='click' && typeof cmd.path==='string'){if(!applyClick(cmd.path))pendingClicks.push(cmd.path);}}
 finally{remote=false;}
},err=>console.error('影片同步讀取失敗（檢查 videoAction 權限）',err));
})();
