// src/ai/genkit.ts

import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Importe seus flows para que possam ser registrados se necessário,
// embora a configuração principal possa estar aqui.
import './flows/extract-items-from-document';
import './flows/fill-customer-data';

configureGenkit({
  plugins: [
    // Configure o plugin do Google AI.
    // Ao NÃO passar 'apiKey', ele tentará usar as Credenciais Padrão do Aplicativo (ADC).
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Exporte um objeto 'ai' para ser usado de forma consistente em toda a aplicação.
export { genkit as ai } from 'genkit';
