const CACHE_NAME = 'el250-flash-v4-offline-fix';
const ASSETS = [
  './',
  './index.html',
  './produtos.html',
  './operadores.html',
  './testes.html',
  './logs.html',
  './etiquetas.html',
  './manifest.json',
  './historico.html',
  './relatorios.html'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache local assets (ignora falha individual)
      for (const url of ASSETS) {
        try { await cache.add(url); } catch(err) { console.log('ASSET fail', url, err.message); }
      }
      for (const url of CDN_ASSETS) {
        try { 
          await cache.add(url); 
        } catch(err) { 
          console.log('CDN cache fail', url, err.message);
          // tenta com no-cors
          try {
            const res = await fetch(url, {mode:'no-cors'});
            await cache.put(url, res);
          } catch(e2) {}
        }
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
  const url = req.url;
  // Não intercepta API local / File System Access
  if (url.includes('10.50.1.143')) return;
  
  // Estratégia Cache First para tudo, com fallback
  e.respondWith(
    caches.match(req).then(async cached => {
      if (cached) return cached;

      try {
        const networkRes = await fetch(req);
        // Cacheia qualquer coisa de CDN / fonts / googleapis para funcionar offline depois
        if (networkRes.ok) {
          const shouldCache = url.includes('cdn.jsdelivr') || 
                              url.includes('jsdelivr') ||
                              url.includes('bootstrap') ||
                              url.includes('googleapis') ||
                              url.includes('gstatic') ||
                              url.includes('flaticon');
          if (shouldCache) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
        }
        return networkRes;
      } catch (err) {
        // Fallback navegação offline
        if (req.mode === 'navigate') {
          const fallback = await caches.match(req.url) || await caches.match('./etiquetas.html') || await caches.match('./index.html');
          if (fallback) return fallback;
        }
        // Fallback para fontes: retorna vazio para não quebrar layout
        if (url.includes('fonts.googleapis') || url.includes('gstatic')) {
          return new Response('', {status:200, headers:{'Content-Type':'text/css'}});
        }
        // Para JS de CDN que falhou offline e não estava cacheado, retorna stub vazio
        if (url.includes('interact.min.js')) {
          return new Response('window.interact = window.interact || function(){return {draggable:()=>({on:()=>{}}), resizable:()=>({on:()=>{}})} }', {headers:{'Content-Type':'application/javascript'}});
        }
        if (url.includes('JsBarcode')) {
          return new Response('window.JsBarcode = window.JsBarcode || function(){}', {headers:{'Content-Type':'application/javascript'}});
        }
      }
    })
  );
});
