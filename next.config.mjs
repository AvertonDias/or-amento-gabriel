/** @type {import('next').NextConfig} */
import withPWA from '@ducanh2912/next-pwa';

const nextConfig = {
  reactStrictMode: true,
  // Outras configurações do Next.js podem vir aqui
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Estratégias de cache podem ser adicionadas aqui
  ],
});

export default pwaConfig(nextConfig);
