/* FiveStory sync bootstrap V6: video category and dropdown synchronization. */
(function(){'use strict';
if(!new URLSearchParams(location.search).has('sync')||window.__TIMER)return;
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn()}
ready(async function(){let badge=document.getElementById('syncState');if(!badge){badge=document.createElement('div');badge.id='syncState';document.body.append(badge)}
badge.style.cssText='position:fixed!important;top:8px!important;left:8px!important;z-index:2147483647!important;padding:8px 12px!important;border-radius:18px!important;background:#222!important;color:white!important;font:14px sans-serif!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;';badge.textContent='同步：正在載入…';
const load=src=>new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>fail(Error('無法載入 '+src));document.head.append(s)});
try{if(!window.firebase?.apps){badge.textContent='同步：載入 Firebase 核心…';await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')}if(!window.firebase?.database){badge.textContent='同步：載入 Firebase 資料庫…';await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js')}if(!window.FIVESTORY_FIREBASE_CONFIG){badge.textContent='同步：載入 Firebase 設定…';await load('sync-config.js')}badge.textContent='同步：啟動連線…';await load('sync.js?v=inline9');await load('bullseye-sync.js?v=2');await load('video-sync.js?v=5');await load('video-list-sync.js?v=6');if(badge.textContent==='同步：啟動連線…')badge.textContent='同步程式未啟動，請檢查 sync.js'}catch(e){badge.textContent='同步載入失敗：'+e.message;console.error(e)}})
})();
