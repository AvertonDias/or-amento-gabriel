import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Força o uso de ADC (Application Default Credentials) ao não passar uma chave
export const ai = genkit({
  plugins: [googleAI({apiKey: undefined})],
  model: 'googleai/gemini-pro',
});
