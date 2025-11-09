/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['genkit', '@genkit-ai/core', '@genkit-ai/googleai', 'dotprompt', 'handlebars'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('firebase-admin');
    }
    return config;
  },
};

export default nextConfig;
