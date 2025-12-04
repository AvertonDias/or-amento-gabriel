
import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sua configuração do Next.js aqui, se houver
};

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Desabilita o cache para o favicon para evitar erros de build
    {
      urlPattern: /\/favicon\.ico$/,
      handler: 'NetworkOnly',
    },
    // Outras regras de cache podem ser adicionadas aqui
  ],
});

export default withPWAConfig(nextConfig);
