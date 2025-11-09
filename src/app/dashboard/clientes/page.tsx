
'use client';

import React, { useState, FormEvent, useEffect, useCallback, useMemo } from 'react';
import type { ClienteData, Orcamento } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Users, PlusCircle, Pencil, Contact, RefreshCw, CheckCircle, XCircle, History, FileText, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { maskCpfCnpj, maskTelefone, validateCpfCnpj } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addCliente, deleteCliente, getClientes, updateCliente } from '@/services/clientesService';
import { getOrcamentos } from '@/services/orcamentosService';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"


const initialNewClientState: Omit<ClienteData, 'id' | 'userId'> = {
  nome: '',
  cpfCnpj: '',
  endereco: '',
  telefone: '',
  email: '',
};

interface SelectedContactDetails {
  name: string[];
  email: string[];
  tel: string[];
  address: any[];
}

type OrcamentoStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Vencido';

interface BudgetCounts {
    Pendente: number;
    Aceito: number;
    Recusado: number;
    Vencido: number;
    Total: number;
}

export default function ClientesPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClient, setNewClient] = useState(initialNewClientState);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClienteData | null>(null);

  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] = useState(false);
  const [selectedContactDetails, setSelectedContactDetails] = useState<SelectedContactDetails | null>(null);

  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");

  const { toast } = useToast();
  
  const newClientCpfCnpjStatus = useMemo(() => {
    if (!newClient.cpfCnpj) return 'incomplete';
    return validateCpfCnpj(newClient.cpfCnpj);
  }, [newClient.cpfCnpj]);

  const editingClientCpfCnpjStatus = useMemo(() => {
    if (!editingClient?.cpfCnpj) return 'incomplete';
    return validateCpfCnpj(editingClient.cpfCnpj);
  }, [editingClient?.cpfCnpj]);

  const fetchPageData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const [clientesData, orcamentosData] = await Promise.all([
        getClientes(user.uid),
        getOrcamentos(user.uid),
      ]);
      setClientes(clientesData);
      setOrcamentos(orcamentosData);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      toast({ title: 'Erro ao carregar dados da página', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchPageData();
    } else if (!loadingAuth) {
      setClientes([]);
      setOrcamentos([]);
      setIsLoadingData(false);
    }
  }, [user, loadingAuth, fetchPageData]);

  const budgetCountsByClient = useMemo(() => {
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

  const handleNewClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === 'cpfCnpj') {
      maskedValue = maskCpfCnpj(value);
    } else if (name === 'telefone') {
      maskedValue = maskTelefone(value);
    }
    setNewClient(prev => ({ ...prev, [name]: maskedValue }));
  };

  const checkForDuplicates = (): string | null => {
    let message = null;
    const newClientNameLower = newClient.nome.trim().toLowerCase();
    clientes.forEach(cliente => {
        if (newClient.nome && cliente.nome.trim().toLowerCase() === newClientNameLower) {
            message = `O nome "${newClient.nome}" já está cadastrado.`;
        } else if (newClient.cpfCnpj && cliente.cpfCnpj === newClient.cpfCnpj) {
            message = `O CPF/CNPJ "${newClient.cpfCnpj}" já está sendo usado pelo cliente "${cliente.nome}".`;
        } else if (newClient.email && cliente.email && cliente.email.toLowerCase() === newClient.email.toLowerCase()) {
            message = `O e-mail "${newClient.email}" já está sendo usado pelo cliente "${cliente.nome}".`;
        } else if (newClient.telefone && cliente.telefone === newClient.telefone) {
            message = `O telefone "${newClient.telefone}" já está sendo usado pelo cliente "${cliente.nome}".`;
        }
    });
    return message;
  };


  const handleAdicionarCliente = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
    }
    if (!newClient.nome) {
      toast({
        title: 'Campo Obrigatório',
        description: 'O campo Nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (newClient.cpfCnpj && newClientCpfCnpjStatus === 'invalid') {
        toast({ title: "Documento inválido", description: "O CPF/CNPJ inserido não é válido.", variant: "destructive" });
        return;
    }


    const duplicateInfo = checkForDuplicates();
    if (duplicateInfo) {
        setDuplicateMessage(duplicateInfo);
        setIsDuplicateAlertOpen(true);
        return;
    }

    setIsSubmitting(true);
    try {
      const clientData = {
        nome: newClient.nome,
        cpfCnpj: newClient.cpfCnpj,
        endereco: newClient.endereco,
        telefone: newClient.telefone,
        email: newClient.email,
      };
      await addCliente(user.uid, clientData);
      setNewClient(initialNewClientState);
      await fetchPageData(); // Refresh list
      toast({
        title: 'Sucesso!',
        description: 'Cliente adicionado.',
      });
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast({ title: 'Erro ao adicionar cliente', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoverCliente = async (id: string) => {
    if (!user) return;
    try {
        await deleteCliente(id);
        await fetchPageData(); // Refresh list
        toast({
            title: 'Cliente Removido',
            variant: 'destructive',
        });
    } catch(error) {
        toast({ title: 'Erro ao remover cliente', variant: 'destructive' });
    }
  };
  
  const handleEditClick = (client: ClienteData) => {
    setEditingClient({ ...client });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingClient) return;
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === 'cpfCnpj') {
      maskedValue = maskCpfCnpj(value);
    } else if (name === 'telefone') {
      maskedValue = maskTelefone(value);
    }
    setEditingClient(prev => prev ? { ...prev, [name]: maskedValue } : null);
  };

  const handleSalvarEdicao = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.id || !user) return;

    if (!editingClient.nome) {
      toast({
        title: 'Campo Obrigatório',
        description: 'O campo Nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (editingClient.cpfCnpj && editingClientCpfCnpjStatus === 'invalid') {
        toast({ title: "Documento inválido", description: "O CPF/CNPJ inserido não é válido.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const { id, userId, ...clientToUpdate } = editingClient;
        await updateCliente(id, clientToUpdate);
        setIsEditModalOpen(false);
        setEditingClient(null);
        await fetchPageData(); // Refresh list
        toast({
            title: 'Sucesso!',
            description: 'Cliente atualizado com sucesso.',
        });
    } catch(error) {
        console.error("Erro ao atualizar cliente:", error);
        toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleImportContacts = async () => {
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const props = ['name', 'email', 'tel', 'address'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        
        if (contacts.length > 0) {
          const contact = contacts[0];
          
          const hasMultipleOptions = (contact.tel?.length > 1 || contact.email?.length > 1 || contact.address?.length > 1);

          if (hasMultipleOptions) {
            setSelectedContactDetails(contact);
            setIsContactSelectionModalOpen(true);
          } else {
            const address = contact.address?.[0];
            const formattedAddress = address ? [address.streetAddress, address.addressLevel2, address.addressLevel1, address.postalCode, address.country].filter(Boolean).join(', ') : '';
            
            const partialClient = {
              nome: contact.name?.[0] || '',
              email: contact.email?.[0] || '',
              telefone: contact.tel?.[0] ? maskTelefone(contact.tel[0]) : '',
              endereco: formattedAddress,
              cpfCnpj: '',
            };
            setNewClient(partialClient);
            toast({
              title: 'Contato Importado!',
              description: 'Os dados do contato foram preenchidos no formulário.',
            });
          }
        }
      } catch (error) {
        console.error('Erro ao importar contato:', error);
        toast({
          title: 'Importação Cancelada',
          description: 'Não foi possível importar o contato.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Recurso não suportado',
        description: 'Seu navegador não suporta a API de Contatos para importação.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmContactSelection = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedContactDetails) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const selectedTel = formData.get('tel') as string || '';
    const selectedEmail = formData.get('email') as string || '';
    const selectedAddressString = formData.get('address') as string || '';
    const selectedAddress = selectedAddressString ? JSON.parse(selectedAddressString) : null;
    
    const formattedAddress = selectedAddress ? [selectedAddress.streetAddress, selectedAddress.addressLevel2, selectedAddress.addressLevel1, selectedAddress.postalCode, selectedAddress.country].filter(Boolean).join(', ') : '';

    const partialClient = {
      nome: selectedContactDetails.name?.[0] || '',
      email: selectedEmail,
      telefone: selectedTel ? maskTelefone(selectedTel) : '',
      endereco: formattedAddress,
      cpfCnpj: '',
    };
    
    setNewClient(partialClient);
    setIsContactSelectionModalOpen(false);
    setSelectedContactDetails(null);
    toast({
      title: 'Contato Importado!',
      description: 'Os dados selecionados foram preenchidos no formulário.',
    });
  };

  const handleViewBudgets = (clienteId: string) => {
    router.push(`/dashboard/orcamento?clienteId=${clienteId}`);
  };

  const getStatusBadgeVariant = (status: OrcamentoStatus): "default" | "destructive" | "secondary" | "warning" => {
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
  
  const showSkeleton = loadingAuth || isLoadingData;
  const isCpfCnpjInvalid = newClient.cpfCnpj ? newClientCpfCnpjStatus === 'invalid' : false;
  const isEditingCpfCnpjInvalid = editingClient?.cpfCnpj ? editingClientCpfCnpjStatus === 'invalid' : false;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Cadastro de Clientes
          </CardTitle>
          <CardDescription>
            Adicione e gerencie os seus clientes. Estes dados ficarão salvos na nuvem e poderão ser usados nos orçamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full mb-6 border-b">
            <AccordionItem value="add-client-form" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-primary">
                    <PlusCircle className="h-5 w-5" /> Adicionar Novo Cliente
                  </h2>
              </AccordionTrigger>
              <AccordionContent>
                <form onSubmit={handleAdicionarCliente} className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome Completo / Razão Social</Label>
                      <Input id="nome" name="nome" value={newClient.nome} onChange={handleNewClientChange} placeholder="Ex: João da Silva" required />
                    </div>
                    <div>
                      <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
                      <div className="relative">
                          <Input 
                            id="cpfCnpj" 
                            name="cpfCnpj" 
                            value={newClient.cpfCnpj || ''} 
                            onChange={handleNewClientChange} 
                            placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX"
                            className={cn(
                                newClient.cpfCnpj && 'pr-10',
                                newClientCpfCnpjStatus === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                                newClientCpfCnpjStatus === 'invalid' && 'border-destructive focus-visible:ring-destructive'
                            )}
                          />
                          {newClient.cpfCnpj && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {newClientCpfCnpjStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-500" />}
                              {newClientCpfCnpjStatus === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                            </div>
                          )}
                      </div>
                      {newClient.cpfCnpj && (
                           <p className={cn(
                              "text-xs mt-1",
                              newClientCpfCnpjStatus === 'invalid' ? 'text-destructive' : 'text-muted-foreground'
                           )}>
                            {newClientCpfCnpjStatus === 'invalid' ? 'Documento inválido.' : newClientCpfCnpjStatus === 'incomplete' ? 'Documento incompleto.' : 'Documento válido.'}
                           </p>
                        )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="endereco">Endereço Completo</Label>
                      <Input id="endereco" name="endereco" value={newClient.endereco} onChange={handleNewClientChange} placeholder="Rua, Número, Bairro, Cidade - UF" />
                    </div>
                    <div>
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" name="telefone" type="tel" value={newClient.telefone} onChange={handleNewClientChange} placeholder="(DD) XXXXX-XXXX" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" value={newClient.email || ''} onChange={handleNewClientChange} placeholder="contato@email.com" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isCpfCnpjInvalid}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      Adicionar Cliente
                    </Button>
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleImportContacts} disabled={isSubmitting}>
                      <Contact className="mr-2 h-4 w-4" />
                      Importar dos Contatos
                    </Button>
                  </div>
                </form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {showSkeleton ? (
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
          ) : clientes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Clientes Cadastrados</h2>
                <Button variant="ghost" size="sm" onClick={fetchPageData} disabled={isLoadingData}>
                  <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span className="ml-2">Atualizar</span>
                </Button>
              </div>

               <Accordion type="multiple" className="w-full">
                  {clientes.map(item => (
                    <AccordionItem value={item.id!} key={item.id} className="border-b">
                      <div className="flex items-center w-full group">
                          <AccordionTrigger className="flex-1 hover:no-underline py-3 px-2 rounded-t-lg data-[state=open]:bg-muted/50">
                              <span className="font-medium text-lg text-primary">{item.nome}</span>
                          </AccordionTrigger>
                          <div className="flex items-center gap-2 pr-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                      <MoreVertical className="h-5 w-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar Cliente
                                  </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewBudgets(item.id!)}>
                                      <History className="mr-2 h-4 w-4" />
                                      Ver Orçamentos
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <div className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        "text-destructive focus:bg-destructive/10 focus:text-destructive"
                                      )}
                                      onSelect={(e) => e.preventDefault()}
                                      >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Excluir Cliente
                                      </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoverCliente(item.id!)}>Sim, Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                      </div>
                      <AccordionContent className="p-4 space-y-3">
                          {item.cpfCnpj && <p className="text-sm"><span className="font-medium text-muted-foreground">CPF/CNPJ:</span> {item.cpfCnpj}</p>}
                          {item.telefone && <p className="text-sm"><span className="font-medium text-muted-foreground">Telefone:</span> {item.telefone}</p>}
                          {item.email && <p className="text-sm"><span className="font-medium text-muted-foreground">Email:</span> {item.email}</p>}
                          {item.endereco && <p className="text-sm"><span className="font-medium text-muted-foreground">Endereço:</span> {item.endereco}</p>}
                          <div className="pt-2">
                            <p 
                                className="text-sm font-medium text-muted-foreground mb-2 cursor-pointer hover:text-primary transition-colors"
                                onClick={() => handleViewBudgets(item.id!)}
                            >
                                Histórico de Orçamentos
                            </p>
                            <BudgetBadges counts={budgetCountsByClient[item.id!]} />
                          </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </div>
          ) : (
             <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado ainda. Se você já cadastrou, pode ser necessário criar um índice no Firestore. Verifique o console para erros.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias nos dados do cliente.
            </DialogDescription>
          </DialogHeader>
          {editingClient && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-nome">Nome</Label>
                  <Input id="edit-nome" name="nome" value={editingClient.nome} onChange={handleEditFormChange} required />
                </div>
                <div>
                  <Label htmlFor="edit-cpfCnpj">CPF / CNPJ</Label>
                  <div className="relative">
                      <Input 
                        id="edit-cpfCnpj" 
                        name="cpfCnpj" 
                        value={editingClient.cpfCnpj || ''} 
                        onChange={handleEditFormChange}
                        className={cn(
                            editingClient.cpfCnpj && 'pr-10',
                            editingClientCpfCnpjStatus === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                            editingClientCpfCnpjStatus === 'invalid' && 'border-destructive focus-visible:ring-destructive'
                        )}
                      />
                      {editingClient.cpfCnpj && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {editingClientCpfCnpjStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {editingClientCpfCnpjStatus === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                        </div>
                      )}
                  </div>
                   {editingClient.cpfCnpj && (
                       <p className={cn(
                          "text-xs mt-1",
                          editingClientCpfCnpjStatus === 'invalid' ? 'text-destructive' : 'text-muted-foreground'
                       )}>
                        {editingClientCpfCnpjStatus === 'invalid' ? 'Documento inválido.' : editingClientCpfCnpjStatus === 'incomplete' ? 'Documento incompleto.' : 'Documento válido.'}
                       </p>
                    )}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-endereco">Endereço</Label>
                  <Input id="edit-endereco" name="endereco" value={editingClient.endereco} onChange={handleEditFormChange} />
                </div>
                <div>
                  <Label htmlFor="edit-telefone">Telefone</Label>
                  <Input id="edit-telefone" name="telefone" type="tel" value={editingClient.telefone} onChange={handleEditFormChange} />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" type="email" value={editingClient.email || ''} onChange={handleEditFormChange} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting || isEditingCpfCnpjInvalid}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isContactSelectionModalOpen} onOpenChange={setIsContactSelectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha os Detalhes do Contato</DialogTitle>
            <DialogDescription>
              O contato selecionado tem múltiplas informações. Escolha quais usar.
            </DialogDescription>
          </DialogHeader>
          {selectedContactDetails && (
            <form onSubmit={handleConfirmContactSelection} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={selectedContactDetails.name?.[0] || 'Sem nome'} disabled />
              </div>

              {selectedContactDetails.tel?.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="tel-select">Telefone</Label>
                  <Select name="tel">
                    <SelectTrigger id="tel-select">
                      <SelectValue placeholder="Selecione um telefone..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedContactDetails.tel.map((tel, i) => (
                        <SelectItem key={i} value={tel}>{tel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedContactDetails.email?.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="email-select">Email</Label>
                  <Select name="email">
                    <SelectTrigger id="email-select">
                      <SelectValue placeholder="Selecione um email..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedContactDetails.email.map((email, i) => (
                        <SelectItem key={i} value={email}>{email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedContactDetails.address?.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="address-select">Endereço</Label>
                  <Select name="address">
                    <SelectTrigger id="address-select">
                      <SelectValue placeholder="Selecione um endereço..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedContactDetails.address.map((addr, i) => {
                        const formatted = [addr.streetAddress, addr.addressLevel2, addr.addressLevel1, addr.postalCode, addr.country].filter(Boolean).join(', ');
                        return <SelectItem key={i} value={JSON.stringify(addr)}>{formatted}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setSelectedContactDetails(null)}>Cancelar</Button>
                </DialogClose>
                <Button type="submit">Confirmar Seleção</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cliente Duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsDuplicateAlertOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    