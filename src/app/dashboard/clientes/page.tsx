'use client';

import React, { useState, FormEvent, useEffect, useCallback, useMemo } from 'react';
import type { ClienteData, Orcamento } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, PlusCircle, Search, XCircle, MoreVertical, Pencil, History, Trash2, Loader2, Contact, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addCliente, deleteCliente, updateCliente } from '@/services/clientesService';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePermissionDialog } from '@/hooks/use-permission-dialog';
import { Input } from '@/components/ui/input';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';
import { Capacitor } from '@capacitor/core';
import { Contacts, PermissionStatus } from '@capacitor-community/contacts';
import { cn, maskCpfCnpj, maskTelefone, validateCpfCnpj } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge, badgeVariants } from '@/components/ui/badge';
import { type VariantProps } from 'class-variance-authority';


// Tipos que eram dos componentes
export interface SelectedContactDetails {
  name: string[];
  email: string[];
  tel: string[];
  address: any[];
}

export type OrcamentoStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Vencido';

export interface BudgetCounts {
    Pendente: number;
    Aceito: number;
    Recusado: number;
    Vencido: number;
    Total: number;
}


// #####################################################################
// COMPONENTE: ClientForm (Agora um sub-componente)
// #####################################################################

interface ClientFormProps {
    initialData: Omit<ClienteData, 'id' | 'userId'>;
    onSubmit: (data: Omit<ClienteData, 'id' | 'userId'>) => void;
    onImportContacts?: () => void;
    isSubmitting: boolean;
    triggerTitle: string;
    isEdit?: boolean;
    onCancel?: () => void;
}

