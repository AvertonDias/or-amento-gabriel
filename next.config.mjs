
/** @type {import('next').NextConfig} */
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false, // Vamos controlar o registro manualmente
  skipWaiting: true,
});

const nextConfig = {
  // Sua configuração Next.js aqui
  reactStrictMode: true,
};

export default withPWA(nextConfig);
