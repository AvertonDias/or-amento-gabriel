/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@genkit-ai/core',
    '@genkit-ai/googleai',
    'genkit',
    'dotprompt',
    'handlebars',
    'require-in-the-middle',
  ],
  webpack: (config, { isServer }) => {
    // Adicionado para lidar com dependências que usam 'fs' no lado do cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
