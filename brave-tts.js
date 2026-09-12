/* Brave Background TTS Engine - Edge TTS via WebSocket, audio element based */
const BraveTTS = (() => {
  const VOICE = 'ko-KR-SunHiNeural';
  const ENDPOINT = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0; const v = c==='x'?r:(r&0x3|0x8); return v.toString(16);
    });
  }
  function dateStr() { return new Date().toString() + ' GMT'; }
  function makeSSML(text, rate) {
    const percent = Math.round((rate - 1) * 100);
    const rateStr = (percent >= 0 ? `+${percent}%` : `${percent}%`);
    const esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'><voice name='${VOICE}'><prosody rate='${rateStr}' pitch='+0%'>${esc}</prosody></voice></speak>`;
  }
  function ttsFetch(text, rate=1) {
    return new Promise((resolve, reject) => {
      const requestId = uuid();
      const chunks = [];
      let finished = false;
      let socket;
      try { socket = new WebSocket(ENDPOINT); } catch(e) { reject(e); return; }
      socket.binaryType = 'arraybuffer';
      const timeout = setTimeout(()=>{ try{socket.close()}catch{}; if(!finished) reject(new Error('TTS timeout')); }, 15000);
      socket.onopen = () => {
        const configMsg = `X-Timestamp:${dateStr()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataOptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
        socket.send(configMsg);
        const ssml = makeSSML(text, rate);
        const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${dateStr()}\r\nPath:ssml\r\n\r\n${ssml}`;
        socket.send(ssmlMsg);
      };
      socket.onmessage = (e) => {
        if (typeof e.data === 'string') {
          if (e.data.includes('Path:turn.end')) {
            finished = true; clearTimeout(timeout); socket.close();
            if (chunks.length === 0) { reject(new Error('no audio')); return; }
            resolve(new Blob(chunks, {type:'audio/mpeg'}));
          }
          return;
        }
        const arr = new Uint8Array(e.data);
        let headerEnd = -1;
        for (let i=0;i<arr.length-3;i++) { if (arr[i]===13 && arr[i+1]===10 && arr[i+2]===13 && arr[i+3]===10) { headerEnd=i+4; break; } }
        if (headerEnd !== -1) {
          const headerText = new TextDecoder().decode(arr.slice(0, headerEnd));
          if (headerText.includes('Path:audio')) chunks.push(arr.slice(headerEnd).buffer);
        } else {
          if (arr.length>0) chunks.push(e.data);
        }
      };
      socket.onerror = (err) => { clearTimeout(timeout); if(!finished){ finished=true; reject(err); } };
      socket.onclose = () => { clearTimeout(timeout); if(!finished && chunks.length>0){ finished=true; resolve(new Blob(chunks,{type:'audio/mpeg'})); } };
    });
  }
  let currentUrl = null;
  async function speak(text, rate, audioEl) {
    stop(audioEl);
    const blob = await ttsFetch(text, rate);
    const url = URL.createObjectURL(blob);
    currentUrl = url;
    audioEl.src = url;
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: text.slice(0,40), artist: '서재', album: '프리미엄 독서' });
        navigator.mediaSession.setActionHandler('pause', ()=> audioEl.pause());
        navigator.mediaSession.setActionHandler('play', ()=> audioEl.play());
        navigator.mediaSession.setActionHandler('nexttrack', ()=> { if(window.ttsJump) window.ttsJump(1); });
        navigator.mediaSession.setActionHandler('previoustrack', ()=> { if(window.ttsJump) window.ttsJump(-1); });
      } catch {}
    }
    await audioEl.play();
    return new Promise((res) => {
      audioEl.onended = () => { cleanup(); res(); };
      audioEl.onerror = () => { cleanup(); res(); };
    });
    function cleanup(){ if(currentUrl){ URL.revokeObjectURL(currentUrl); currentUrl=null; } }
  }
  function stop(audioEl){
    if(audioEl){ audioEl.pause(); audioEl.onended=null; audioEl.onerror=null; try{audioEl.removeAttribute('src'); audioEl.load();}catch{} }
    if(currentUrl){ URL.revokeObjectURL(currentUrl); currentUrl=null; }
  }
  function pause(audioEl){ if(audioEl) audioEl.pause(); }
  function resume(audioEl){ if(audioEl) audioEl.play().catch(()=>{}); }
  return { speak, stop, pause, resume, ttsFetch };
})();
