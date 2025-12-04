/** @type {import('next').NextConfig} */

import withPWA from '@ducanh2912/next-pwa';

const nextConfig = {
  reactStrictMode: true,
  // Adicione outras configurações do Next.js aqui se necessário
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/_offline', // Rota para a página offline
  },
});

export default pwaConfig(nextConfig);
