/** @type {import('next').NextConfig} */
import withPWA from '@ducanh2912/next-pwa';

const pwa = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  cacheStartUrl: true,
  dynamicOptions: {
    // Exemplo de cache para fontes do Google
    'https://fonts.googleapis.com/.*': {
      cacheName: 'google-fonts-cache',
      strategy: 'CacheFirst',
      options: {
        cacheableResponse: {
          statuses: [0, 200],
        },
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Dias
        },
      },
    },
    'https://fonts.gstatic.com/.*': {
        cacheName: 'google-fonts-cache',
        strategy: 'CacheFirst',
        options: {
          cacheableResponse: {
            statuses: [0, 200],
          },
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Dias
          },
        },
    }
  },
});

const nextConfig = {
  // Sua configuração Next.js aqui
};

export default pwa(nextConfig);
