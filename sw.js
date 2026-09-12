
const CACHE = 'seojae-v6-testreader-fix-20250912';
const ASSETS = ['./','./index.html','./styles.css','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>{ if(k!==CACHE) return caches.delete(k); })))
    .then(()=>caches.open(CACHE).then(c=>c.addAll(ASSETS)))
    .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  const url = new URL(e.request.url);
  if(url.hostname.includes('speech.platform.bing.com') || url.hostname.includes('translate.googleapis.com')) return;
  
  // app.js and index.html must always be network-first to avoid stuck old version
  if(url.pathname.endsWith('app.js') || url.pathname.endsWith('index.html') || url.pathname.endsWith('brave-tts.js')){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res.ok){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, clone));
        }
        return res;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
      if(res.ok && url.origin===location.origin) {
        const clone=res.clone(); caches.open(CACHE).then(c=>c.put(e.request, clone));
      }
      return res;
    }).catch(()=> caches.match('./index.html')))
  );
});
