
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import type { OrcamentoItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskDecimal } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface EditItemModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    item: OrcamentoItem;
    onSave: (item: OrcamentoItem) => void;
}

export function EditItemModal({ isOpen, onOpenChange, item, onSave }: EditItemModalProps) {
    const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
    const [editingQuantidadeStr, setEditingQuantidadeStr] = useState('');
    const [editingMargemLucroStr, setEditingMargemLucroStr] = useState('');

    useEffect(() => {
        if (item) {
            setEditingItem({ ...item });
            setEditingQuantidadeStr(String(item.quantidade).replace('.', ','));
            setEditingMargemLucroStr(String(item.margemLucro).replace('.', ','));
        }
    }, [item]);

    const handleEditItemFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingItem) return;
        const { name, value } = e.target;
        
        if (name === 'quantidade') { 
            setEditingQuantidadeStr(maskDecimal(value));
        } else if (name === 'margemLucro') { 
            setEditingMargemLucroStr(maskDecimal(value));
        } else if (name === 'materialNome') {
           setEditingItem(prev => prev ? { ...prev, materialNome: value } : null);
        }
    };
    
    const handleSalvarEdicaoItem = (e: FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
    
        const numQuantidade = parseFloat(editingQuantidadeStr.replace(',', '.'));
        const numMargemLucro = parseFloat(editingMargemLucroStr.replace(',', '.')) || 0;
        if (isNaN(numQuantidade) || numQuantidade <= 0) {
            // Idealmente, usar um toast aqui se o hook estiver disponível
            alert('Quantidade inválida');
            return;
        }
    
        const custoFinal = editingItem.precoUnitario * numQuantidade;
        const precoVendaCalculado = custoFinal * (1 + numMargemLucro / 100);
        
        const itemAtualizado: OrcamentoItem = { 
            ...editingItem,
            materialNome: editingItem.materialNome,
            quantidade: numQuantidade, 
            margemLucro: numMargemLucro,
            total: custoFinal, 
            precoVenda: precoVendaCalculado 
        };
        
        onSave(itemAtualizado);
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
                    <DialogDescription>Modifique o nome, a quantidade e o acréscimo do item selecionado.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvarEdicaoItem} className="space-y-4 py-4">
                    <div><Label htmlFor="edit-nome">Nome do Item</Label><Input id="edit-nome" name="materialNome" value={editingItem.materialNome} onChange={handleEditItemFormChange}/></div>
                    <div><Label htmlFor="edit-quantidade">Quantidade ({editingItem.unidade})</Label><Input id="edit-quantidade" name="quantidade" type="text" inputMode='decimal' value={editingQuantidadeStr} onChange={handleEditItemFormChange}/></div>
                    <div><Label htmlFor="edit-margemLucro">Acréscimo (%)</Label><Input id="edit-margemLucro" name="margemLucro" type="text" inputMode='decimal' value={editingMargemLucroStr} onChange={handleEditItemFormChange}/></div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


    