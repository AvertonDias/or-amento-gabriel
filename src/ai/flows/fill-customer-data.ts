
'use server';
/**
 * @fileOverview An AI agent to complete customer data.
 *
 * - fillCustomerData - A function that completes customer data from partial information.
 * - FillCustomerDataInput - The input type for the fillCustomerData function.
 * - FillCustomerDataOutput - The return type for the fillCustomerData function.
 */

import {ai} from '@/ai/genkit';
import { defineFlow } from 'genkit';
import {z} from 'zod';

const FillCustomerDataInputSchema = z.object({
  nome: z.string().optional().describe('The customer\'s name.'),
  cpfCnpj: z.string().optional().describe('The customer\'s CPF or CNPJ.'),
});
export type FillCustomerDataInput = z.infer<typeof FillCustomerDataInputSchema>;

const FillCustomerDataOutputSchema = z.object({
  nome: z.string().describe('The completed customer name.'),
  endereco: z.string().describe('The completed customer address.'),
  telefone: z.string().describe('The customer\'s phone number.'),
  email: z.string().describe('The customer\'s email address.'),
  cpfCnpj: z.string().describe('The customer\'s CPF or CNPJ.'),
});
export type FillCustomerDataOutput = z.infer<typeof FillCustomerDataOutputSchema>;


export async function fillCustomerData(input: FillCustomerDataInput): Promise<FillCustomerDataOutput> {
  return fillCustomerDataFlow(input);
}


const prompt = ai.definePrompt({
  name: 'fillCustomerDataPrompt',
  input: {schema: FillCustomerDataInputSchema},
  output: {schema: FillCustomerDataOutputSchema},
  prompt: `Você é um assistente de preenchimento de dados especialista em encontrar informações públicas sobre empresas e pessoas no Brasil.
Com base nas informações parciais fornecidas, preencha os dados restantes do cliente.
Use fontes de dados públicas e abertas para encontrar as informações. Se não conseguir encontrar uma informação, retorne um campo vazio para ela.
Priorize a precisão dos dados.

Informações fornecidas:
{{#if nome}}
Nome: {{{nome}}}
{{/if}}
{{#if cpfCnpj}}
CPF/CNPJ: {{{cpfCnpj}}}
{{/if}}

Preencha o seguinte objeto de saída com as informações completas que encontrar.
`,
});

const fillCustomerDataFlow = defineFlow(
  {
    name: 'fillCustomerDataFlow',
    inputSchema: FillCustomerDataInputSchema,
    outputSchema: FillCustomerDataOutputSchema,
  },
  async (input) => {
    // Garante que cpfCnpj seja undefined se for uma string vazia, para o prompt Handlebars
    const sanitizedInput = {
      ...input,
      cpfCnpj: input.cpfCnpj || undefined,
    };
    const {output} = await prompt(sanitizedInput);
    return output!;
  }
);
