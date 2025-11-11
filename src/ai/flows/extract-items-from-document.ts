// src/ai/flows/extract-items-from-document.ts

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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


const extractItemsPrompt = ai.definePrompt(
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

    Document: {{media url=documentDataUri}}
    `,
  }
);


export const extractItemsFromDocument = ai.defineFlow(
  {
    name: 'extractItemsFromDocument',
    inputSchema: ExtractItemsInputSchema,
    outputSchema: ExtractItemsOutputSchema,
  },
  async (input: ExtractItemsInput): Promise<ExtractItemsOutput> => {
    try {
        const { output } = await extractItemsPrompt(input);

      if (output?.items) {
        return { items: output.items };
      } else {
        console.warn("IA não conseguiu extrair itens ou a resposta foi inesperada.");
        return { items: [] };
      }
    } catch (error) {
      console.error("Erro na Server Action 'extractItemsFromDocument':", error);
      throw new Error(`Falha na extração de itens pela IA: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
