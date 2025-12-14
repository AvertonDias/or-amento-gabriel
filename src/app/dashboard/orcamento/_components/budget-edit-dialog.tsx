
'use client';

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import type { Orcamento, OrcamentoItem, MaterialItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableTotalFooter } from '@/components/ui/table';
import { Loader2, CheckCircle2, PlusCircle, Trash2, Pencil, ArrowRightLeft } from 'lucide-react';
import { formatCurrency, formatNumber, maskCurrency, maskDecimal } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { EditItemModal } from './edit-item-modal';

const unidadesDeMedida = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'serv', label: 'Serviço (serv)' },
];

interface BudgetEditDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    budget: Orcamento;
    materiais: MaterialItem[];
    onUpdateBudget: (budget: Orcamento) => void;
}

export function BudgetEditDialog({ isOpen, onOpenChange, budget, materiais, onUpdateBudget }: BudgetEditDialogProps) {
    const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
    const [editingBudgetItens, setEditingBudgetItens] = useState<OrcamentoItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [newItemForEdit, setNewItemForEdit] = useState({ materialId: '', quantidade: '', margemLucro: '' });
    const [newItemQtyStr, setNewItemQtyStr] = useState('');
    const [newItemMarginStr, setNewItemMarginStr] = useState('');

    const [isAddingAvulsoInEdit, setIsAddingAvulsoInEdit] = useState(false);
    const [itemAvulsoInEdit, setItemAvulsoInEdit] = useState({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
    const [itemAvulsoInEditPrecoStr, setItemAvulsoInEditPrecoStr] = useState('');

    const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
    const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        if (budget) {
            setEditingBudget({ ...budget });
            setEditingBudgetItens([...budget.itens]);
        }
    }, [budget]);

    const selectedMaterialForEdit = useMemo(() => {
        return materiais.find(m => m.id === newItemForEdit.materialId);
    }, [materiais, newItemForEdit.materialId]);

    const handleNewItemForEditChange = (field: keyof typeof newItemForEdit, value: string) => {
        if (field === 'quantidade') {
            const masked = maskDecimal(value);
            setNewItemQtyStr(masked);
            setNewItemForEdit(prev => ({ ...prev, [field]: masked.replace(',', '.') }));
        } else if (field === 'margemLucro') {
            const masked = maskDecimal(value);
            setNewItemMarginStr(masked);
            setNewItemForEdit(prev => ({ ...prev, [field]: masked.replace(',', '.') }));
        } else {
            setNewItemForEdit(prev => ({ ...prev, [field]: value }));
        }
    };
    
    const handleAddItemToEditBudget = () => {
        if (!selectedMaterialForEdit) {
          toast({ title: 'Seleção necessária', description: 'Por favor, selecione um item ou serviço.', variant: 'destructive' });
          return;
        }
        const { precoUnitario, id: materialId, descricao, unidade } = selectedMaterialForEdit;
        const numMargemLucro = parseFloat(newItemForEdit.margemLucro.replace(',', '.')) || 0;
        const numQuantidade = parseFloat(newItemForEdit.quantidade.replace(/[^0-9,]/g, '').replace(',', '.'));
    
        if (isNaN(numQuantidade) || numQuantidade <= 0 || precoUnitario === null) {
          toast({ title: 'Valores inválidos', description: 'Preencha a Quantidade corretamente.', variant: 'destructive' });
          return;
        }
    
        const custoFinal = precoUnitario * numQuantidade;
        const precoVenda = custoFinal * (1 + numMargemLucro / 100);
        
        const novoOrcamentoItem: OrcamentoItem = { 
          id: crypto.randomUUID(), materialId, materialNome: descricao, unidade,
          quantidade: numQuantidade, precoUnitario, total: custoFinal, 
          margemLucro: numMargemLucro, precoVenda,
        };
        
        setEditingBudgetItens(prev => [...prev, novoOrcamentoItem]);
        
        setNewItemForEdit({ materialId: '', quantidade: '', margemLucro: '' });
        setNewItemQtyStr('');
        setNewItemMarginStr('');
    };

    const handleAddItemAvulsoToEditBudget = () => {
        const { descricao, quantidade, unidade } = itemAvulsoInEdit;
        const numQuantidade = parseFloat(quantidade.replace(',', '.')) || 1;
        const numPrecoFinal = parseFloat(itemAvulsoInEditPrecoStr.replace(/\D/g, '')) / 100;
    
        if (!descricao.trim()) { toast({ title: "Descrição obrigatória", variant: "destructive" }); return; }
        if (isNaN(numQuantidade) || numQuantidade <= 0) { toast({ title: "Quantidade inválida", variant: "destructive" }); return; }
        if (isNaN(numPrecoFinal) || numPrecoFinal <= 0) { toast({ title: "Preço inválido", variant: "destructive" }); return; }
    
        const novoOrcamentoItem: OrcamentoItem = {
          id: crypto.randomUUID(), materialId: 'avulso-' + crypto.randomUUID(),
          materialNome: descricao, unidade: unidade || 'un',
          quantidade: numQuantidade, precoUnitario: numPrecoFinal / numQuantidade,
          total: numPrecoFinal, margemLucro: 0, precoVenda: numPrecoFinal,
        };
    
        setEditingBudgetItens(prev => [...prev, novoOrcamentoItem]);
    
        setItemAvulsoInEdit({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
        setItemAvulsoInEditPrecoStr('');
        setIsAddingAvulsoInEdit(false);
    };

    const handleRemoveItemFromEditBudget = (itemId: string) => {
        setEditingBudgetItens(prev => prev.filter(item => item.id !== itemId));
    };

    const handleEditItemClick = (item: OrcamentoItem) => {
        setEditingItem({ ...item });
        setIsEditItemModalOpen(true);
    };

    const handleSaveItemEdit = (itemAtualizado: OrcamentoItem) => {
        setEditingBudgetItens(prev => prev.map(item => item.id === itemAtualizado.id ? itemAtualizado : item));
        setIsEditItemModalOpen(false);
        setEditingItem(null);
        toast({ title: 'Item atualizado.' });
    };

    const handleUpdateBudget = async () => {
        if (!editingBudget) return;
        setIsSubmitting(true);
        const totalVendaFinal = editingBudgetItens.reduce((acc, item) => acc + item.precoVenda, 0);
        const budgetToUpdate: Orcamento = {
            ...editingBudget,
            itens: editingBudgetItens,
            totalVenda: totalVendaFinal,
        };
        await onUpdateBudget(budgetToUpdate);
        setIsSubmitting(false);
    };

    if (!editingBudget) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent 
                    className="max-w-4xl max-h-[90vh] flex flex-col"
                    onPointerDownOutside={(e) => {
                        if (Capacitor.isNativePlatform()) e.preventDefault();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Editar Orçamento #{editingBudget.numeroOrcamento}</DialogTitle>
                        <DialogDescription>
                        Ajuste os dados do cliente e os itens do orçamento. O status não pode ser alterado aqui.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto p-1 pr-4">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Dados do Cliente</h3>
                            <div className="space-y-2">
                                <Label htmlFor="edit-cliente-nome">Nome</Label>
                                <Input id="edit-cliente-nome" name="nome" value={editingBudget.cliente.nome} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-cliente-endereco">Endereço</Label>
                                <Input 
                                    id="edit-cliente-endereco" 
                                    name="endereco" 
                                    value={editingBudget.cliente.endereco} 
                                    onChange={(e) => setEditingBudget(prev => prev ? {...prev, cliente: {...prev.cliente, endereco: e.target.value}} : null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-validade-dias">Validade da Proposta (dias)</Label>
                                <Input id="edit-validade-dias" type="number" value={editingBudget.validadeDias} onChange={(e) => setEditingBudget(prev => prev ? {...prev, validadeDias: e.target.value} : null)} placeholder="Ex: 7" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Itens do Orçamento</h3>
                            
                            <div className="p-2 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">{isAddingAvulsoInEdit ? 'Novo Item Avulso' : 'Novo Item da Lista'}</Label>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsAddingAvulsoInEdit(!isAddingAvulsoInEdit)}>
                                    <ArrowRightLeft className="h-4 w-4" />
                                    </Button>
                                </div>
                                {isAddingAvulsoInEdit ? (
                                    <div className="grid grid-cols-2 gap-2 items-end">
                                        <div className="col-span-2"><Label htmlFor="edit-avulso-desc" className="text-xs">Descrição</Label><Input id="edit-avulso-desc" className="h-8" value={itemAvulsoInEdit.descricao} onChange={e => setItemAvulsoInEdit(p => ({...p, descricao: e.target.value}))} /></div>
                                        <div><Label htmlFor="edit-avulso-qtd" className="text-xs">Qtd</Label><Input id="edit-avulso-qtd" className="h-8" value={itemAvulsoInEdit.quantidade} onChange={e => setItemAvulsoInEdit(p => ({...p, quantidade: maskDecimal(e.target.value)}))} placeholder="1" /></div>
                                        <div>
                                            <Label htmlFor="edit-avulso-un" className="text-xs">Unidade</Label>
                                            <Select value={itemAvulsoInEdit.unidade} onValueChange={(value) => setItemAvulsoInEdit(p => ({...p, unidade: value}))}>
                                            <SelectTrigger id="edit-avulso-un" className="h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                            </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Label htmlFor="edit-avulso-preco" className="text-xs">Preço Final (R$)</Label>
                                            <Input id="edit-avulso-preco" className="h-8" value={itemAvulsoInEditPrecoStr} onChange={e => setItemAvulsoInEditPrecoStr(maskCurrency(e.target.value))} placeholder="R$ 50,00" />
                                        </div>
                                        <div className="col-span-2"><Button onClick={handleAddItemAvulsoToEditBudget} size="sm" className="w-full h-8"><PlusCircle className="mr-1 h-4 w-4" />Add Avulso</Button></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                                    <div className="col-span-2 lg:col-span-2">
                                        <Label htmlFor="edit-material-select" className="text-xs">Novo Item</Label>
                                        <Select value={newItemForEdit.materialId} onValueChange={(val) => handleNewItemForEditChange('materialId', val)}>
                                        <SelectTrigger id="edit-material-select" className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {materiais.map(mat => (<SelectItem key={mat.id} value={mat.id}>{`${mat.descricao} (${formatCurrency(mat.precoUnitario)}/${mat.unidade})`}</SelectItem>))}
                                        </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedMaterialForEdit && (
                                        <>
                                        <div><Label htmlFor="edit-quantidade-novo" className="text-xs">Qtd</Label><Input id="edit-quantidade-novo" className="h-8" type="text" inputMode='decimal' value={newItemQtyStr} onChange={e => handleNewItemForEditChange('quantidade', e.target.value)} /></div>
                                        <div><Label htmlFor="edit-margem-novo" className="text-xs">Acr.(%)</Label><Input id="edit-margem-novo" className="h-8" type="text" inputMode='decimal' value={newItemMarginStr} onChange={e => handleNewItemForEditChange('margemLucro', e.target.value)} /></div>
                                        <div><Button onClick={handleAddItemToEditBudget} size="sm" className="w-full h-8"><PlusCircle className="mr-1 h-4 w-4" />Add</Button></div>
                                        </>
                                    )}
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Venda</TableHead><TableHead className="w-[80px] text-center">Ações</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                    {editingBudgetItens.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="py-2">
                                                <p className="font-medium">{item.materialNome}</p>
                                                <p className="text-xs text-muted-foreground">{formatNumber(item.quantidade, 2)} {item.unidade} x {formatCurrency(item.precoUnitario)} + {formatNumber(item.margemLucro)}%</p>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary py-2">{formatCurrency(item.precoVenda)}</TableCell>
                                            <TableCell className="flex justify-center gap-1 py-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItemClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItemFromEditBudget(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                    <TableTotalFooter>
                                        <TableRow className="bg-muted/50 font-bold text-base">
                                            <TableCell>TOTAL</TableCell>
                                            <TableCell className="text-right text-primary">{formatCurrency(editingBudgetItens.reduce((acc, item) => acc + item.precoVenda, 0))}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableTotalFooter>
                                </Table>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-4 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleUpdateBudget} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <CheckCircle2 className="mr-2"/>} Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {editingItem && (
                <EditItemModal
                    isOpen={isEditItemModalOpen}
                    onOpenChange={setIsEditItemModalOpen}
                    item={editingItem}
                    onSave={handleSaveItemEdit}
                />
            )}
        </>
    );
}


    

    