
'use server';
/**
 * @fileOverview An AI agent to extract items from a shopping list or invoice.
 *
 * - extractItemsFromDocument - A function that extracts items from a document.
 * - ExtractItemsInput - The input type for the extractItemsFromDocument function.
 * - ExtractItemsOutput - The return type for the extractItemsFromDocument function.
 */

// Importe a configuração Genkit para GARANTIR que ela seja executada.
import '@/ai/genkit';

import {z} from 'zod';
import { defineFlow } from 'genkit';
import { geminiProVision } from '@genkit-ai/googleai';


const ItemSchema = z.object({
    descricao: z.string().describe('The full description of the item.'),
    quantidade: z.number().describe('The quantity of the item.'),
    precoUnitario: z.number().describe('The price per unit of the item.'),
    unidade: z.string().describe('The unit of measurement for the item (e.g., "un", "m", "kg"). If not specified, assume "un".'),
});

const ExtractItemsInputSchema = z.object({
  documentDataUri: z.string().describe(
      "An image or PDF of a shopping list or invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type ExtractItemsInput = z.infer<typeof ExtractItemsInputSchema>;


const ExtractItemsOutputSchema = z.object({
  items: z.array(ItemSchema).describe('An array of items extracted from the document.'),
});
export type ExtractItemsOutput = z.infer<typeof ExtractItemsOutputSchema>;

const extractPrompt = geminiProVision.definePrompt(
  {
    name: 'extractItemsPrompt',
    input: { schema: ExtractItemsInputSchema },
    output: { schema: ExtractItemsOutputSchema },
    prompt: `You are an expert data entry assistant. Your task is to analyze the provided image or PDF of a shopping list or invoice and extract all items listed.

            For each item, identify its description, quantity, and unit price.
            - If the unit is not explicitly mentioned, assume it is "un" (unit).
            - If a price is listed, ensure it is a number. If no price is found, set it to 0.
            - If a quantity is not listed, assume it is 1.

            Return the data as a structured JSON object.

            Document to analyze:
            {{media url=documentDataUri}}
            `,
  },
);


export const extractItemsFromDocument = defineFlow(
  {
    name: 'extractItemsFromDocument',
    inputSchema: ExtractItemsInputSchema,
    outputSchema: ExtractItemsOutputSchema,
  },
  async (input) => {
    // Mantendo os console.logs para depuração
    console.log("SERVER ACTION ENV - GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY ? "DEFINED" : "UNDEFINED");
    console.log("SERVER ACTION ENV - GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "DEFINED" : "UNDEFINED");
    console.log("SERVER ACTION ENV - NODE_ENV:", process.env.NODE_ENV);
    
    try {
        const { output } = await extractPrompt(input);

      if (output()?.items) {
        return { items: output()!.items };
      } else {
        console.warn("IA não conseguiu extrair itens ou a resposta foi inesperada");
        return { items: [] };
      }
    } catch (error) {
      console.error("Erro na Server Action 'extractItemsFromDocument':", error);
      throw new Error(`Falha na extração de itens pela IA: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
