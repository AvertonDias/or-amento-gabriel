'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import type { ClienteData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Users, PlusCircle, Pencil, Contact } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { maskCpfCnpj, maskTelefone } from '@/lib/utils';
import { fillCustomerData, FillCustomerDataInput } from '@/ai/flows/fill-customer-data';
import { Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addCliente, deleteCliente, getClientes, updateCliente } from '@/services/clientesService';

const initialNewClientState: Omit<ClienteData, 'id' | 'userId'> = {
  nome: '',
  cpfCnpj: '',
  endereco: '',
  telefone: '',
  email: '',
};

export default function ClientesPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClient, setNewClient] = useState(initialNewClientState);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClienteData | null>(null);
  const [isFillingData, setIsFillingData] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = getClientes(user.uid, (data) => {
        setClientes(data);
        setIsLoadingData(false);
      });
    } else if (!loadingAuth) {
      setIsLoadingData(false);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, loadingAuth]);


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

  const handleAiFill = async () => {
    if(!newClient.nome && !newClient.cpfCnpj) {
        toast({
            title: "Dados insuficientes",
            description: "Preencha o Nome ou o CPF/CNPJ para usar a busca com IA.",
            variant: "destructive"
        });
        return;
    }

    setIsFillingData(true);
    try {
        const input: FillCustomerDataInput = {
            nome: newClient.nome,
            cpfCnpj: newClient.cpfCnpj?.replace(/[^\d]/g, ''), // Enviar sem máscara
        };
        const result = await fillCustomerData(input);
        
        setNewClient({
            nome: result.nome || newClient.nome,
            cpfCnpj: result.cpfCnpj ? maskCpfCnpj(result.cpfCnpj) : newClient.cpfCnpj,
            endereco: result.endereco || newClient.endereco,
            telefone: result.telefone ? maskTelefone(result.telefone) : newClient.telefone,
            email: result.email || newClient.email,
        });

        toast({
            title: "Dados preenchidos com IA!",
            description: "Verifique as informações e complete o que faltar.",
        });

    } catch (error) {
        console.error("Erro ao preencher dados com IA:", error);
        toast({
            title: "Erro na busca com IA",
            description: "Não foi possível completar os dados. Tente novamente.",
            variant: "destructive"
        });
    } finally {
        setIsFillingData(false);
    }
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

    setIsSubmitting(true);
    try {
      await addCliente(user.uid, newClient);
      setNewClient(initialNewClientState);
      toast({
        title: 'Sucesso!',
        description: 'Cliente adicionado.',
      });
    } catch (error) {
      toast({ title: 'Erro ao adicionar cliente', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoverCliente = async (id: string) => {
    try {
        await deleteCliente(id);
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
    if (!editingClient || !editingClient.id) return;

    if (!editingClient.nome) {
      toast({
        title: 'Campo Obrigatório',
        description: 'O campo Nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
        await updateCliente(editingClient.id, editingClient);
        setIsEditModalOpen(false);
        setEditingClient(null);
        toast({
            title: 'Sucesso!',
            description: 'Cliente atualizado com sucesso.',
        });
    } catch(error) {
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
          const address = contact.address?.[0];
          const formattedAddress = address 
            ? `${address.addressLine1 || ''} ${address.addressLine2 || ''}, ${address.city || ''} - ${address.region || ''}`.trim().replace(/, $/, '')
            : '';

          setNewClient({
            nome: contact.name?.[0] || '',
            email: contact.email?.[0] || '',
            telefone: contact.tel?.[0] ? maskTelefone(contact.tel[0]) : '',
            endereco: formattedAddress,
            cpfCnpj: '', // CPF/CNPJ não está disponível na API de contatos
          });
          toast({
            title: 'Contato Importado!',
            description: 'Os dados do contato foram preenchidos. Revise e salve o novo cliente.',
          });
        }
      } catch (error) {
        toast({
          title: 'Importação Cancelada',
          description: 'Não foi possível importar o contato. A permissão pode ter sido negada ou a operação cancelada.',
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
  
  const showSkeleton = loadingAuth || isLoadingData;


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
          <form onSubmit={handleAdicionarCliente} className="space-y-6 border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold">Adicionar Novo Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome Completo / Razão Social</Label>
                <Input id="nome" name="nome" value={newClient.nome} onChange={handleNewClientChange} placeholder="Ex: João da Silva" required />
              </div>
              <div>
                <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
                <Input id="cpfCnpj" name="cpfCnpj" value={newClient.cpfCnpj || ''} onChange={handleNewClientChange} placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX" />
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
              <Button type="submit" className="w-full sm:w-auto" disabled={isFillingData || isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Adicionar Cliente
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleImportContacts} disabled={isFillingData || isSubmitting}>
                <Contact className="mr-2 h-4 w-4" />
                Importar dos Contatos
              </Button>
               <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleAiFill} disabled={isFillingData || isSubmitting}>
                {isFillingData ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4">
                        <path d="M12.75 4.75L15.25 7.25L12.75 9.75L14.15 8.35L17.5 11.7L18.9 10.3L15.55 6.95L16.95 5.55L12.75 1.35V4.75ZM9.85 15.65L6.5 12.3L5.1 13.7L8.45 17.05L7.05 18.45L11.25 22.65V19.25L8.75 16.75L11.25 14.25L9.85 15.65ZM19.25 1.35L15.05 5.55L16.45 6.95L19.8 3.6L21.2 5L17.85 8.35L19.25 9.75L23.65 5.55V1.35H19.25ZM5.55 18.45L1.35 14.25V18.45H5.55Z" />
                    </svg>
                )}
                Preencher com IA
              </Button>
            </div>
          </form>

          {showSkeleton ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <div className="space-y-2">
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : clientes.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Clientes Cadastrados</h2>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell>{item.cpfCnpj}</TableCell>
                        <TableCell>{item.telefone}</TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoverCliente(item.id!)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {clientes.map(item => (
                  <Card key={item.id} className="p-0">
                      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
                          <div className="flex-1 pr-2">
                              <CardTitle className="text-lg leading-tight">{item.nome}</CardTitle>
                              {item.cpfCnpj && <CardDescription className="mt-1">CPF/CNPJ: {item.cpfCnpj}</CardDescription>}
                          </div>
                          <div className="flex">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}>
                                  <Pencil className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoverCliente(item.id!)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-sm space-y-2">
                          {item.endereco && <p><span className="font-medium text-muted-foreground">Endereço:</span> {item.endereco}</p>}
                          {item.telefone && <p><span className="font-medium text-muted-foreground">Telefone:</span> {item.telefone}</p>}
                          {item.email && <p><span className="font-medium text-muted-foreground">Email:</span> {item.email}</p>}
                      </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
             <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado ainda.</p>
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
                  <Input id="edit-cpfCnpj" name="cpfCnpj" value={editingClient.cpfCnpj || ''} onChange={handleEditFormChange} />
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
                <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    