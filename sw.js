
const CACHE='seojae-v7-simple-file-20250913';
self.addEventListener('install', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith('sw.js')) return;
  // Always network first for main files
  if(url.pathname.endsWith('index.html')||url.pathname.endsWith('app.js')||url.pathname.endsWith('styles.css')){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
