/** @type {import('next').NextConfig} */
const nextConfig = {
  // Adding a timestamp to force a rebuild
  // Timestamp: 1729824276701
  webpack: (config, { isServer }) => {
    // Adicione quaisquer personalizações do webpack aqui, se necessário.
    return config;
  },
};

export default nextConfig;
