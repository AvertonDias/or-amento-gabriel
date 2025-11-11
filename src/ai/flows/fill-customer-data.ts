// src/ai/flows/fill-customer-data.ts

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FillCustomerDataInputSchema = z.object({
  nome: z.string().optional().describe("The customer's name."),
  cpfCnpj: z.string().optional().describe("The customer's CPF or CNPJ."),
});
export type FillCustomerDataInput = z.infer<typeof FillCustomerDataInputSchema>;

const FillCustomerDataOutputSchema = z.object({
  nome: z.string().describe("The completed customer name."),
  endereco: z.string().describe("The completed customer address."),
  telefone: z.string().describe("The customer's phone number."),
  email: z.string().describe("The customer's email address."),
  cpfCnpj: z.string().describe("The customer's CPF or CNPJ."),
});
export type FillCustomerDataOutput = z.infer<typeof FillCustomerDataOutputSchema>;


const fillCustomerPrompt = ai.definePrompt({
    name: 'fillCustomerPrompt',
    input: { schema: FillCustomerDataInputSchema },
    output: { schema: FillCustomerDataOutputSchema },
    prompt: `Você é um assistente de preenchimento de dados especialista em encontrar informações públicas sobre empresas e pessoas no Brasil.
            Com base nas informações parciais fornecidas, preencha os dados restantes do cliente.
            Use fontes de dados públicas e abertas para encontrar as informações. Se não conseguir encontrar uma informação, retorne um campo vazio para ela.
            Priorize a precisão dos dados.

            Informações fornecidas:
            {{#if nome}}
            Nome: {{nome}}
            {{/if}}
            {{#if cpfCnpj}}
            CPF/CNPJ: {{cpfCnpj}}
            {{/if}}

            Preencha o seguinte objeto de saída com as informações completas que encontrar.
            `,
});


// O fluxo do Genkit
const fillCustomerDataFlow = ai.defineFlow(
  {
    name: 'fillCustomerDataFlow',
    inputSchema: FillCustomerDataInputSchema,
    outputSchema: FillCustomerDataOutputSchema,
  },
  async (input: FillCustomerDataInput) => {
    // Mantendo os console.logs para depuração (opcional, mas útil se tiver problemas)
    console.log("=== SERVER ACTION ENV DUMP START (FillCustomerData) ===");
    console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY ? "DEFINED" : "UNDEFINED");
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "DEFINED" : "UNDEFINED");
    console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS ? "DEFINED" : "UNDEFINED");
    console.log("=== SERVER ACTION ENV DUMP END (FillCustomerData) ===");

    const sanitizedInput = {
      ...input,
      nome: input.nome || undefined,
      cpfCnpj: input.cpfCnpj || undefined,
    };
    
    try {
        const {output} = await fillCustomerPrompt(sanitizedInput);
        
        if (output) {
            return output;
        } else {
            console.warn("IA não conseguiu preencher os dados ou a resposta foi inesperada.");
            return { nome: '', endereco: '', telefone: '', email: '', cpfCnpj: '' };
        }
    } catch (error) {
        console.error("Erro na Server Action 'fillCustomerDataFlow':", error);
        throw new Error(`Falha no preenchimento de dados pela IA: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// A função exportada que o front-end chamará
export async function fillCustomerData(input: FillCustomerDataInput): Promise<FillCustomerDataOutput> {
  return fillCustomerDataFlow(input);
}
