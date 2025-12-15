
'use client';

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import type { OrcamentoItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskDecimal, maskInteger, maskCurrency, maskDecimalWithAutoComma } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditItemModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    item: OrcamentoItem;
    onSave: (item: OrcamentoItem) => void;
}

const integerUnits = ['un', 'h', 'serv'];

export function EditItemModal({ isOpen, onOpenChange, item, onSave }: EditItemModalProps) {
    const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
    const [editingQuantidadeStr, setEditingQuantidadeStr] = useState('');
    const [editingMargemLucroStr, setEditingMargemLucroStr] = useState('');
    const [editingPrecoUnitarioStr, setEditingPrecoUnitarioStr] = useState('');
    const [isPriceUnlocked, setIsPriceUnlocked] = useState(false);

    const isCurrentUnitInteger = useMemo(() => {
        return editingItem ? integerUnits.includes(editingItem.unidade) : false;
    }, [editingItem]);

    const isAvulso = useMemo(() => editingItem?.materialId?.startsWith('avulso-'), [editingItem]);
    
    useEffect(() => {
        if (item) {
            setEditingItem({ ...item });
            const isInteger = integerUnits.includes(item.unidade);
            setEditingQuantidadeStr(isInteger ? String(item.quantidade) : String(item.quantidade).replace('.', ','));
            
            const margem = item.margemLucro;
            setEditingMargemLucroStr(margem > 0 ? String(margem).replace('.', ',') : '');

            const priceAsNumber = Number(item.precoUnitario) || 0;
            const priceString = String(priceAsNumber.toFixed(2)).replace('.', ',');
            setEditingPrecoUnitarioStr(maskCurrency(priceString));
            
            setIsPriceUnlocked(!!item.materialId && item.materialId.startsWith('avulso-'));
        }
    }, [item]);

    const handleEditItemFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingItem) return;
        const { name, value } = e.target;
        
        let newItemState = { ...editingItem };
        let newQuantidadeStr = editingQuantidadeStr;
        let newMargemStr = editingMargemLucroStr;
        let newPrecoUnitarioStr = editingPrecoUnitarioStr;
        
        if (name === 'materialNome') {
            newItemState.materialNome = value;
        } else if (name === 'quantidade') {
            const mask = isCurrentUnitInteger ? maskInteger : maskDecimalWithAutoComma;
            newQuantidadeStr = mask(value);
        } else if (name === 'margemLucro') { 
            newMargemStr = maskDecimal(value);
        } else if (name === 'precoUnitario') {
            newPrecoUnitarioStr = maskCurrency(value);
        }

        const numQuantidade = parseFloat(newQuantidadeStr.replace(',', '.')) || 0;
        const numMargemLucro = parseFloat(newMargemStr.replace(',', '.')) || 0;
        const numPrecoUnitario = (parseFloat(newPrecoUnitarioStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0);

        newItemState.quantidade = numQuantidade;
        newItemState.margemLucro = numMargemLucro;
        newItemState.precoUnitario = numPrecoUnitario;
        newItemState.total = numPrecoUnitario * numQuantidade;
        newItemState.precoVenda = newItemState.total * (1 + numMargemLucro / 100);

        setEditingItem(newItemState);
        setEditingQuantidadeStr(newQuantidadeStr);
        setEditingMargemLucroStr(newMargemStr);
        setEditingPrecoUnitarioStr(newPrecoUnitarioStr);
    };
    
    const handleSalvarEdicaoItem = (e: FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
    
        const numQuantidade = parseFloat(editingQuantidadeStr.replace(',', '.'));
        if (isNaN(numQuantidade) || numQuantidade <= 0) {
            alert('Quantidade inválida');
            return;
        }
        
        onSave(editingItem);
    };

    if (!editingItem) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                onPointerDownOutside={(e) => {
                    if (Capacitor.isNativePlatform()) e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Editar Item do Orçamento</DialogTitle>
                    <DialogDescription>Modifique os detalhes do item selecionado.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvarEdicaoItem} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="edit-nome">Nome do Item</Label>
                        <Input id="edit-nome" name="materialNome" value={editingItem.materialNome} onChange={handleEditItemFormChange}/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-quantidade">Quantidade ({editingItem.unidade})</Label>
                            <Input id="edit-quantidade" name="quantidade" type="text" inputMode={isCurrentUnitInteger ? 'numeric' : 'decimal'} value={editingQuantidadeStr} onChange={handleEditItemFormChange}/>
                        </div>
                        <div>
                             <Label htmlFor="edit-margemLucro">Acréscimo (%)</Label>
                             <Input id="edit-margemLucro" name="margemLucro" type="text" inputMode='decimal' value={editingMargemLucroStr} onChange={handleEditItemFormChange}/>
                        </div>
                    </div>

                     <div>
                        <Label htmlFor="edit-precoUnitario">Preço de Custo Unitário (R$)</Label>
                        <div className="relative">
                            <Input 
                                id="edit-precoUnitario" 
                                name="precoUnitario" 
                                type="text" 
                                inputMode='decimal' 
                                value={editingPrecoUnitarioStr} 
                                onChange={handleEditItemFormChange}
                                disabled={!isPriceUnlocked}
                                className={cn(!isPriceUnlocked && "pr-10")}
                            />
                             {!isAvulso && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                                    onClick={() => setIsPriceUnlocked(!isPriceUnlocked)}
                                >
                                    {isPriceUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>
                        {!isAvulso && !isPriceUnlocked && (
                            <p className="text-xs text-muted-foreground mt-1">Preço do catálogo. Clique no cadeado para editar.</p>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
