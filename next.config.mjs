
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: false, // Alterado de `process.env.NODE_ENV === 'development'` para `false` para forçar a ativação
  fallbacks: {
    document: "/_offline",
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // your next config here
};

export default withPWA(nextConfig);
