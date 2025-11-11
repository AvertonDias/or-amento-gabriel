
// Adicionado para invalidar o cache e corrigir o erro de compilação.
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
