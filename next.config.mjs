
/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/_offline", // Rota para a página de fallback
  },
});

const nextConfig = {
  reactStrictMode: true,
  // Outras configurações do Next.js podem vir aqui
};

module.exports = withPWA(nextConfig);
