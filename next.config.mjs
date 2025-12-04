
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/_offline", // Rota para a página offline
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suas outras configurações do Next.js podem vir aqui
};

export default pwaConfig(nextConfig);
