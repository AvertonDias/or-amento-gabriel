
import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sua configuração do Next.js aqui
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Exemplo de cache para fontes do Google
    {
      handler: 'CacheFirst',
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
        },
      },
    },
    // Cache para imagens, js, css
    {
      handler: 'StaleWhileRevalidate',
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|js|css)$/,
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
        },
      },
    },
     // Cache de NetworkFirst para requisições de API (exemplo)
    {
      handler: 'NetworkFirst',
      urlPattern: /^https?.*/,
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24, // 1 dia
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});


export default pwaConfig(nextConfig);
