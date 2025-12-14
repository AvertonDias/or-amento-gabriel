'use client';

import React, { useState, FormEvent, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Contact, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { maskCpfCnpj, maskTelefone, validateCpfCnpj } from '@/lib/utils';
import type { ClienteData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ClientFormProps {
    initialData: Omit<ClienteData, 'id' | 'userId'>;
    onSubmit: (data: Omit<ClienteData, 'id' | 'userId'>) => void;
    onImportContacts?: () => void;
    isSubmitting: boolean;
    triggerTitle: string;
    isEdit?: boolean;
    onCancel?: () => void;
}

export function ClientForm({ initialData, onSubmit, onImportContacts, isSubmitting, triggerTitle, isEdit = false, onCancel }: ClientFormProps) {
    const [client, setClient] = useState(initialData);
    const { toast } = useToast();

    const cpfCnpjStatus = useMemo(() => {
        if (!client.cpfCnpj) return 'incomplete';
        return validateCpfCnpj(client.cpfCnpj);
    }, [client.cpfCnpj]);
    const isCpfCnpjInvalid = client.cpfCnpj ? cpfCnpjStatus === 'invalid' : false;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let maskedValue = value;
        if (name === 'cpfCnpj') {
          maskedValue = maskCpfCnpj(value);
        }
        setClient(prev => ({ ...prev, [name]: maskedValue }));
    };

    const handleTelefoneChange = (index: number, field: 'nome' | 'numero', value: string) => {
        const setter = setClient;
        const maskedValue = field === 'numero' ? maskTelefone(value) : value;

        setter(prev => {
            if (!prev) return prev;
            const novosTelefones = [...(prev.telefones || [])];
            novosTelefones[index] = { ...novosTelefones[index], [field]: maskedValue };
            return { ...prev, telefones: novosTelefones };
        });
    };

    const addTelefone = () => {
        const setter = setClient;
        setter(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                telefones: [...(prev.telefones || []), { nome: '', numero: '' }]
            };
        });
    };

    const removeTelefone = (index: number) => {
        const setter = setClient;
        setter(prev => {
            if (!prev) return prev;
            if (prev.telefones.length <= 1) {
                toast({ title: "Ação não permitida", description: "Deve haver pelo menos um número de telefone.", variant: "destructive" });
                return prev;
            }
            const novosTelefones = prev.telefones.filter((_, i) => i !== index);
            return { ...prev, telefones: novosTelefones };
        });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!client.nome) {
            toast({ title: 'Campo Obrigatório', description: 'O campo Nome é obrigatório.', variant: 'destructive' });
            return;
        }
        if (client.cpfCnpj && cpfCnpjStatus === 'invalid') {
            toast({ title: "Documento inválido", description: "O CPF/CNPJ inserido não é válido.", variant: "destructive" });
            return;
        }
        if (!client.telefones.some(t => t.numero.trim() !== '')) {
            toast({ title: "Telefone obrigatório", description: "Pelo menos um número de telefone deve ser preenchido.", variant: "destructive" });
            return;
        }
        onSubmit(client);
    };

    const formContent = (
         <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="nome">Nome Completo / Razão Social</Label>
                    <Input id="nome" name="nome" value={client.nome} onChange={handleChange} placeholder="Ex: João da Silva" required />
                </div>
                <div>
                    <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
                    <div className="relative">
                        <Input 
                            id="cpfCnpj" name="cpfCnpj" value={client.cpfCnpj || ''} onChange={handleChange} placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX"
                            className={cn(
                                client.cpfCnpj && 'pr-10',
                                cpfCnpjStatus === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                                cpfCnpjStatus === 'invalid' && 'border-destructive focus-visible:ring-destructive'
                            )}
                        />
                        {client.cpfCnpj && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {cpfCnpjStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {cpfCnpjStatus === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                            </div>
                        )}
                    </div>
                    {client.cpfCnpj && (
                        <p className={cn("text-xs mt-1", cpfCnpjStatus === 'invalid' ? 'text-destructive' : 'text-muted-foreground')}>
                            {cpfCnpjStatus === 'invalid' ? 'Documento inválido.' : cpfCnpjStatus === 'incomplete' ? 'Documento incompleto.' : 'Documento válido.'}
                        </p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <Label htmlFor="endereco">Endereço Completo</Label>
                    <Input id="endereco" name="endereco" value={client.endereco} onChange={handleChange} placeholder="Rua, Número, Bairro, Cidade - UF" />
                </div>
                <div className="md:col-span-2 space-y-4">
                    <Label>Telefones de Contato</Label>
                    {(client.telefones || []).map((tel, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-1">
                                    <Label htmlFor={`tel-nome-${index}`} className="text-xs text-muted-foreground">Apelido</Label>
                                    <Input id={`tel-nome-${index}`} value={tel.nome} onChange={(e) => handleTelefoneChange(index, 'nome', e.target.value)} placeholder="Ex: Principal" />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor={`tel-numero-${index}`} className="text-xs text-muted-foreground">Número</Label>
                                    <Input id={`tel-numero-${index}`} value={tel.numero} onChange={(e) => handleTelefoneChange(index, 'numero', e.target.value)} placeholder="(DD) XXXXX-XXXX" />
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTelefone(index)} disabled={client.telefones.length <= 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addTelefone} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Telefone
                    </Button>
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={client.email || ''} onChange={handleChange} placeholder="contato@email.com" />
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isCpfCnpjInvalid}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEdit ? null : <PlusCircle className="mr-2 h-4 w-4" />}
                    {isEdit ? 'Salvar Alterações' : 'Adicionar Cliente'}
                </Button>
                {!isEdit && onImportContacts && (
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onImportContacts} disabled={isSubmitting}>
                        <Contact className="mr-2 h-4 w-4" />
                        Importar dos Contatos
                    </Button>
                )}
                 {isEdit && onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                )}
            </div>
        </form>
    );

    if (isEdit) {
        return <div className="py-4">{formContent}</div>;
    }

    return (
        <AccordionItem value="add-client-form" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-primary">
                    <PlusCircle className="h-5 w-5" /> {triggerTitle}
                </h2>
            </AccordionTrigger>
            <AccordionContent>{formContent}</AccordionContent>
        </AccordionItem>
    );
}
