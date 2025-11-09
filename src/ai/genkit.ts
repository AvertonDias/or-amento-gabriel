// src/ai/genkit.ts

import { configureGenkit, defineFlow, generate } from 'genkit';
import { googleAI, gemini } from '@genkit-ai/googleai';

// Configure o Genkit UMA VEZ.
configureGenkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});

// Exporte as funções e os modelos para que os flows possam importá-los.
export { defineFlow, generate, gemini };
