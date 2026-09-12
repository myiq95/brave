
const CACHE = 'seojae-v3-brave-bg';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./brave-tts.js','./manifest.webmanifest'];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  const url = new URL(e.request.url);
  // Edge TTS wss and fetch should bypass cache
  if(url.hostname.includes('speech.platform.bing.com')) return;
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
      if(res.ok && url.origin===location.origin) {
        const clone=res.clone(); caches.open(CACHE).then(c=>c.put(e.request, clone));
      }
      return res;
    }).catch(()=> caches.match('./index.html')))
  );
});
