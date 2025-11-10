// src/ai/genkit.ts

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Configure e exporte o objeto 'ai' principal.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});
