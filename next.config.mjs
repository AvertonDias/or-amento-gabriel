
import PwaPlugin from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@genkit-ai/googleai', 'dotprompt', 'handlebars', '@opentelemetry/sdk-node', '@opentelemetry/api', '@opentelemetry/instrumentation', '@opentelemetry/exporter-jaeger'],
};

const withPWA = PwaPlugin({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);
