const CACHE_NAME = 'el250-flash-v5-offline-final';
const ASSETS = [
  './',
  './index.html',
  './produtos.html',
  './operadores.html',
  './testes.html',
  './logs.html',
  './etiquetas.html',
  './offline-barcode.js',
  './manifest.json'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of ASSETS) {
        try { await cache.add(url); } catch(err) { console.log('ASSET fail', url); }
      }
      for (const url of CDN_ASSETS) {
        try { await cache.add(url); } catch(err) { console.log('CDN fail', url); }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.url.includes('10.50.1.143')) return;
  e.respondWith(
    caches.match(req).then(async cached => {
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok && (req.url.includes('cdn.jsdelivr') || req.url.includes('bootstrap') || req.url.includes('googleapis') || req.url.includes('gstatic'))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      } catch (err) {
        if (req.mode === 'navigate') {
          return (await caches.match('./etiquetas.html')) || (await caches.match('./index.html')) || Response.error();
        }
        if (req.url.includes('fonts.googleapis') || req.url.includes('gstatic')) {
          return new Response('', {status:200, headers:{'Content-Type':'text/css'}});
        }
        return Response.error();
      }
    })
  );
});
