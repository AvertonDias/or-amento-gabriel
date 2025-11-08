
import nextPwa from '@ducanh2912/next-pwa';

const withPWA = nextPwa({
  dest: 'public',
  register: false, // Desabilitamos o registro automático
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/_offline',
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
