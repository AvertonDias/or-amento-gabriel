'use client';

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import type { OrcamentoItem } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  maskDecimal,
  maskInteger,
  maskCurrency,
  maskDecimalWithAutoComma,
} from '@/lib/utils';

import { Capacitor } from '@capacitor/core';
import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

/* =========================
   TIPOS
========================= */

interface EditItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: OrcamentoItem;
  onSave: (item: OrcamentoItem) => void;
}

const integerUnits = ['un', 'h', 'serv'];

/* =========================
   COMPONENTE
========================= */

export function EditItemModal({
  isOpen,
  onOpenChange,
  item,
  onSave,
}: EditItemModalProps) {

  const [editingItem, setEditingItem] = useState<OrcamentoItem>(item);

  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [margemLucroStr, setMargemLucroStr] = useState('');
  const [precoUnitarioStr, setPrecoUnitarioStr] = useState('');

  const isAvulso = useMemo(
    () => item.materialId?.startsWith('avulso-'),
    [item.materialId]
  );

  const isCurrentUnitInteger = useMemo(
    () => integerUnits.includes(editingItem.unidade),
    [editingItem.unidade]
  );

  const [isPriceUnlocked, setIsPriceUnlocked] = useState(isAvulso);

  /* =========================
     SINCRONIZA ITEM AO ABRIR
  ========================= */

  useEffect(() => {
    if (!item) return;

    setEditingItem({ ...item });

    setQuantidadeStr(
      isCurrentUnitInteger
        ? String(item.quantidade)
        : String(item.quantidade).replace('.', ',')
    );

    setMargemLucroStr(
      item.margemLucro > 0
        ? String(item.margemLucro).replace('.', ',')
        : ''
    );

    setPrecoUnitarioStr(
      maskCurrency(item.precoUnitario.toFixed(2))
    );

    setIsPriceUnlocked(item.materialId.startsWith('avulso-'));
  }, [item, isCurrentUnitInteger]);

  /* =========================
     HANDLER DE ALTERAÇÃO
  ========================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    let newQuantidadeStr = quantidadeStr;
    let newMargemStr = margemLucroStr;
    let newPrecoStr = precoUnitarioStr;
    let newItem = { ...editingItem };

    if (name === 'materialNome') {
      newItem.materialNome = value;
    }

    if (name === 'quantidade') {
      newQuantidadeStr = isCurrentUnitInteger
        ? maskInteger(value)
        : maskDecimalWithAutoComma(value);
    }

    if (name === 'margemLucro') {
      newMargemStr = maskDecimal(value);
    }

    if (name === 'precoUnitario') {
      newPrecoStr = maskCurrency(value);
    }

    const quantidade = parseFloat(newQuantidadeStr.replace(',', '.')) || 0;
    const margem = parseFloat(newMargemStr.replace(',', '.')) || 0;
    const precoUnitario =
      parseFloat(newPrecoStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    newItem.quantidade = quantidade;
    newItem.margemLucro = margem;
    newItem.precoUnitario = precoUnitario;
    newItem.total = precoUnitario * quantidade;
    newItem.precoVenda = newItem.total * (1 + margem / 100);

    setEditingItem(newItem);
    setQuantidadeStr(newQuantidadeStr);
    setMargemLucroStr(newMargemStr);
    setPrecoUnitarioStr(newPrecoStr);
  };

  /* =========================
     SALVAR
  ========================= */

  const handleSave = (e: FormEvent) => {
    e.preventDefault();

    if (editingItem.quantidade <= 0) {
      alert('Quantidade inválida');
      return;
    }

    onSave(editingItem);
  };

  if (!editingItem) return null;

  /* =========================
     RENDER
  ========================= */

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => {
          if (Capacitor.isNativePlatform()) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Editar Item do Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-4">

          <div>
            <Label>Nome do Item</Label>
            <Input
              name="materialNome"
              value={editingItem.materialNome}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade ({editingItem.unidade})</Label>
              <Input
                name="quantidade"
                inputMode={isCurrentUnitInteger ? 'numeric' : 'decimal'}
                value={quantidadeStr}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Acréscimo (%)</Label>
              <Input
                name="margemLucro"
                inputMode="decimal"
                value={margemLucroStr}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <Label>Preço de Custo Unitário (R$)</Label>
            <div className="relative">
              <Input
                name="precoUnitario"
                value={precoUnitarioStr}
                onChange={handleChange}
                disabled={!isPriceUnlocked}
                className={cn(!isPriceUnlocked && 'pr-10')}
              />

              {!isAvulso && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setIsPriceUnlocked(v => !v)}
                >
                  {isPriceUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                </Button>
              )}
            </div>

            {!isAvulso && !isPriceUnlocked && (
              <p className="text-xs text-muted-foreground mt-1">
                Preço do catálogo. Clique no cadeado para editar.
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Salvar</Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
