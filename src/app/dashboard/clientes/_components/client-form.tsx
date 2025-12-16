'use client';

import React, { useEffect } from 'react';
import type { ClienteData } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PlusCircle, Trash2, Loader2, UserPlus } from 'lucide-react';
import { maskCpfCnpj, maskTelefone } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                      */
/* -------------------------------------------------------------------------- */

const telefoneSchema = z.object({
  nome: z.string().optional(),
  numero: z
    .string()
    .min(8, 'Telefone inválido')
    .refine(
      value => value.replace(/\D/g, '').length >= 10,
      'Informe um número válido'
    ),
});

const formSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  cpfCnpj: z
    .string()
    .optional()
    .refine(
      value => !value || [11, 14].includes(value.replace(/\D/g, '').length),
      'CPF ou CNPJ inválido'
    ),
  endereco: z.string().optional(),
  email: z
    .string()
    .email('Formato de e-mail inválido')
    .optional()
    .or(z.literal('')),
  telefones: z.array(telefoneSchema).min(1, 'Informe ao menos um telefone'),
});

export type ClientFormValues = z.infer<typeof formSchema>;

/* -------------------------------------------------------------------------- */
/* PROPS                                                                       */
/* -------------------------------------------------------------------------- */

interface ClientFormProps {
  initialData: Partial<ClienteData>;
  onSubmit: (data: ClientFormValues) => void;
  onImportContacts?: () => void;
  isSubmitting: boolean;
  triggerTitle?: string;
  isEditMode?: boolean;
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                   */
/* -------------------------------------------------------------------------- */

export default function ClientForm({
  initialData,
  onSubmit,
  onImportContacts,
  isSubmitting,
  triggerTitle,
  isEditMode = false,
}: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      cpfCnpj: '',
      endereco: '',
      email: '',
      telefones: [{ nome: 'Principal', numero: '' }],
    },
  });

  const { control, handleSubmit, reset } = form;

  /* ------------------------------------------------------------------------ */
  /* SINCRONIZA initialData                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!initialData) return;

    reset({
      nome: initialData.nome || '',
      cpfCnpj: initialData.cpfCnpj || '',
      endereco: initialData.endereco || '',
      email: initialData.email || '',
      telefones:
        Array.isArray(initialData.telefones) &&
        initialData.telefones.length > 0
          ? initialData.telefones
          : [{ nome: 'Principal', numero: '' }],
    });
  }, [initialData, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'telefones',
  });

  /* ------------------------------------------------------------------------ */
  /* UI                                                                        */
  /* ------------------------------------------------------------------------ */

  const formContent = (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: João da Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {onImportContacts && !isEditMode && (
          <Button
            type="button"
            variant="outline"
            onClick={onImportContacts}
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Importar da Agenda
          </Button>
        )}

        <FormField
          control={control}
          name="cpfCnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF / CNPJ</FormLabel>
              <FormControl>
                <Input
                  placeholder="Opcional"
                  {...field}
                  onChange={e =>
                    field.onChange(maskCpfCnpj(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input placeholder="Opcional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="endereco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input placeholder="Opcional" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Telefones</FormLabel>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={control}
                name={`telefones.${index}.numero`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="(DD) XXXXX-XXXX"
                        {...field}
                        onChange={e =>
                          field.onChange(maskTelefone(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ nome: 'Outro', numero: '' })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Telefone
          </Button>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditMode ? (
            'Salvar Alterações'
          ) : (
            'Adicionar Cliente'
          )}
        </Button>
      </form>
    </Form>
  );

  if (isEditMode) return formContent;

  return (
    <AccordionItem value="add-client">
      <AccordionTrigger>
        <PlusCircle className="mr-2 h-4 w-4" />
        {triggerTitle || 'Adicionar Cliente'}
      </AccordionTrigger>
      <AccordionContent>{formContent}</AccordionContent>
    </AccordionItem>
  );
}
