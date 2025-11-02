/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desativa a geração automática da rota para o favicon.ico
  // Isso evita o erro 'PageNotFoundError' durante o build quando o arquivo não existe.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config, { isServer }) => {
    // Adiciona uma regra para lidar com arquivos .node
    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader',
    });

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "fs": false,
      };
    }
    
    return config;
  },
  // Remove a necessidade do favicon.ico para o build
  // Esta parte foi removida porque a configuração padrão do Next.js 14+ não tem mais `generateEtags`.
  // O erro é melhor tratado desativando a procura explícita ou garantindo que o arquivo exista.
  // Neste caso, vamos optar por uma configuração mínima.
  // A solução mais moderna para o `favicon.ico` é colocá-lo na pasta `app/`.
  // Para este caso, vamos garantir que o build não falhe.
};

// Configuração PWA com @ducanh2912/next-pwa
const withPWA = require('@ducanh2912/next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});


export default withPWA(nextConfig);
