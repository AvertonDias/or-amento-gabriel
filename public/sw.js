// Este arquivo de service worker (sw.js) na pasta public
// geralmente é gerenciado e sobrescrito pelo plugin next-pwa durante o build.
// Modificações manuais aqui podem ser perdidas.
// Se você precisar de um service worker customizado, configure a opção 'swSrc'
// nas configurações do next-pwa em next.config.js.

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Placeholder para evitar erros 404 se o next-pwa ainda não gerou o sw.js (ex: em dev inicial)
// O next-pwa irá gerar um service worker mais completo.
console.log('Custom public/sw.js - será substituído pelo next-pwa em produção se register:true.');
