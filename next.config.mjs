// @ts-check

import withPwaInit from '@ducanh2912/next-pwa';

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações do Next.js
};

const withPwa = withPwaInit({
  dest: 'public',
  disable: isDev, // Desativa o PWA em ambiente de desenvolvimento
  register: true,
  skipWaiting: true,
});

export default withPwa(nextConfig);
