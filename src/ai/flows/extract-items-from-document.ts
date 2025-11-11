// src/ai/flows/extract-items-from-document.ts

'use server';

import { ImageAnnotatorClient } from '@google-cloud/vision';
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


export async function extractItemsFromDocument(input: ExtractItemsInput): Promise<ExtractItemsOutput> {
    const client = new ImageAnnotatorClient();

    const dataUri = input.documentDataUri;
    const base64Data = dataUri.substring(dataUri.indexOf(',') + 1);
    const mimeType = dataUri.substring(dataUri.indexOf(':') + 1, dataUri.indexOf(';'));

    try {
        const [result] = await client.documentTextDetection({
            image: {
                content: base64Data,
            },
            imageContext: {
                languageHints: ['pt-BR'],
            },
        });

        const fullText = result.fullTextAnnotation?.text || '';
        
        console.log("-----------------------------------------");
        console.log("Texto completo extraído via Google Cloud Vision API:\n", fullText);
        console.log("-----------------------------------------");

        const newExtractedItems: ExtractItemsOutput['items'] = [];
        const rawLines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let tempDescription = "";
        for (const line of rawLines) {
             if (line.match(/^\d+CSNBOB/i)) { // Parece ser uma linha de descrição com código
                if (tempDescription) {
                    tempDescription += " " + line;
                } else {
                    tempDescription = line;
                }
            } else {
                const dataMatch = line.match(/(kg|un|m|m²|h|serv)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/i);
                if (dataMatch && tempDescription) {
                    newExtractedItems.push({
                        descricao: tempDescription,
                        unidade: dataMatch[1].toLowerCase(),
                        quantidade: parseFloat(dataMatch[2].replace(/\./g, '').replace(',', '.')),
                        precoUnitario: parseFloat(dataMatch[3].replace(/\./g, '').replace(',', '.')),
                    });
                    tempDescription = ""; // Resetar descrição após encontrar dados
                } else if (!dataMatch && line.length > 10 && !line.toLowerCase().includes('total')) {
                  if (tempDescription) {
                    tempDescription += " " + line; // Continua a descrição
                  }
                }
            }
        }

        const validatedOutput = ExtractItemsOutputSchema.parse({ items: newExtractedItems });

        if (validatedOutput?.items && validatedOutput.items.length > 0) {
            return validatedOutput;
        } else {
            console.warn("Google Cloud Vision AI extraiu texto, mas a lógica de parsing não encontrou itens válidos.");
            return { items: [] };
        }
    } catch (error) {
        console.error("Erro na Server Action 'extractItemsFromDocument' (Vision AI SDK):", error);
        throw new Error(`Falha na extração de itens do documento: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
}
