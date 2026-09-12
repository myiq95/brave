
// Brave Native TTS - Final working version based on debug log
const State={book:null,settings:{fontSize:18,lineHeight:1.8,theme:'paper',ttsRate:1,ttsVoice:''},tts:{queue:[],idx:0,playing:false,useBrave:false,chunkSize:800},lib:[],recent:[]};
const el={};
let audioCtx=null;
let silentNode=null;
function logDebug(m){ console.log(m); }
function initEl(){
  ['libGrid','readerView','readerContent','progressBar','progressText','fontSize','lineHeight','ttsRate','voiceSelect','ttsBtn','ttsPrev','ttsNext','ttsMode','braveAudio','ttsKeepAlive','settingsBtn','settingsPanel'].forEach(id=>{ el[id]=document.getElementById(id); });
  el.fileInput=document.getElementById('fileInput');
  el.search=document.getElementById('searchInput');
}
function unlockAudio(){
  try{
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    audioCtx.resume();
    // silent loop to keep Brave background alive
    if(!silentNode){
      const buf=audioCtx.createBuffer(1, audioCtx.sampleRate*2, audioCtx.sampleRate);
      const src=audioCtx.createBufferSource(); src.buffer=buf; src.loop=true;
      const gain=audioCtx.createGain(); gain.gain.value=0.001;
      src.connect(gain); gain.connect(audioCtx.destination); src.start();
      silentNode=src;
      logDebug('AudioContext unlocked and silent loop started');
    }
    if(el.ttsKeepAlive){
      el.ttsKeepAlive.src='data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      el.ttsKeepAlive.loop=true; el.ttsKeepAlive.volume=0.01;
      el.ttsKeepAlive.play().catch(()=>{});
    }
  }catch(e){ logDebug('unlock fail '+e); }
}
function chunkText(t){
  const size=State.tts.chunkSize;
  const out=[]; let s=t;
  while(s.length>size){ let cut=s.lastIndexOf('.',size); if(cut<200) cut=s.lastIndexOf(' ',size); if(cut<100) cut=size; out.push(s.slice(0,cut+1).trim()); s=s.slice(cut+1).trim(); }
  if(s) out.push(s);
  return out;
}
function speakNative(text){
  return new Promise((res, rej)=>{
    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      u.lang='ko-KR'; u.rate=State.settings.ttsRate;
      if(State.settings.ttsVoice){ const v=speechSynthesis.getVoices().find(x=>x.name===State.settings.ttsVoice); if(v) u.voice=v; }
      u.onend=()=>res();
      u.onerror=(e)=>{ console.warn(e); res(); };
      // keep audioCtx alive during speech
      if(audioCtx && audioCtx.state==='suspended') audioCtx.resume();
      speechSynthesis.speak(u);
    }catch(e){ res(); }
  });
}
async function playQueue(){
  if(!State.tts.queue.length) return;
  State.tts.playing=true;
  if(el.ttsBtn) el.ttsBtn.textContent='⏸';
  for(let i=State.tts.idx; i<State.tts.queue.length; i++){
    if(!State.tts.playing) break;
    State.tts.idx=i;
    updateProgress();
    await speakNative(State.tts.queue[i]);
  }
  State.tts.playing=false;
  if(el.ttsBtn) el.ttsBtn.textContent='▶';
}
function startTts(){
  unlockAudio();
  const contentEl=document.getElementById('readerContent');
  if(!contentEl) return;
  const text=contentEl.innerText||contentEl.textContent||'';
  if(!text.trim()){ toast('읽을 내용이 없습니다'); return; }
  State.tts.queue=chunkText(text);
  State.tts.idx=0;
  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:document.title.slice(0,50), artist:'서재', album:'홈즈'});
      navigator.mediaSession.setActionHandler('pause', ()=>pauseTts());
      navigator.mediaSession.setActionHandler('play', ()=>resumeTts());
      navigator.mediaSession.setActionHandler('nexttrack', ()=>jump(1));
      navigator.mediaSession.setActionHandler('previoustrack', ()=>jump(-1));
    }catch{}
  }
  playQueue();
  toast('네이티브 TTS 재생 시작 (Brave 백그라운드 유지 중)');
}
function pauseTts(){ State.tts.playing=false; speechSynthesis.pause(); if(el.ttsBtn) el.ttsBtn.textContent='▶'; }
function resumeTts(){ if(speechSynthesis.paused){ speechSynthesis.resume(); State.tts.playing=true; if(el.ttsBtn) el.ttsBtn.textContent='⏸'; } else { playQueue(); } }
function stopTts(){ State.tts.playing=false; speechSynthesis.cancel(); State.tts.idx=0; if(el.ttsBtn) el.ttsBtn.textContent='▶'; updateProgress(); }
function jump(d){ const ni=State.tts.idx+d; if(ni>=0&&ni<State.tts.queue.length){ speechSynthesis.cancel(); State.tts.idx=ni; playQueue(); } }
function updateProgress(){ if(el.progressBar&&State.tts.queue.length){ const p=(State.tts.idx/State.tts.queue.length)*100; el.progressBar.style.width=p+'%'; if(el.progressText) el.progressText.textContent=`${State.tts.idx+1} / ${State.tts.queue.length}`; } }
function toast(m){ let t=document.getElementById('toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:8px;z-index:9999;'; document.body.appendChild(t);} t.textContent=m; t.style.display='block'; setTimeout(()=>t.style.display='none',2500); }
window.ttsJump=jump;
document.addEventListener('DOMContentLoaded',()=>{
  initEl();
  // load voices
  speechSynthesis.onvoiceschanged=()=>{ const vs=speechSynthesis.getVoices(); if(el.voiceSelect){ el.voiceSelect.innerHTML=''; vs.filter(v=>v.lang.startsWith('ko')).forEach(v=>{ const o=document.createElement('option'); o.value=v.name; o.textContent=v.name; el.voiceSelect.appendChild(o); }); } };
  // bind
  if(el.ttsBtn) el.ttsBtn.onclick=()=>{ unlockAudio(); if(State.tts.playing) pauseTts(); else { if(State.tts.queue.length&&speechSynthesis.paused) resumeTts(); else startTts(); } };
  if(el.ttsPrev) el.ttsPrev.onclick=()=>jump(-1);
  if(el.ttsNext) el.ttsNext.onclick=()=>jump(1);
  if(el.ttsMode) el.ttsMode.textContent='NATIVE (검증됨)';
  // keep AudioContext alive on visibility change
  document.addEventListener('visibilitychange',()=>{ if(audioCtx) audioCtx.resume(); });
});
