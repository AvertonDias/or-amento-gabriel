// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... outras configurações ...
  experimental: {
    // Adicione transpilePackages aqui
    // Isso pode ajudar a resolver problemas de transpilação com o Genkit e suas dependências.
    transpilePackages: ['genkit', '@genkit-ai/core', '@genkit-ai/googleai', 'dotprompt', 'handlebars'],
  },
};

export default nextConfig;
