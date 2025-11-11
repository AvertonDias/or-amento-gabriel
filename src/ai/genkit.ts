// src/ai/genkit.ts

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Esta é a maneira canônica de configurar o Genkit na v1.
// O objeto 'ai' resultante é o ponto de entrada para todas as operações do Genkit.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});
