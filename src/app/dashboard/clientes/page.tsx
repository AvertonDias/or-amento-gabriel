
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { ClienteData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Users, PlusCircle, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { maskCpfCnpj, maskTelefone } from '@/lib/utils';

const initialNewClientState: Omit<ClienteData, 'id'> = {
  nome: '',
  cpfCnpj: '',
  endereco: '',
  telefone: '',
  email: '',
};

export default function ClientesPage() {
  const [clientes, setClientes] = useLocalStorage<ClienteData[]>('clientesList', []);
  const [newClient, setNewClient] = useState<Omit<ClienteData, 'id'>>(initialNewClientState);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClienteData | null>(null);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();

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

  const adicionarCliente = (e: FormEvent) => {
    e.preventDefault();
    if (!newClient.nome) {
      toast({
        title: 'Campo Obrigatório',
        description: 'O campo Nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setClientes(prev => [...prev, { ...newClient, id: crypto.randomUUID() }]);
    setNewClient(initialNewClientState);
    toast({
      title: 'Sucesso!',
      description: 'Cliente adicionado à lista.',
    });
  };

  const removerCliente = (id: string) => {
    setClientes(clientes.filter(item => item.id !== id));
    toast({
      title: 'Cliente Removido',
      description: 'O cliente foi removido da sua lista.',
      variant: 'destructive',
    });
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

  const salvarEdicao = (e: FormEvent) => {
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

    setClientes(clientes.map(c => c.id === editingClient.id ? editingClient : c));
    setIsEditModalOpen(false);
    setEditingClient(null);
    toast({
      title: 'Sucesso!',
      description: 'Cliente atualizado com sucesso.',
    });
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
            Adicione e gerencie os seus clientes. Estes dados ficarão salvos no seu navegador e poderão ser usados nos orçamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={adicionarCliente} className="space-y-6 border-b pb-6 mb-6">
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
              <Button type="submit" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Cliente
              </Button>
            </div>
          </form>

          {!isClient ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : clientes.length > 0 && (
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
                          <Button variant="ghost" size="icon" onClick={() => removerCliente(item.id!)}>
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
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removerCliente(item.id!)}>
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
            <form onSubmit={salvarEdicao} className="space-y-4 py-4">
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
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
