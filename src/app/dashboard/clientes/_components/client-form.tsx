
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
import type { Control } from 'react-hook-form';


/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                      */
/* -------------------------------------------------------------------------- */

const telefoneSchema = z.object({
  nome: z.string().optional(),
  numero: z
    .string()
    .transform(val => val.replace(/\D/g, ''))
    .pipe(z.string().min(10, 'Informe um número válido')),
});

// O primeiro telefone é agora obrigatório e parte do objeto principal
const formSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  telefonePrincipal: z.string().transform(val => val.replace(/\D/g, '')).pipe(z.string().min(10, 'Informe um número válido')),
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
  // Telefones adicionais são opcionais
  telefonesAdicionais: z.array(telefoneSchema).optional(),
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
  formControl?: Control<ClientFormValues>;
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
  formControl
}: ClientFormProps) {
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      telefonePrincipal: '',
      cpfCnpj: '',
      endereco: '',
      email: '',
      telefonesAdicionais: [],
    },
  });
  
  const control = formControl || form.control;
  const { handleSubmit, reset } = form;

  /* ------------------------------------------------------------------------ */
  /* SINCRONIZA initialData                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!initialData) return;
    
    // Separa o telefone principal dos adicionais
    const principal = initialData.telefones?.find(t => t.principal) || initialData.telefones?.[0];
    const adicionais = initialData.telefones?.filter(t => t !== principal).map(t => ({ nome: t.nome ?? '', numero: t.numero ?? '' })) || [];
  
    const valuesToReset = {
      nome: initialData.nome || '',
      telefonePrincipal: principal?.numero || '',
      cpfCnpj: initialData.cpfCnpj || '',
      endereco: initialData.endereco || '',
      email: initialData.email || '',
      telefonesAdicionais: adicionais,
    };
  
    // Reseta o form interno ou o form pai
    if (formControl) {
      Object.entries(valuesToReset).forEach(([key, value]) => {
        form.setValue(key as keyof ClientFormValues, value, {
          shouldValidate: true,
        });
      });
    } else {
      reset(valuesToReset);
    }
  }, [initialData, reset, formControl, form]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'telefonesAdicionais',
  });

  /* ------------------------------------------------------------------------ */
  /* UI                                                                        */
  /* ------------------------------------------------------------------------ */

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo*</FormLabel>
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
            name="telefonePrincipal"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Telefone Principal*</FormLabel>
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
                  value={field.value ?? ''}
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
                <Input placeholder="Opcional" {...field} value={field.value ?? ''} />
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
                <Input placeholder="Opcional" {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Telefones Adicionais</FormLabel>

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
              <FormField
                control={control}
                name={`telefonesAdicionais.${index}.nome`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Ex: Contato"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name={`telefonesAdicionais.${index}.numero`}
                render={({ field }) => (
                  <FormItem>
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
