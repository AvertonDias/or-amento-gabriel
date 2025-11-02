
'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import type { MaterialItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Wrench, PlusCircle, Pencil, Loader2, RefreshCw, Package, Construction } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, maskCurrency, maskDecimal } from '@/lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addMaterial, deleteMaterial, getMateriais, updateMaterial } from '@/services/materiaisService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';


const initialNewItemState: Omit<MaterialItem, 'id' | 'userId'> = {
  descricao: '',
  unidade: 'un',
  precoUnitario: null,
  tipo: 'item',
  quantidade: null,
  quantidadeMinima: null,
};

const unidadesDeMedida = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'serv', label: 'Serviço (serv)' },
];

// Helper function to normalize strings for comparison
const normalizeString = (str: string) => {
  return str.trim().toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ');
};


export default function MateriaisPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [materiais, setMateriais] = useState<MaterialItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'item' | 'servico'>('item');

  const [newItem, setNewItem] = useState({ ...initialNewItemState, tipo: activeTab });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  // States for string representation of number inputs
  const [precoUnitarioStr, setPrecoUnitarioStr] = useState('');
  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [quantidadeMinimaStr, setQuantidadeMinimaStr] = useState('');
  const [editingPrecoUnitarioStr, setEditingPrecoUnitarioStr] = useState('');
  const [editingQuantidadeStr, setEditingQuantidadeStr] = useState('');
  const [editingQuantidadeMinimaStr, setEditingQuantidadeMinimaStr] = useState('');

  // State for update confirmation
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [conflictingItem, setConflictingItem] = useState<MaterialItem | null>(null);


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
  
  const handleTabChange = (value: string) => {
    const tab = value as 'item' | 'servico';
    setActiveTab(tab);
    const newUnidade = tab === 'servico' ? 'serv' : 'un';
    setNewItem({ ...initialNewItemState, tipo: tab, unidade: newUnidade });
    setPrecoUnitarioStr('');
    setQuantidadeStr('');
    setQuantidadeMinimaStr('');
  };

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleNewItemNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'precoUnitario') {
      const maskedValue = maskCurrency(value);
      setPrecoUnitarioStr(maskedValue);
      const numericValue = parseFloat(maskedValue.replace(/\D/g, '')) / 100 || null;
      setNewItem(prev => ({...prev, precoUnitario: numericValue }));
    } else {
        const maskedValue = maskDecimal(value);
        const numericValue = maskedValue === '' ? null : parseFloat(maskedValue.replace(',', '.'));
        if (name === 'quantidade') {
          setQuantidadeStr(maskedValue);
          setNewItem(prev => ({...prev, quantidade: numericValue }));
        } else if (name === 'quantidadeMinima') {
          setQuantidadeMinimaStr(maskedValue);
          setNewItem(prev => ({...prev, quantidadeMinima: numericValue }));
        }
    }
  };


  const handleUnitChange = (value: string) => {
    setNewItem(prev => ({ ...prev, unidade: value }));
  };
  
  const performAdd = async () => {
    if (!user) return; // Should already be checked
     try {
      const payload: Omit<MaterialItem, 'id' | 'userId'> = {
        descricao: newItem.descricao,
        unidade: newItem.unidade,
        precoUnitario: newItem.precoUnitario,
        tipo: newItem.tipo,
        quantidade: newItem.quantidade,
        quantidadeMinima: newItem.quantidadeMinima,
      };

      if (payload.tipo === 'servico') {
        delete payload.quantidade;
        delete payload.quantidadeMinima;
      }

      await addMaterial(user.uid, payload);
      setNewItem({ ...initialNewItemState, tipo: activeTab, unidade: activeTab === 'servico' ? 'serv' : 'un' });
      setPrecoUnitarioStr('');
      setQuantidadeStr('');
      setQuantidadeMinimaStr('');
      await fetchMateriais(); // Refresh list
      toast({
        title: "Sucesso!",
        description: `${activeTab === 'item' ? 'Item' : 'Serviço'} adicionado.`,
      });
    } catch (error) {
       toast({ title: `Erro ao adicionar ${activeTab === 'item' ? 'item' : 'serviço'}`, variant: 'destructive' });
    }
  };

  const performUpdate = async () => {
    if (!conflictingItem || !user) return;
    try {
      const { id, userId, ...materialToUpdate } = conflictingItem;

      // Se for um item, soma a quantidade. Se não, apenas atualiza.
      const newQuantity = (newItem.tipo === 'item' && materialToUpdate.quantidade != null && newItem.quantidade != null)
        ? materialToUpdate.quantidade + newItem.quantidade
        : newItem.quantidade;

      const updatedPayload: Partial<Omit<MaterialItem, 'id' | 'userId'>> = {
        unidade: newItem.unidade,
        precoUnitario: newItem.precoUnitario,
        // Só atualiza os campos de estoque se for um item
        ...(newItem.tipo === 'item' && {
          quantidade: newQuantity,
          quantidadeMinima: newItem.quantidadeMinima,
        })
      };

      await updateMaterial(id, updatedPayload);
      setNewItem({ ...initialNewItemState, tipo: activeTab, unidade: activeTab === 'servico' ? 'serv' : 'un' });
      setPrecoUnitarioStr('');
      setQuantidadeStr('');
      setQuantidadeMinimaStr('');
      await fetchMateriais();
      toast({
        title: "Sucesso!",
        description: "Item atualizado com sucesso.",
      });

    } catch (error) {
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    } finally {
      setConflictingItem(null);
    }
};


  const handleAdicionarMaterial = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    if (!newItem.descricao || newItem.precoUnitario === null || isNaN(newItem.precoUnitario)) {
        toast({
            title: "Campos Obrigatórios",
            description: "Por favor, preencha a Descrição e o Preço.",
            variant: "destructive"
        });
        return;
    }

    // Check for duplicates
    const normalizedNewDesc = normalizeString(newItem.descricao);
    const existingItem = materiais.find(m => normalizeString(m.descricao) === normalizedNewDesc && m.tipo === newItem.tipo);

    if (existingItem) {
      setConflictingItem(existingItem);
      setIsUpdateConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    await performAdd();
    setIsSubmitting(false);
  };
  
  const handleConfirmUpdate = async () => {
    setIsUpdateConfirmOpen(false);
    if (!conflictingItem) return;
    
    setIsSubmitting(true);
    await performUpdate();
    setIsSubmitting(false);
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
    setEditingPrecoUnitarioStr(maskCurrency(String(material.precoUnitario)));
    setEditingQuantidadeStr(material.quantidade !== null && material.quantidade !== undefined ? String(material.quantidade).replace('.', ',') : '');
    setEditingQuantidadeMinimaStr(material.quantidadeMinima !== null && material.quantidadeMinima !== undefined ? String(material.quantidadeMinima).replace('.', ',') : '');
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingMaterial) return;
    const { name, value } = e.target;
    setEditingMaterial(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleEditNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingMaterial) return;
    const { name, value } = e.target;
    
    if (name === 'precoUnitario') {
      const maskedValue = maskCurrency(value);
      setEditingPrecoUnitarioStr(maskedValue);
      const numericValue = parseFloat(maskedValue.replace(/\D/g, '')) / 100 || null;
      setEditingMaterial(prev => prev ? { ...prev, precoUnitario: numericValue } : null);
    } else {
        const maskedValue = maskDecimal(value);
        const numericValue = maskedValue === '' ? null : parseFloat(maskedValue.replace(',', '.'));
        if (name === 'quantidade') {
          setEditingQuantidadeStr(maskedValue);
          setEditingMaterial(prev => prev ? { ...prev, quantidade: numericValue } : null);
        } else if (name === 'quantidadeMinima') {
          setEditingQuantidadeMinimaStr(maskedValue);
          setEditingMaterial(prev => prev ? { ...prev, quantidadeMinima: numericValue } : null);
        }
    }
  };


  const handleEditUnitChange = (value: string) => {
    if (!editingMaterial) return;
    setEditingMaterial(prev => prev ? { ...prev, unidade: value } : null);
  };
  
  const handleSalvarEdicao = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterial.id) return;

    if(!editingMaterial.descricao || editingMaterial.precoUnitario === null || isNaN(editingMaterial.precoUnitario)) {
      toast({
          title: "Campos Obrigatórios",
          description: "Por favor, preencha Descrição e Preço.",
          variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
        const { id, userId, ...materialToUpdate } = editingMaterial;
        await updateMaterial(id, materialToUpdate);
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
  const itens = materiais.filter(m => m.tipo === 'item');
  const servicos = materiais.filter(m => m.tipo === 'servico');

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
          <Accordion type="single" collapsible className="w-full mb-6 border-b">
            <AccordionItem value="add-item-form" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-primary">
                    <PlusCircle className="h-5 w-5" /> Adicionar Novo Item/Serviço
                  </h2>
              </AccordionTrigger>
              <AccordionContent>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full pt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="item"><Package className="mr-2 h-4 w-4" /> Cadastrar Item</TabsTrigger>
                    <TabsTrigger value="servico"><Construction className="mr-2 h-4 w-4" /> Cadastrar Serviço</TabsTrigger>
                  </TabsList>
                  <form onSubmit={handleAdicionarMaterial}>
                    <TabsContent value="item" className="border-x border-b rounded-b-md p-6 mt-0">
                      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Novo Item (Produto)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                          <div className="lg:col-span-2">
                            <Label htmlFor="descricao-item">Descrição do Item</Label>
                            <Input id="descricao-item" name="descricao" value={newItem.descricao} onChange={handleNewItemChange} placeholder="Ex: Tomada dupla 10A" required/>
                          </div>
                          <div>
                            <Label htmlFor="unidade-item">Unidade de Medida</Label>
                            <Select name="unidade" value={newItem.unidade} onValueChange={handleUnitChange}>
                                <SelectTrigger id="unidade-item"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="precoUnitario-item">Preço (R$)</Label>
                            <Input id="precoUnitario-item" name="precoUnitario" type="text" inputMode='decimal' placeholder="R$ 12,50" value={precoUnitarioStr} onChange={handleNewItemNumberChange} required/>
                          </div>
                          <div>
                            <Label htmlFor="quantidade-item">Qtd. em Estoque</Label>
                            <Input id="quantidade-item" name="quantidade" type="text" inputMode='decimal' placeholder="Ex: 10" value={quantidadeStr} onChange={handleNewItemNumberChange} />
                          </div>
                          <div>
                            <Label htmlFor="quantidadeMinima-item">Estoque Mínimo</Label>
                            <Input id="quantidadeMinima-item" name="quantidadeMinima" type="text" inputMode='decimal' placeholder="Ex: 2" value={quantidadeMinimaStr} onChange={handleNewItemNumberChange} />
                          </div>
                          <div className="lg:col-span-4 mt-2">
                            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                              Adicionar Item
                            </Button>
                          </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="servico" className="border-x border-b rounded-b-md p-6 mt-0">
                      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Novo Serviço</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                          <div className="lg:col-span-2">
                              <Label htmlFor="descricao-servico">Descrição do Serviço</Label>
                              <Input id="descricao-servico" name="descricao" value={newItem.descricao} onChange={handleNewItemChange} placeholder="Ex: Instalação de ponto de luz" required/>
                          </div>
                          <div>
                            <Label htmlFor="unidade-servico">Unidade de Medida</Label>
                            <Select name="unidade" value={newItem.unidade} onValueChange={handleUnitChange}>
                                <SelectTrigger id="unidade-servico"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                          </div>
                          <div>
                              <Label htmlFor="precoUnitario-servico">Preço (R$)</Label>
                              <Input id="precoUnitario-servico" name="precoUnitario" type="text" inputMode='decimal' placeholder="R$ 150,00" value={precoUnitarioStr} onChange={handleNewItemNumberChange} required/>
                          </div>
                          <div className="lg:col-span-4 mt-2">
                            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                              Adicionar Serviço
                            </Button>
                          </div>
                      </div>
                    </TabsContent>
                  </form>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8">
            {showSkeleton ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-8 w-24" /></div>
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              </div>
            ) : materiais.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Itens e Serviços Cadastrados</h2>
                  <Button variant="ghost" size="sm" onClick={() => fetchMateriais()} disabled={isLoadingData}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                    <span className="ml-2">Atualizar</span>
                  </Button>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Preço Unit.</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materiais.map(item => {
                        const isStockLow = item.tipo === 'item' &&
                                          item.quantidade != null &&
                                          item.quantidadeMinima != null &&
                                          item.quantidade <= item.quantidadeMinima;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.descricao}</TableCell>
                            <TableCell className="capitalize">{item.tipo}</TableCell>
                            <TableCell className={cn(isStockLow && "text-destructive font-bold")}>
                              {item.tipo === 'item' ? `${formatNumber(item.quantidade, 2)} (Min: ${formatNumber(item.quantidadeMinima, 2)})` : 'N/A'}
                            </TableCell>
                            <TableCell>{item.unidade}</TableCell>
                            <TableCell>{formatCurrency(item.precoUnitario)}</TableCell>
                            <TableCell className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Isso excluirá permanentemente este item.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoverMaterial(item.id)}>
                                      Sim, Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden grid grid-cols-1 gap-4">
                  {materiais.map(item => {
                     const isStockLow = item.tipo === 'item' &&
                                          item.quantidade != null &&
                                          item.quantidadeMinima != null &&
                                          item.quantidade <= item.quantidadeMinima;
                    return (
                    <Card key={item.id} className="p-0">
                        <CardHeader className="flex flex-row items-start justify-between p-4">
                            <div>
                                <CardTitle className="text-base">{item.descricao}</CardTitle>
                                <CardDescription className="capitalize">{item.tipo}</CardDescription>
                            </div>
                            <div className="flex gap-1 -mr-2 -mt-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente este item.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRemoverMaterial(item.id)}>
                                        Sim, Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm">
                          {item.tipo === 'item' && item.quantidade != null && (
                            <p className={cn(isStockLow && "text-destructive font-bold")}><span className="font-medium text-muted-foreground">Estoque:</span> {formatNumber(item.quantidade, 2)} (Mín: {formatNumber(item.quantidadeMinima, 2)})</p>
                          )}
                        </CardContent>
                        <CardFooter className="p-4 pt-2 mt-2 bg-muted/50 flex justify-between items-center">
                            <p className="font-bold">Preço</p>
                            <p className="font-bold text-primary text-base">{formatCurrency(item.precoUnitario)} / {item.unidade}</p>
                        </CardFooter>
                    </Card>
                  )})}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum item ou serviço cadastrado ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {editingMaterial?.tipo === 'item' ? 'Item' : 'Serviço'}</DialogTitle>
            <DialogDescription>Faça as alterações necessárias.</DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4 py-4">
               <div>
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Input id="edit-descricao" name="descricao" value={editingMaterial.descricao} onChange={handleEditFormChange} required/>
                </div>
                <div>
                    <Label htmlFor="edit-unidade">Unidade de Medida</Label>
                    <Select name="unidade" value={editingMaterial.unidade} onValueChange={handleEditUnitChange}>
                        <SelectTrigger id="edit-unidade"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {editingMaterial.tipo === 'item' && (
                  <>
                  <div>
                    <Label htmlFor="edit-quantidade">Qtd. em Estoque</Label>
                    <Input id="edit-quantidade" name="quantidade" type="text" inputMode='decimal' value={editingQuantidadeStr} onChange={handleEditNumberChange} />
                  </div>
                  <div>
                    <Label htmlFor="edit-quantidadeMinima">Estoque Mínimo</Label>
                    <Input id="edit-quantidadeMinima" name="quantidadeMinima" type="text" inputMode='decimal' value={editingQuantidadeMinimaStr} onChange={handleEditNumberChange} />
                  </div>
                  </>
                )}
                <div>
                  <Label htmlFor="edit-precoUnitario">Preço (R$)</Label>
                  <Input id="edit-precoUnitario" name="precoUnitario" type="text" inputMode='decimal' value={editingPrecoUnitarioStr} onChange={handleEditNumberChange} required/>
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
      
      <AlertDialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Item Duplicado Encontrado</AlertDialogTitle>
               <AlertDialogDescription>
                Este {conflictingItem?.tipo} já existe. Deseja somar a nova quantidade ao estoque e usar este novo preço?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConflictingItem(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmUpdate}>Sim, Adicionar e Atualizar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    

      

    

    
