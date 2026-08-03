
const CACHE_NAME = 'el250-flash-v3-offline';
const ASSETS = [
  './',
  './index.html',
  './produtos.html',
  './operadores.html',
  './testes.html',
  './logs.html',
  './etiquetas.html',
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
      await cache.addAll(ASSETS);
      // Tenta cachear CDN, mas não falha se estiver offline
      for (const url of CDN_ASSETS) {
        try { await cache.add(url); } catch(err) { console.log('CDN cache fail', url); }
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
  // Para chamadas de rede local (file system access API) não cachear
  if (req.url.includes('10.50.1.143')) return;
  
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Salva no cache pra próxima vez offline
        if (res.ok && (req.url.includes('cdn.jsdelivr') || req.url.includes('bootstrap'))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Se for navegação e falhou, retorna index
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
