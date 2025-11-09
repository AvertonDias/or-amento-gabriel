import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Força o uso da chave de API definida nas variáveis de ambiente
export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  model: 'googleai/gemini-pro',
});
