// @ts-check
import { withPWA } from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['genkit', '@genkit-ai/core', '@genkit-ai/googleai', 'dotprompt', 'handlebars', 'require-in-the-middle'],
  experimental: {
    serverActions: true, 
  },
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals.push({
        'firebase-admin': 'firebase-admin',
      });
    }
    return config;
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig);

