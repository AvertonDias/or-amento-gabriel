// src/ai/genkit.ts

import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Configure o Genkit UMA VEZ.
configureGenkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});

// A única coisa que este arquivo precisa fazer é garantir a configuração.
// Nenhuma exportação para os flows aqui.
// Os flows importarão tudo do 'genkit' original e '@genkit-ai/googleai'.
