
/** @type {import('next').NextConfig} */

import createNextPwa from '@ducanh2912/next-pwa';

const withPWA = createNextPwa({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // register: true, // Removido para usar registro manual
  // skipWaiting: true, // Removido para controle manual
});

const nextConfig = {
  reactStrictMode: true,
  // Adicione outras configurações do Next.js aqui, se necessário
};

export default withPWA(nextConfig);
