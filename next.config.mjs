
import {withPlaiceholder} from '@plaiceholder/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['genkit', '@genkit-ai/core', '@genkit-ai/googleai', 'dotprompt', 'handlebars'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  }
};

export default withPlaiceholder(nextConfig);