function ClientForm({ initialData, onSubmit, onImportContacts, isSubmitting, triggerTitle, isEdit = false, onCancel }: ClientFormProps) {
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

// #####################################################################
// COMPONENTE: ClientList (Agora um sub-componente)
// #####################################################################

interface ClientListProps {
    clientes: ClienteData[];
    budgetCounts: Record<string, BudgetCounts>;
    onEdit: (client: ClienteData) => void;
    onDelete: (id: string) => void;
    onViewBudgets: (id: string) => void;
}

function ClientList({ clientes, budgetCounts, onEdit, onDelete, onViewBudgets }: ClientListProps) {
    const getStatusBadgeVariant = (status: OrcamentoStatus): VariantProps<typeof badgeVariants>['variant'] => {
        switch (status) {
            case 'Aceito': return 'default';
            case 'Recusado': return 'destructive';
            case 'Vencido': return 'warning';
            case 'Pendente': return 'secondary';
            default: return 'secondary';
        }
    }

    const BudgetBadges = ({ counts }: { counts: BudgetCounts | undefined }) => {
        if (!counts || counts.Total === 0) {
            return <p className="text-xs text-muted-foreground mt-1">Nenhum orçamento</p>;
        }
        const statusOrder: OrcamentoStatus[] = ['Pendente', 'Aceito', 'Recusado', 'Vencido'];
        return (
            <div className="flex flex-wrap items-center gap-2 mt-2">
                {statusOrder.map(status => {
                    if (counts[status] > 0) {
                        return (
                            <Badge key={status} variant={getStatusBadgeVariant(status)} className="text-xs">
                                {counts[status]} {status}
                            </Badge>
                        );
                    }
                    return null;
                })}
            </div>
        );
    };

    return (
        <Accordion type="multiple" className="w-full">
            {clientes.map(item => (
                <AccordionItem value={item.id!} key={item.id} className="border-b group">
                     <div className="relative flex items-center w-full">
                        <AccordionTrigger className="flex-1 text-left py-3 px-2 hover:no-underline rounded-t-lg data-[state=open]:bg-muted/50">
                            <span className="font-medium text-lg text-primary">{item.nome}</span>
                        </AccordionTrigger>
                        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(item)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar Cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onViewBudgets(item.id!)}>
                                        <History className="mr-2 h-4 w-4" />
                                        Ver Orçamentos
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <div className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-destructive focus:bg-destructive/10 focus:text-destructive")} onSelect={(e) => e.preventDefault()}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir Cliente
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(item.id!)}>Sim, Excluir</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {budgetCounts[item.id!]?.Total > 0 && (
                                <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                                    {budgetCounts[item.id!].Total}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <AccordionContent className="p-4 space-y-3">
                        {item.cpfCnpj && <p className="text-sm"><span className="font-medium text-muted-foreground">CPF/CNPJ:</span> {item.cpfCnpj}</p>}
                        {(item.telefones || []).map((tel, index) => (
                            <p key={index} className="text-sm">
                                <span className="font-medium text-muted-foreground">{tel.nome || `Telefone ${index + 1}`}:</span> {tel.numero}
                            </p>
                        ))}
                        {item.email && <p className="text-sm"><span className="font-medium text-muted-foreground">Email:</span> {item.email}</p>}
                        {item.endereco && <p className="text-sm"><span className="font-medium text-muted-foreground">Endereço:</span> {item.endereco}</p>}
                        <div className="pt-2">
                            <p className="text-sm font-medium text-muted-foreground mb-2 cursor-pointer hover:text-primary transition-colors" onClick={() => onViewBudgets(item.id!)}>
                                Histórico de Orçamentos
                            </p>
                            <BudgetBadges counts={budgetCounts[item.id!]} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}

// #####################################################################
// COMPONENTE: ClientModals (Agora um sub-componente)
// #####################################################################

interface ClientModalsProps {
    isEditModalOpen: boolean;
    setIsEditModalOpen: (isOpen: boolean) => void;
    editingClient: ClienteData | null;
    onSaveEdit: (client: ClienteData) => void;
    isSubmitting: boolean;
    isContactSelectionModalOpen: boolean;
    setIsContactSelectionModalOpen: (isOpen: boolean) => void;
    selectedContactDetails: SelectedContactDetails | null;
    onConfirmContactSelection: (data: Partial<ClienteData>) => void;
    isDuplicateAlertOpen: boolean;
    setIsDuplicateAlertOpen: (isOpen: boolean) => void;
    duplicateMessage: string;
    isApiNotSupportedAlertOpen: boolean;
    setIsApiNotSupportedAlertOpen: (isOpen: boolean) => void;
    deleteErrorAlert: { isOpen: boolean; message: string; };
    setDeleteErrorAlert: (alert: { isOpen: boolean; message: string; }) => void;
}

function ClientModals({
    isEditModalOpen, setIsEditModalOpen, editingClient, onSaveEdit, isSubmitting,
    isContactSelectionModalOpen, setIsContactSelectionModalOpen, selectedContactDetails, onConfirmContactSelection,
    isDuplicateAlertOpen, setIsDuplicateAlertOpen, duplicateMessage,
    isApiNotSupportedAlertOpen, setIsApiNotSupportedAlertOpen,
    deleteErrorAlert, setDeleteErrorAlert,
}: ClientModalsProps) {

    const formatAddress = (address: any): string => {
        if (!address) return '';
        const webParts = [address.addressLine1, address.addressLine2, address.city, address.region, address.postalCode, address.country].filter(Boolean);
        if (webParts.length > 0) return webParts.join(', ');
        const capacitorParts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);
        if (capacitorParts.length > 0) return capacitorParts.join(', ');
        return '';
    };

    const normalizePhoneNumber = (tel: string) => {
        if (!tel) return '';
        let onlyDigits = tel.replace(/\D/g, '');
        if (onlyDigits.startsWith('55')) {
          onlyDigits = onlyDigits.substring(2);
        }
        return onlyDigits;
    };

    const handleConfirmContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContactDetails) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const selectedTelRaw = formData.get('tel') as string || selectedContactDetails.tel?.[0] || '';
        const selectedEmail = formData.get('email') as string || selectedContactDetails.email?.[0] || '';
        const selectedAddressString = formData.get('address') as string || (selectedContactDetails.address?.[0] ? JSON.stringify(selectedContactDetails.address[0]) : '');
        
        let formattedAddress = '';
        if (selectedAddressString) {
          try {
            const selectedAddress = JSON.parse(selectedAddressString);
            formattedAddress = formatAddress(selectedAddress);
          } catch (error) { console.error("Error parsing selected address", error); }
        }
        const phoneNumber = normalizePhoneNumber(selectedTelRaw);

        onConfirmContactSelection({
          nome: selectedContactDetails.name?.[0] || 'Sem nome',
          email: selectedEmail,
          telefones: [{ nome: 'Principal', numero: phoneNumber ? maskTelefone(phoneNumber) : '' }],
          endereco: formattedAddress,
        });
    };
    
    return (
        <>
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-lg" onPointerDownOutside={(e) => { if (Capacitor.isNativePlatform()) e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                        <DialogDescription>Faça as alterações necessárias nos dados do cliente.</DialogDescription>
                    </DialogHeader>
                    {editingClient && (
                        <ClientForm
                            key={editingClient.id}
                            initialData={editingClient}
                            onSubmit={(data) => onSaveEdit({ ...data, id: editingClient.id, userId: editingClient.userId })}
                            isSubmitting={isSubmitting}
                            triggerTitle=""
                            isEdit={true}
                            onCancel={() => setIsEditModalOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
      
            <Dialog open={isContactSelectionModalOpen} onOpenChange={setIsContactSelectionModalOpen}>
                <DialogContent onPointerDownOutside={(e) => { if (Capacitor.isNativePlatform()) e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle>Escolha os Detalhes do Contato</DialogTitle>
                        <DialogDescription>O contato selecionado tem múltiplas informações. Escolha quais usar.</DialogDescription>
                    </DialogHeader>
                    {selectedContactDetails && (
                        <form onSubmit={handleConfirmContact} className="space-y-4 py-4">
                            <div className="space-y-2"><Label>Nome</Label><Input value={selectedContactDetails.name?.[0] || 'Sem nome'} disabled /></div>
                            {selectedContactDetails.tel?.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="tel-select">Telefone</Label>
                                    <Select name="tel" defaultValue={selectedContactDetails.tel?.[0]}><SelectTrigger id="tel-select"><SelectValue /></SelectTrigger>
                                        <SelectContent>{selectedContactDetails.tel.map((tel, i) => <SelectItem key={i} value={tel}>{tel}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            {selectedContactDetails.email?.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="email-select">Email</Label>
                                    <Select name="email" defaultValue={selectedContactDetails.email?.[0]}><SelectTrigger id="email-select"><SelectValue /></SelectTrigger>
                                        <SelectContent>{selectedContactDetails.email.map((email, i) => <SelectItem key={i} value={email}>{email}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            {selectedContactDetails.address?.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="address-select">Endereço</Label>
                                    <Select name="address" defaultValue={selectedContactDetails.address?.[0] ? JSON.stringify(selectedContactDetails.address[0]) : ''}><SelectTrigger id="address-select"><SelectValue /></SelectTrigger>
                                        <SelectContent>{selectedContactDetails.address.map((addr, i) => <SelectItem key={i} value={JSON.stringify(addr)}>{formatAddress(addr)}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Confirmar</Button></DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cliente Duplicado</AlertDialogTitle><AlertDialogDescription>{duplicateMessage}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setIsDuplicateAlertOpen(false)}>Entendido</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isApiNotSupportedAlertOpen} onOpenChange={setIsApiNotSupportedAlertOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Recurso Indisponível</AlertDialogTitle><AlertDialogDescription>A importação de contatos não é suportada pelo seu navegador atual. Recomendamos usar o Google Chrome ou Microsoft Edge.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setIsApiNotSupportedAlertOpen(false)}>Entendido</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteErrorAlert.isOpen} onOpenChange={(isOpen) => setDeleteErrorAlert({ ...deleteErrorAlert, isOpen })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Não é possível remover o cliente</AlertDialogTitle>
                        <AlertDialogDescription>{deleteErrorAlert.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setDeleteErrorAlert({ isOpen: false, message: '' })}>Entendido</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// #####################################################################
// COMPONENTE PRINCIPAL DA PÁGINA
// #####################################################################

const initialNewClientState: Omit<ClienteData, 'id' | 'userId'> = {
  nome: '',
  cpfCnpj: '',
  endereco: '',
  telefones: [{ nome: 'Principal', numero: '' }],
  email: '',
};

export default function ClientesPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();

  const clientes = useLiveQuery(() => 
    user ? db.clientes.where('userId').equals(user.uid).sortBy('data.nome') : [],
    [user]
  )?.map(c => c.data);

  const orcamentos = useLiveQuery(() =>
    user ? db.orcamentos.where('userId').equals(user.uid).toArray() : [],
    [user]
  )?.map(o => o.data);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClient, setNewClient] = useState(initialNewClientState);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClienteData | null>(null);
  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] = useState(false);
  const [selectedContactDetails, setSelectedContactDetails] = useState<SelectedContactDetails | null>(null);
  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [isApiNotSupportedAlertOpen, setIsApiNotSupportedAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteErrorAlert, setDeleteErrorAlert] = useState({ isOpen: false, message: '' });

  const { toast } = useToast();
  const { requestPermission } = usePermissionDialog();

  const isLoadingData = loadingAuth || clientes === undefined || orcamentos === undefined;

  const filteredClientes = useMemo(() => {
    if (!clientes) return [];
    if (!searchTerm) {
      return clientes;
    }
    return clientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  const budgetCountsByClient = useMemo(() => {
    if (!clientes || !orcamentos) return {};
    const counts: Record<string, BudgetCounts> = {};
    clientes.forEach(cliente => {
        if (!cliente.id) return;
        counts[cliente.id] = { Pendente: 0, Aceito: 0, Recusado: 0, Vencido: 0, Total: 0 };
    });
    orcamentos.forEach(orcamento => {
        const clienteId = orcamento.cliente.id;
        if (clienteId && counts[clienteId]) {
            counts[clienteId][orcamento.status]++;
            counts[clienteId].Total++;
        }
    });
    return counts;
  }, [clientes, orcamentos]);

  const checkForDuplicates = (clientData: Omit<ClienteData, 'id' | 'userId'>, clientIdToIgnore?: string): string | null => {
    if (!clientes) return null;
    let message = null;
    const clientNameLower = clientData.nome.trim().toLowerCase();
    const clientNumbers = clientData.telefones.map(t => t.numero).filter(Boolean);

    const filteredClientes = clientIdToIgnore ? clientes.filter(c => c.id !== clientIdToIgnore) : clientes;

    filteredClientes.forEach(cliente => {
        if (clientData.nome && cliente.nome.trim().toLowerCase() === clientNameLower) {
            message = `O nome "${clientData.nome}" já está cadastrado.`;
        } else if (clientData.cpfCnpj && cliente.cpfCnpj === clientData.cpfCnpj) {
            message = `O CPF/CNPJ "${clientData.cpfCnpj}" já está sendo usado pelo cliente "${cliente.nome}".`;
        } else if (clientData.email && cliente.email && cliente.email.toLowerCase() === clientData.email.toLowerCase()) {
            message = `O e-mail "${clientData.email}" já está sendo usado pelo cliente "${cliente.nome}".`;
        } else if (clientNumbers.length > 0 && Array.isArray(cliente.telefones)) {
            const clientNumbersInDb = cliente.telefones.map(t => t.numero);
            const duplicateNumber = clientNumbers.find(num => clientNumbersInDb.includes(num));
            if (duplicateNumber) {
                message = `O telefone "${duplicateNumber}" já está sendo usado pelo cliente "${cliente.nome}".`;
            }
        }
    });
    return message;
  };

  const handleAdicionarCliente = async (clientData: Omit<ClienteData, 'id' | 'userId'>) => {
    if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
    }
    const duplicateInfo = checkForDuplicates(clientData);
    if (duplicateInfo) {
        setDuplicateMessage(duplicateInfo);
        setIsDuplicateAlertOpen(true);
        return;
    }
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...clientData,
        telefones: clientData.telefones.filter(t => t.numero.trim() !== ''),
      };
      await addCliente(user.uid, dataToSave);
      setNewClient(initialNewClientState);
      toast({
        title: 'Sucesso!',
        description: 'Cliente adicionado e pendente de sincronização.',
      });
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast({ title: 'Erro ao adicionar cliente', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoverCliente = async (id: string) => {
    if (!user || !orcamentos) return;
    const hasBudgets = orcamentos.some(o => o.cliente.id === id);
    if (hasBudgets) {
        setDeleteErrorAlert({
            isOpen: true,
            message: 'Este cliente possui orçamentos associados e não pode ser removido. Por favor, remova os orçamentos primeiro.'
        });
        return;
    }
    try {
        await deleteCliente(id);
        toast({ title: 'Cliente Removido', description: 'A remoção será sincronizada.', variant: 'destructive' });
    } catch(error) {
        toast({ title: 'Erro ao remover cliente', variant: 'destructive' });
        console.error("Erro ao remover cliente:", error);
    }
  };
  
  const handleEditClick = (client: ClienteData) => {
    const clientWithTelefones = {
        ...client,
        telefones: Array.isArray(client.telefones) && client.telefones.length > 0 ? client.telefones : [{ nome: 'Principal', numero: '' }]
    };
    setEditingClient(clientWithTelefones);
    setIsEditModalOpen(true);
  };
  
  const handleSalvarEdicao = async (clientToUpdate: ClienteData) => {
    if (!clientToUpdate || !clientToUpdate.id || !user) return;
    setIsSubmitting(true);
    try {
        const { id, ...data } = clientToUpdate;
        const payload = {
          ...data,
          telefones: data.telefones.filter(t => t.numero.trim() !== ''),
        };
        await updateCliente(id, payload);
        setIsEditModalOpen(false);
        setEditingClient(null);
        toast({ title: 'Sucesso!', description: 'Cliente atualizado localmente. Sincronizando...' });
    } catch(error) {
        console.error("Erro ao atualizar cliente:", error);
        toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const formatAddress = (address: any): string => {
    if (!address) return '';
    const webParts = [address.addressLine1, address.addressLine2, address.city, address.region, address.postalCode, address.country].filter(Boolean);
    if(webParts.length > 0) return webParts.join(', ');
    const capacitorParts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);
    if(capacitorParts.length > 0) return capacitorParts.join(', ');
    return '';
  };

  const normalizePhoneNumber = (tel: string) => {
    if (!tel) return '';
    let onlyDigits = tel.replace(/\D/g, '');
    if (onlyDigits.startsWith('55')) {
      onlyDigits = onlyDigits.substring(2);
    }
    return onlyDigits;
  };
  
  const processSelectedContacts = (contacts: any[]) => {
      if (!contacts || contacts.length === 0) return;
      const contact = contacts[0];
      const isNative = Capacitor.isNativePlatform();
      let adaptedContact;

      if (isNative) {
          adaptedContact = {
              name: contact.name?.display ? [contact.name.display] : [],
              email: contact.emailAddresses?.map((e: any) => e.address) || [],
              tel: contact.phoneNumbers?.map((p: any) => p.number) || [],
              address: contact.postalAddresses?.map((a: any) => ({ street: a.street, city: a.city, state: a.state, postalCode: a.postalCode, country: a.country })) || [],
          };
      } else {
          adaptedContact = { name: contact.name || [], email: contact.email || [], tel: contact.tel || [], address: contact.address || [] };
      }

      const hasMultipleOptions = (adaptedContact.tel?.length > 1 || adaptedContact.email?.length > 1 || adaptedContact.address?.length > 1);

      if (hasMultipleOptions) {
          setSelectedContactDetails(adaptedContact);
          setIsContactSelectionModalOpen(true);
      } else {
          const formattedAddress = adaptedContact.address?.[0] ? formatAddress(adaptedContact.address[0]) : '';
          const phoneNumber = normalizePhoneNumber(adaptedContact.tel?.[0] || '');
          setNewClient({
              nome: adaptedContact.name?.[0] || 'Sem nome',
              email: adaptedContact.email?.[0] || '',
              telefones: [{ nome: 'Principal', numero: phoneNumber }],
              endereco: formattedAddress,
              cpfCnpj: '',
          });
          toast({ title: 'Contato Importado!', description: 'Os dados do contato foram preenchidos no formulário.' });
      }
  };

  const handleImportContacts = async () => {
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
          try {
              let permStatus: PermissionStatus = await Contacts.checkPermissions();
              if (permStatus.contacts !== 'granted') {
                  const granted = await requestPermission({ title: "Acessar Contatos?", description: "Para facilitar a criação de novos clientes, o app pode importar nomes e números da sua agenda. Deseja permitir?" });
                  if (granted) permStatus = await Contacts.requestPermissions();
              }

              if (permStatus.contacts !== 'granted') {
                   toast({ title: "Permissão necessária", description: "Por favor, conceda acesso aos contatos nas configurações do seu celular.", variant: "destructive" });
                   return;
              }

              const result = await Contacts.getContacts({ projection: { name: true, phones: true, emails: true, postalAddresses: true } });
              processSelectedContacts(result.contacts);
          } catch (error: any) {
              console.error('Erro ao buscar contatos no Capacitor:', error);
              toast({ title: 'Erro ao importar', description: 'Não foi possível ler os contatos do dispositivo.', variant: 'destructive' });
          }
      } else {
          if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
              setIsApiNotSupportedAlertOpen(true);
              return;
          }
          try {
              const contacts = await (navigator as any).contacts.select(['name', 'email', 'tel', 'address'], { multiple: false });
              processSelectedContacts(contacts);
          } catch (error: any) {
              if (error.name !== 'AbortError') {
                  setIsApiNotSupportedAlertOpen(true);
                  console.error('Erro ao importar contato via Web API:', error);
              }
          }
      }
  };
  
  const handleConfirmContactSelection = (selectedData: Partial<ClienteData>) => {
    setNewClient(prev => ({ ...prev, ...selectedData }));
    setIsContactSelectionModalOpen(false);
    setSelectedContactDetails(null);
    toast({ title: 'Contato Importado!', description: 'Os dados selecionados foram preenchidos no formulário.' });
  };

  const handleViewBudgets = (clienteId: string) => {
    router.push(`/dashboard/orcamento?clienteId=${clienteId}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Cadastro de Clientes
          </CardTitle>
          <CardDescription>
            Adicione e gerencie os seus clientes. Estes dados ficam salvos no seu dispositivo e são sincronizados quando há internet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full mb-6 border-b">
            <ClientForm
                key={JSON.stringify(newClient)}
                initialData={newClient}
                onSubmit={handleAdicionarCliente}
                onImportContacts={handleImportContacts}
                isSubmitting={isSubmitting}
                triggerTitle="Adicionar Novo Cliente"
            />
          </Accordion>

          {isLoadingData ? (
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="space-y-2">
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : clientes && clientes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold">Clientes Cadastrados</h2>
                <div className="flex w-full sm:w-auto items-center gap-2">
                  <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                          placeholder="Buscar cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-10"
                      />
                       {searchTerm && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setSearchTerm('')}
                          >
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        )}
                  </div>
                </div>
              </div>
               <ClientList
                 clientes={filteredClientes}
                 budgetCounts={budgetCountsByClient}
                 onEdit={handleEditClick}
                 onDelete={handleRemoverCliente}
                 onViewBudgets={handleViewBudgets}
               />
            </div>
          ) : (
             <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      <ClientModals
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingClient={editingClient}
        onSaveEdit={handleSalvarEdicao}
        isSubmitting={isSubmitting}
        
        isContactSelectionModalOpen={isContactSelectionModalOpen}
        setIsContactSelectionModalOpen={setIsContactSelectionModalOpen}
        selectedContactDetails={selectedContactDetails}
        onConfirmContactSelection={handleConfirmContactSelection}
        
        isDuplicateAlertOpen={isDuplicateAlertOpen}
        setIsDuplicateAlertOpen={setIsDuplicateAlertOpen}
        duplicateMessage={duplicateMessage}

        isApiNotSupportedAlertOpen={isApiNotSupportedAlertOpen}
        setIsApiNotSupportedAlertOpen={setIsApiNotSupportedAlertOpen}
        
        deleteErrorAlert={deleteErrorAlert}
        setDeleteErrorAlert={setDeleteErrorAlert}
      />
    </div>
  );
}
