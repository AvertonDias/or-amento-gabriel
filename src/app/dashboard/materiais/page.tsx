'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import type { MaterialItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Wrench, PlusCircle, Pencil, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addMaterial, deleteMaterial, getMateriais, updateMaterial } from '@/services/materiaisService';


const initialNewItemState: Omit<MaterialItem, 'id' | 'userId'> = {
  descricao: '',
  unidade: 'un',
  precoUnitario: null,
};

export default function MateriaisPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [materiais, setMateriais] = useState<MaterialItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState(initialNewItemState);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  const { toast } = useToast();
  
  const fetchMateriais = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const data = await getMateriais(user.uid);
      setMateriais(data);
    } catch (error) {
      console.error("Erro ao buscar materiais:", error);
      toast({ title: 'Erro ao carregar materiais', variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchMateriais();
    } else if (!loadingAuth) {
      setMateriais([]);
      setIsLoadingData(false);
    }
  }, [user, loadingAuth, fetchMateriais]);

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'precoUnitario') {
      const numValue = value === '' ? null : parseFloat(value.replace(',', '.'));
      setNewItem(prev => ({ ...prev, [name]: numValue }));
    } else {
      setNewItem(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAdicionarMaterial = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    if (!newItem.descricao || newItem.precoUnitario === null) {
        toast({
            title: "Campos Obrigatórios",
            description: "Por favor, preencha a Descrição e o Preço.",
            variant: "destructive"
        });
        return;
    }
    
    setIsSubmitting(true);
    try {
      await addMaterial(user.uid, newItem);
      setNewItem(initialNewItemState);
      await fetchMateriais(); // Refresh list
      toast({
        title: "Sucesso!",
        description: "Item/Serviço adicionado.",
      });
    } catch (error) {
       toast({ title: 'Erro ao adicionar item', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoverMaterial = async (id: string) => {
    try {
        await deleteMaterial(id);
        await fetchMateriais(); // Refresh list
        toast({
            title: "Item Removido",
            variant: "destructive"
        });
    } catch(error) {
        toast({ title: 'Erro ao remover item', variant: 'destructive' });
    }
  };
  
  const handleEditClick = (material: MaterialItem) => {
    setEditingMaterial({ ...material });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingMaterial) return;
    const { name, value } = e.target;
     if (name === 'precoUnitario') {
      const numValue = value === '' ? null : parseFloat(value.replace(',', '.'));
      setEditingMaterial(prev => prev ? { ...prev, [name]: numValue } : null);
    } else {
      setEditingMaterial(prev => prev ? { ...prev, [name]: value } : null);
    }
  };
  
  const handleSalvarEdicao = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterial.id) return;

    if(!editingMaterial.descricao || editingMaterial.precoUnitario === null) {
      toast({
          title: "Campos Obrigatórios",
          description: "Por favor, preencha Descrição e Preço.",
          variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
        await updateMaterial(editingMaterial.id, editingMaterial);
        setIsEditModalOpen(false);
        setEditingMaterial(null);
        await fetchMateriais(); // Refresh list
        toast({
            title: "Sucesso!",
            description: "Item atualizado com sucesso.",
        });
    } catch(error) {
        toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const showSkeleton = loadingAuth || isLoadingData;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Cadastro de Itens e Serviços
          </CardTitle>
          <CardDescription>
            Adicione e gerencie os itens e serviços que serão usados nos orçamentos.
            Estes dados ficarão salvos na nuvem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdicionarMaterial} className="space-y-6 border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold">Adicionar Novo Item/Serviço</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <Label htmlFor="descricao">Descrição do Item/Serviço</Label>
                <Input id="descricao" name="descricao" value={newItem.descricao} onChange={handleNewItemChange} placeholder="Ex: Troca de tomada, Pintura de parede" required/>
              </div>
              
              <div>
                <Label htmlFor="unidade">Unidade de Medida</Label>
                <Input id="unidade" name="unidade" value={newItem.unidade} onChange={handleNewItemChange} placeholder="Ex: un, h, m², serv" required/>
              </div>

              <div>
                <Label htmlFor="precoUnitario">Preço (R$)</Label>
                <Input id="precoUnitario" name="precoUnitario" type="text" inputMode='decimal' placeholder="12,50" value={newItem.precoUnitario === null ? '' : String(newItem.precoUnitario).replace('.',',')} onChange={handleNewItemChange} required/>
              </div>
              
              <div className="md:col-span-3">
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Adicionar Item
                </Button>
              </div>

            </div>
          </form>

          {showSkeleton ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="space-y-2">
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : materiais.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Itens Cadastrados</h2>
                <Button variant="ghost" size="sm" onClick={fetchMateriais} disabled={isLoadingData}>
                  <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span className="ml-2">Atualizar</span>
                </Button>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Descrição</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materiais.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>{formatCurrency(item.precoUnitario)}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoverMaterial(item.id)}>
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
                {materiais.map(item => (
                  <Card key={item.id} className="p-0">
                      <CardHeader className="flex flex-row items-start justify-between p-4">
                          <div>
                              <CardTitle className="text-base">{item.descricao}</CardTitle>
                              <CardDescription>Unidade: {item.unidade}</CardDescription>
                          </div>
                          <div className="flex gap-1 -mr-2 -mt-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoverMaterial(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                      </CardHeader>
                      <CardFooter className="p-4 pt-2 mt-2 bg-muted/50 flex justify-between items-center">
                          <p className="font-bold">Preço</p>
                          <p className="font-bold text-primary text-base">{formatCurrency(item.precoUnitario)} / {item.unidade}</p>
                      </CardFooter>
                  </Card>
                ))}
              </div>

            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum item ou serviço cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Item/Serviço</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias no item selecionado.
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4 py-4">
               <div>
                  <Label htmlFor="edit-descricao">Descrição do Item/Serviço</Label>
                  <Input id="edit-descricao" name="descricao" value={editingMaterial.descricao} onChange={handleEditFormChange} required/>
                </div>
                <div>
                  <Label htmlFor="edit-unidade">Unidade de Medida</Label>
                  <Input id="edit-unidade" name="unidade" value={editingMaterial.unidade} onChange={handleEditFormChange} required/>
                </div>
                <div>
                  <Label htmlFor="edit-precoUnitario">Preço (R$)</Label>
                  <Input id="edit-precoUnitario" name="precoUnitario" type="text" inputMode='decimal' value={editingMaterial.precoUnitario === null ? '' : String(editingMaterial.precoUnitario).replace('.',',')} onChange={handleEditFormChange} required/>
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
