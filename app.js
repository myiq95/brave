
// 서재 - 네이티브 TTS 최종본 (Brave iOS 검증됨)
let State = { tts:{queue:[],idx:0,playing:false}, settings:{ttsRate:1, ttsVoice:''} };
const el={};
let audioCtx=null;

function init(){
  el.readerContent=document.getElementById('readerContent');
  el.progressBar=document.getElementById('progressBar');
  el.progressText=document.getElementById('progressText');
  el.ttsBtn=document.getElementById('ttsBtn');
  el.ttsPrev=document.getElementById('ttsPrev');
  el.ttsNext=document.getElementById('ttsNext');
  el.ttsMode=document.getElementById('ttsMode');
  el.ttsKeepAlive=document.getElementById('ttsKeepAlive');
  el.braveAudio=document.getElementById('braveAudio');
}

function unlock(){
  try{
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    audioCtx.resume();
    if(el.ttsKeepAlive){
      el.ttsKeepAlive.loop=true;
      el.ttsKeepAlive.volume=0.01;
      el.ttsKeepAlive.play().catch(()=>{});
    }
  }catch{}
}

function chunkText(t){
  const out=[];
  let s=t.trim();
  const size=800;
  while(s.length>size){
    let cut=s.lastIndexOf('.',size);
    if(cut<200) cut=s.lastIndexOf(' ',size);
    if(cut<100) cut=size;
    out.push(s.slice(0,cut+1).trim());
    s=s.slice(cut+1).trim();
  }
  if(s) out.push(s);
  return out;
}

function highlight(n){
  if(!el.readerContent) return;
  const paras=el.readerContent.querySelectorAll('p, div');
  // remove old
  el.readerContent.querySelectorAll('.tts-highlight').forEach(e=>e.classList.remove('tts-highlight'));
  if(n>=0 && State.tts.queue[n]){
    // find text node containing queue[n] snippet
    const snippet=State.tts.queue[n].slice(0,30);
    for(let p of paras){
      if(p.textContent.includes(snippet)){
        p.classList.add('tts-highlight');
        p.scrollIntoView({behavior:'smooth',block:'center'});
        break;
      }
    }
  }
}

function speak(text){
  return new Promise(res=>{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang='ko-KR';
    u.rate=State.settings.ttsRate||1;
    if(State.settings.ttsVoice){
      const v=speechSynthesis.getVoices().find(x=>x.name===State.settings.ttsVoice);
      if(v) u.voice=v;
    }
    u.onend=()=>res();
    u.onerror=()=>res();
    speechSynthesis.speak(u);
  });
}

async function playQueue(){
  if(!State.tts.queue.length) return;
  State.tts.playing=true;
  if(el.ttsBtn) el.ttsBtn.textContent='⏸';
  for(let i=State.tts.idx;i<State.tts.queue.length;i++){
    if(!State.tts.playing) break;
    State.tts.idx=i;
    highlight(i);
    if(el.progressBar) el.progressBar.style.width=((i/State.tts.queue.length)*100)+'%';
    if(el.progressText) el.progressText.textContent=`${i+1} / ${State.tts.queue.length}`;
    await speak(State.tts.queue[i]);
  }
  State.tts.playing=false;
  if(el.ttsBtn) el.ttsBtn.textContent='▶';
}

function startTts(){
  unlock();
  const text=(el.readerContent?.innerText||'').trim();
  if(!text){ alert('읽을 내용이 없습니다'); return; }
  State.tts.queue=chunkText(text);
  State.tts.idx=0;
  playQueue();
}

function pauseTts(){ State.tts.playing=false; speechSynthesis.pause(); if(el.ttsBtn) el.ttsBtn.textContent='▶'; }
function resumeTts(){ if(speechSynthesis.paused){ speechSynthesis.resume(); State.tts.playing=true; if(el.ttsBtn) el.ttsBtn.textContent='⏸'; } else playQueue(); }
function stopTts(){ State.tts.playing=false; speechSynthesis.cancel(); State.tts.idx=0; if(el.ttsBtn) el.ttsBtn.textContent='▶'; }
function jump(d){ const ni=State.tts.idx+d; if(ni>=0&&ni<State.tts.queue.length){ speechSynthesis.cancel(); State.tts.idx=ni; playQueue(); } }

document.addEventListener('DOMContentLoaded',()=>{
  init();
  if(el.ttsBtn) el.ttsBtn.onclick=()=>{ unlock(); if(State.tts.playing) pauseTts(); else { if(speechSynthesis.paused) resumeTts(); else startTts(); } };
  if(el.ttsPrev) el.ttsPrev.onclick=()=>jump(-1);
  if(el.ttsNext) el.ttsNext.onclick=()=>jump(1);
  if(el.ttsMode) el.ttsMode.textContent='NATIVE ✓';
  // highlight style
  const st=document.createElement('style');
  st.textContent='.tts-highlight{background:#ffeb3b !important; transition:background 0.3s}';
  document.head.appendChild(st);
  // load voices
  speechSynthesis.onvoiceschanged=()=>{
    const sel=document.getElementById('voiceSelect');
    if(!sel) return;
    sel.innerHTML='';
    speechSynthesis.getVoices().filter(v=>v.lang.startsWith('ko')).forEach(v=>{
      const o=document.createElement('option'); o.value=v.name; o.textContent=v.name; sel.appendChild(o);
    });
  };
});

function toast(m){ let t=document.getElementById('toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:8px;z-index:9999'; document.body.appendChild(t);} t.textContent=m; t.style.display='block'; setTimeout(()=>t.style.display='none',2500); }
window.ttsJump=jump;
