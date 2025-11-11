// src/ai/flows/fill-customer-data.ts

'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
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


export async function fillCustomerData(input: FillCustomerDataInput): Promise<FillCustomerDataOutput> {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const sanitizedInput = {
        ...input,
        nome: input.nome || undefined,
        cpfCnpj: input.cpfCnpj || undefined,
    };

    let promptText = `Você é um assistente de preenchimento de dados especialista em encontrar informações públicas sobre empresas e pessoas no Brasil.
Com base nas informações parciais fornecidas, preencha os dados restantes do cliente.
Use fontes de dados públicas e abertas para encontrar as informações. Se não conseguir encontrar uma informação, retorne um campo vazio para ela.
Priorize a precisão dos dados.

Informações fornecidas:
`;
    if (sanitizedInput.nome) {
        promptText += `Nome: ${sanitizedInput.nome}\n`;
    }
    if (sanitizedInput.cpfCnpj) {
        promptText += `CPF/CNPJ: ${sanitizedInput.cpfCnpj}\n`;
    }
    promptText += `
Preencha o seguinte objeto de saída com as informações completas que encontrar.
Responda APENAS com o objeto JSON.`;

    try {
        const result = await model.generateContent({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: FillCustomerDataOutputSchema,
            },
        });

        const response = result.response;
        const textOutput = response.text();

        let parsedOutput: FillCustomerDataOutput;
        try {
            parsedOutput = FillCustomerDataOutputSchema.parse(JSON.parse(textOutput));
        } catch (parseError) {
            console.error("Erro ao fazer parse da saída da IA:", parseError);
            throw new Error(`A IA retornou um JSON inválido. ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }

        if (parsedOutput) {
            return parsedOutput;
        } else {
            console.warn("IA não conseguiu preencher os dados ou a resposta foi inesperada.");
            return { nome: '', endereco: '', telefone: '', email: '', cpfCnpj: '' };
        }
    } catch (error) {
        console.error("Erro na Server Action 'fillCustomerData':", error);
        throw new Error(`Falha no preenchimento de dados pela IA: ${error instanceof Error ? error.message : String(error)}`);
    }
}
