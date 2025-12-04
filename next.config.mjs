/** @type {import('next').NextConfig} */

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Exclui a rota da API do cache para garantir que as chamadas sempre cheguem ao servidor
  exclude: [
    ({ asset, compilation }) => {
      if (
        asset.name.startsWith("server/") ||
        asset.name.match(/^((app-pages-manifest|build-manifest|react-loadable-manifest|middleware-manifest|middleware-build-manifest|subresource-integrity-manifest|build-manifest)\.json|favicon\.ico|manifest\.(webmanifest|json)|_next\/static\/|sw\.js|sw-esm\.js)$/)
      ) {
        return true;
      }
      return false;
    },
  ],
});

const nextConfig = {
  // sua configuração do Next.js pode ir aqui
};

module.exports = withPWA(nextConfig);
