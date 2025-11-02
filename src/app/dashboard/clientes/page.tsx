
'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import type { ClienteData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Users, PlusCircle, Pencil, Contact, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { maskCpfCnpj, maskTelefone } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addCliente, deleteCliente, getClientes, updateCliente } from '@/services/clientesService';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


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

  const { toast } = useToast();

  const fetchClientes = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const data = await getClientes(user.uid);
      setClientes(data);
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error);
      toast({ title: 'Erro ao carregar clientes', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchClientes();
    } else if (!loadingAuth) {
      // User is not logged in and auth check is complete
      setClientes([]);
      setIsLoadingData(false);
    }
  }, [user, loadingAuth, fetchClientes]);

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
      const clientData = {
        nome: newClient.nome,
        cpfCnpj: newClient.cpfCnpj,
        endereco: newClient.endereco,
        telefone: newClient.telefone,
        email: newClient.email,
      };
      await addCliente(user.uid, clientData);
      setNewClient(initialNewClientState);
      await fetchClientes(); // Refresh list
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
    try {
        await deleteCliente(id);
        await fetchClientes(); // Refresh list
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
        const { id, userId, ...clientToUpdate } = editingClient;
        const plainClientObject = {
            nome: clientToUpdate.nome,
            cpfCnpj: clientToUpdate.cpfCnpj,
            endereco: clientToUpdate.endereco,
            telefone: clientToUpdate.telefone,
            email: clientToUpdate.email,
        };

        await updateCliente(id, plainClientObject);
        setIsEditModalOpen(false);
        setEditingClient(null);
        await fetchClientes(); // Refresh list
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
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
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
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Clientes Cadastrados</h2>
                <Button variant="ghost" size="sm" onClick={fetchClientes} disabled={isLoadingData}>
                  <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span className="ml-2">Atualizar</span>
                </Button>
              </div>

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
