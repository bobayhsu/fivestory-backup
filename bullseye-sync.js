/* FiveStory / Bullseye bridge, v3: use the existing authorized screen path. */
(()=>{
 'use strict';
 const q=new URLSearchParams(location.search);
 if(!q.has('sync') || !window.firebase?.database) return;
 const room=q.get('sync')||'demo';
 if(!/^[a-zA-Z0-9_-]{4,60}$/.test(room))return;
 const frame=document.getElementById('syncExternalFrame');
 if(!frame)return;
 const url='https://bobayhsu.github.io/bullseye/';
 const db=firebase.database();
 const actionRef=db.ref('rooms/'+room+'/screen/bullseyeCommand');
 const selfId='bullseye-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 let applied=false, sending=false, lastID='', queued=[], win=null, doc=null, inputTimer=null;
 const badge=document.getElementById('syncState');
 const status=(v)=>{if(badge)badge.title=v;};
 const active=()=>{const layer=document.getElementById('fivestorySyncedExternal');return layer && layer.style.display!=='none' && frame.getAttribute('src')?.startsWith(url);};
 function selector(el){
  if(!el || !doc || el===doc.documentElement)return 'html';
  if(el.id && doc.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+CSS.escape(el.id);
  let path=[],node=el;
  while(node && node.nodeType===1 && node!==doc.documentElement){
   if(node.id){path.unshift('#'+CSS.escape(node.id));break;}
   const parent=node.parentElement;if(!parent)break;
   const siblings=Array.from(parent.children).filter(e=>e.tagName===node.tagName);
   path.unshift(node.tagName.toLowerCase()+':nth-of-type('+(siblings.indexOf(node)+1)+')');node=parent;
  }
  return path.join(' > ');
 }
 function send(kind,el,value){
  if(applied||sending||!active())return;
  let path;try{path=selector(el)}catch(_){return;}
  const packet={sender:selfId,id:selfId+'-'+Date.now()+'-'+Math.random().toString(36).slice(2),kind,path,value:value??'',at:firebase.database.ServerValue.TIMESTAMP};
  actionRef.set(packet).catch(err=>{status('說書人同步寫入失敗');console.error('bullseye bridge',err);});
 }
 function targetOf(e){
  const t=e.target;
  return t?.closest?.('button,a[href],summary,select,input,textarea,[onclick],.section-label')||t;
 }
 function onClick(e){
  if(!active())return;
  const target=targetOf(e);
  if(!target||target.matches('input,select,textarea'))return;
  send('click',target);
 }
 function onChange(e){const target=e.target;if(target?.matches('select,input[type="checkbox"],input[type="radio"]'))send('change',target,target.type==='checkbox'||target.type==='radio'?target.checked:target.value);}
 function onInput(e){const t=e.target;if(!t?.matches('input:not([type="checkbox"]):not([type="radio"]),textarea'))return;clearTimeout(inputTimer);inputTimer=setTimeout(()=>send('input',t,t.value),200);}
 function onKey(e){if(!active()||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;if(t?.matches('input,textarea,select,[contenteditable]'))return;
  if(['ArrowLeft','ArrowRight',' ','Escape','Enter','1','2','3','4','5','6','7','p','P'].includes(e.key)) send('key',doc.body,e.key);
 }
 function unbind(){if(!doc)return;doc.removeEventListener('click',onClick,true);doc.removeEventListener('change',onChange,true);doc.removeEventListener('input',onInput,true);doc.removeEventListener('keydown',onKey,true);doc=null;win=null;}
 function bind(){
  unbind();
  try{
   if(!frame.contentDocument || !frame.contentDocument.body)return;
   if(!frame.contentWindow.location.href.startsWith(url))return;
   doc=frame.contentDocument;win=frame.contentWindow;
   doc.addEventListener('click',onClick,true);doc.addEventListener('change',onChange,true);doc.addEventListener('input',onInput,true);doc.addEventListener('keydown',onKey,true);
   status('說書人內部同步已準備');flush();
  }catch(err){status('說書人網站無法跨框控制');console.warn('same-origin access unavailable',err);}
 }
 function apply(cmd){
  if(!doc||!active())return false;
  let el;try{el=doc.querySelector(cmd.path)}catch(_){return true;}
  if(!el)return false;
  applied=true;
  try{
   if(cmd.kind==='click')el.click();
   else if(cmd.kind==='change'){
    if(el.type==='checkbox'||el.type==='radio')el.checked=!!cmd.value;else el.value=cmd.value;
    el.dispatchEvent(new win.Event('change',{bubbles:true}));
   }else if(cmd.kind==='input'){
    el.value=cmd.value;el.dispatchEvent(new win.Event('input',{bubbles:true}));
   }else if(cmd.kind==='key'){
    doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:cmd.value,bubbles:true,cancelable:true}));
   }
  }finally{setTimeout(()=>applied=false,30);}
  return true;
 }
 function flush(){
  if(!queued.length || !doc || !active())return;
  const pending=queued;queued=[];
  pending.forEach(cmd=>{if(!apply(cmd))queued.push(cmd);});
 }
 frame.addEventListener('load',()=>{bind();setTimeout(flush,150);setTimeout(flush,600);});
 setInterval(()=>{if(active()&&!doc)bind();if(active()&&queued.length)flush();},350);
 const started=Date.now();
 actionRef.on('value',snap=>{
  const cmd=snap.val();
  if(!cmd||!cmd.id||cmd.id===lastID||cmd.sender===selfId)return;
  lastID=cmd.id;
  // Ignore actions left over from previous sessions.
  if(typeof cmd.at==='number'&&cmd.at<started-2000)return;
  if(!apply(cmd)){queued.push(cmd);if(queued.length>30)queued.shift();}
 },err=>{status('說書人同步讀取失敗');console.error('bullseye bridge',err);});
})();
