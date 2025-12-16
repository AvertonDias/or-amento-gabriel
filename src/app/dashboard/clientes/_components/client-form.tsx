'use client';

import React, { useState, useEffect } from 'react';
import type { ClienteData, Telefone } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, Loader2, UserPlus } from 'lucide-react';
import { maskCpfCnpj, maskTelefone } from '@/lib/utils';


const telefoneSchema = z.object({
    nome: z.string().optional(),
    numero: z.string().min(1, "Número é obrigatório"),
});

const formSchema = z.object({
  nome: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  cpfCnpj: z.string().optional(),
  endereco: z.string().optional(),
  email: z.string().email({ message: "Formato de e-mail inválido." }).optional().or(z.literal('')),
  telefones: z.array(telefoneSchema).min(1, "Pelo menos um telefone é obrigatório."),
});

type ClientFormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
    initialData: Partial<ClientFormValues>;
    onSubmit: (data: ClientFormValues) => void;
    onImportContacts?: () => void;
    isSubmitting: boolean;
    triggerTitle?: string;
    isEditMode?: boolean;
}

export default function ClientForm({ initialData, onSubmit, onImportContacts, isSubmitting, triggerTitle, isEditMode = false }: ClientFormProps) {
    const form = useForm<ClientFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ...initialData,
            telefones: Array.isArray(initialData.telefones) && initialData.telefones.length > 0 ? initialData.telefones : [{ nome: 'Principal', numero: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "telefones",
    });

    const triggerContent = (
        <h2 className="text-xl font-semibold flex items-center gap-2 text-primary hover:no-underline py-4">
          <PlusCircle className="h-5 w-5" /> {triggerTitle || 'Adicionar Cliente'}
        </h2>
    );

    const formContent = (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="nome"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: João da Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    {onImportContacts && !isEditMode && (
                        <div className="md:col-span-2">
                            <Button type="button" variant="outline" onClick={onImportContacts} className="w-full">
                                <UserPlus className="mr-2 h-4 w-4" /> Importar da Agenda
                            </Button>
                        </div>
                    )}
                    
                    <FormField
                        control={form.control}
                        name="cpfCnpj"
                        render={({ field: { onChange, ...restField } }) => (
                            <FormItem>
                            <FormLabel>CPF/CNPJ</FormLabel>
                            <FormControl>
                                <Input placeholder="Opcional" onChange={(e) => onChange(maskCpfCnpj(e.target.value))} {...restField} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="joao@exemplo.com (Opcional)" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endereco"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                                <Input placeholder="Rua, 123, Bairro, Cidade - UF (Opcional)" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <div className="space-y-3">
                    <FormLabel>Telefones</FormLabel>
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-2">
                            <FormField
                                control={form.control}
                                name={`telefones.${index}.numero`}
                                render={({ field: { onChange, ...restField } }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="(DD) XXXXX-XXXX" onChange={(e) => onChange(maskTelefone(e.target.value))} {...restField}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ nome: '', numero: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Telefone
                    </Button>
                </div>
                <div className="pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isEditMode ? 'Salvar Alterações' : 'Adicionar Cliente'}
                    </Button>
                </div>
            </form>
        </Form>
    );

    if (isEditMode) {
        return formContent;
    }

    return (
        <AccordionItem value="add-client-form" className="border-b-0">
            <AccordionTrigger>{triggerContent}</AccordionTrigger>
            <AccordionContent>
                {formContent}
            </AccordionContent>
        </AccordionItem>
    );
}
