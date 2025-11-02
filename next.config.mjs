/** @type {import('next').NextConfig} */

// Importa o plugin PWA usando a sintaxe de módulo ES
import withPWA from '@ducanh2912/next-pwa';

// Configuração do PWA
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

// Configuração principal do Next.js
const nextConfig = {
  reactStrictMode: true,
  // Adiciona a configuração para ignorar a geração da rota do favicon
  // e evitar erros de compilação relacionados a ele.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/apple-touch-icon.jpg', // ou o caminho para o seu ícone
        permanent: true,
      },
    ];
  },
};

// Envolve a configuração do Next.js com a configuração do PWA
const configWithPwa = pwaConfig(nextConfig);

export default configWithPwa;
