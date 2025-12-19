/** @type {import('next').NextConfig} */
import withPWAInit from '@ducanh2912/next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev, // Desativa o PWA em ambiente de desenvolvimento
  register: true,
  // skipWaiting é movido para dentro de runtimeCaching ou outra config específica se necessário,
  // mas o padrão da lib já é um bom começo. Por agora, a configuração básica é suficiente.
  // Apenas registrar o service worker já melhora o cache.
});

const nextConfig = {
  reactStrictMode: false, // Adicionado para evitar re-renderizações em modo dev que atrapalham o useSync
};

export default withPWA(nextConfig);
