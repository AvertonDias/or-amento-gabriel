/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // O Service Worker e o Fallback não são mais necessários para o Capacitor.
  // A abordagem recomendada agora é usar o roteamento do Next.js diretamente.
  // A página _offline será tratada pelo Capacitor se não houver conexão.
};

export default nextConfig;
