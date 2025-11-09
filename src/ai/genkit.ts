import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({apiKey: undefined})], // Força o uso de ADC (Application Default Credentials)
  model: 'googleai/gemini-pro',
});
