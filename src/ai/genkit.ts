// src/ai/genkit.ts

// Usaremos a importação que a própria documentação do Genkit sugere para configuração
// Isso deve ser um named export de 'genkit'
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// A configuração é simples
configureGenkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug', // Manter para depuração
  enableTracingAndMetrics: false, // Manter desativado
});

// Este arquivo NÃO EXPORTA nada para as Server Actions usarem.
// As Server Actions importarão `defineFlow`, `generate` e os modelos diretamente
// das bibliotecas 'genkit' e '@genkit-ai/googleai'.
