// src/ai/genkit.ts

import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Apenas configure o Genkit aqui.
// A configuração deve acontecer antes que qualquer flow tente usar os modelos.
configureGenkit({
  plugins: [
    // Ao NÃO passar 'apiKey', ele tentará usar as Credenciais Padrão do Aplicativo (ADC).
    // Isso é o que queremos para as Server Actions em Cloud Workstations.
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false, // Desativa o tracing para resolver problemas de build
});

// Exporte o objeto ai para ser usado pelos fluxos
export const ai = {
  geminiPro: googleAI('gemini-pro'),
  geminiProVision: googleAI('gemini-pro-vision'),
};
