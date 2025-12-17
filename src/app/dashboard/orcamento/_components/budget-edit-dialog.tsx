
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Orcamento, OrcamentoItem, MaterialItem } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Pencil,
  ArrowRightLeft,
  RotateCcw,
  Lock,
  Unlock,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  maskCurrency,
  maskDecimal,
  maskInteger,
  maskTelefone,
} from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { EditItemModal } from './edit-item-modal';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/* ===========================
   Helpers
=========================== */
const generateId = () =>
  crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const unidadesDeMedida = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'serv', label: 'Serviço (serv)' },
];

const integerUnits = ['un', 'h', 'serv'];

interface BudgetEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Orcamento;
  materiais: MaterialItem[];
  onUpdateBudget: (budget: Orcamento) => Promise<void>;
}

export function BudgetEditDialog({
  isOpen,
  onOpenChange,
  budget,
  materiais,
  onUpdateBudget,
}: BudgetEditDialogProps) {
  const { toast } = useToast();
  const quantidadeInputRef = useRef<HTMLInputElement>(null);

  const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
  const [editingBudgetItens, setEditingBudgetItens] = useState<OrcamentoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for adding new item
  const [newItem, setNewItem] = useState({
    materialId: '',
    quantidade: '',
    margemLucro: '',
  });
  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [margemLucroStr, setMargemLucroStr] = useState('');
  const [isAddingAvulso, setIsAddingAvulso] = useState(false);
  const [itemAvulso, setItemAvulso] = useState({
    descricao: '',
    unidade: 'un',
    quantidade: '',
    precoFinal: '',
  });
  const [itemAvulsoPrecoStr, setItemAvulsoPrecoStr] = useState('');
  const [isMaterialPopoverOpen, setIsMaterialPopoverOpen] = useState(false);

  const [itemToEdit, setItemToEdit] = useState<OrcamentoItem | null>(null);

  const [isTotalLocked, setIsTotalLocked] = useState(true);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [manualTotalStr, setManualTotalStr] = useState('');

  /* ===========================
     Effects
  =========================== */
  useEffect(() => {
    if (!budget) return;

    setEditingBudget({ ...budget });
    setEditingBudgetItens([...budget.itens]);

    const calculated = budget.itens.reduce((s, i) => s + i.precoVenda, 0);

    if (Math.abs(calculated - budget.totalVenda) > 0.01) {
      setManualTotal(budget.totalVenda);
      setManualTotalStr(formatCurrency(budget.totalVenda, false));
      setIsTotalLocked(false);
    } else {
      setManualTotal(null);
      setManualTotalStr('');
      setIsTotalLocked(true);
    }
  }, [budget]);

  /* ===========================
     Memos
  =========================== */
  const selectedMaterial = useMemo(
    () => materiais.find(m => m.id === newItem.materialId),
    [materiais, newItem.materialId]
  );

  const isCurrentUnitInteger = useMemo(() => {
    if (isAddingAvulso) return integerUnits.includes(itemAvulso.unidade);
    return selectedMaterial
      ? integerUnits.includes(selectedMaterial.unidade)
      : false;
  }, [isAddingAvulso, itemAvulso.unidade, selectedMaterial]);

  const calculatedTotal = useMemo(
    () => editingBudgetItens.reduce((s, i) => s + i.precoVenda, 0),
    [editingBudgetItens]
  );

  const finalTotal = manualTotal ?? calculatedTotal;
  const isTotalEdited = manualTotal !== null;

  const adjustmentPercentage = useMemo(() => {
    if (!isTotalEdited || calculatedTotal === 0) return 0;
    return ((finalTotal - calculatedTotal) / calculatedTotal) * 100;
  }, [isTotalEdited, finalTotal, calculatedTotal]);

  /* ===========================
     Handlers
  =========================== */

  const handleClienteTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingBudget) return;

    const masked = maskTelefone(e.target.value);

    setEditingBudget(prev => {
      if (!prev) return null;
      const telefones = prev.cliente.telefones?.length
        ? [...prev.cliente.telefones]
        : [{ nome: 'Principal', numero: '' }];

      telefones[0] = { ...telefones[0], numero: masked };

      return {
        ...prev,
        cliente: { ...prev.cliente, telefones },
      };
    });
  };

  const handleManualTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrency(e.target.value);
    setManualTotalStr(masked.replace('R$ ', ''));

    const numeric = parseFloat(masked.replace(/[^\d,]/g, '').replace(',', '.'));
    setManualTotal(Number.isFinite(numeric) ? numeric : null);
  };

  const resetManualTotal = () => {
    setManualTotal(null);
    setManualTotalStr('');
    setIsTotalLocked(true);
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget) return;

    try {
      setIsSubmitting(true);

      await onUpdateBudget({
        ...editingBudget,
        itens: editingBudgetItens,
        totalVenda: finalTotal,
      });

      onOpenChange(false);
    } catch {
      toast({
        title: 'Erro ao salvar orçamento',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = () => {
    const quantidade = parseFloat(quantidadeStr.replace(',', '.'));
    if (!selectedMaterial || !quantidade || quantidade <= 0) {
      toast({ title: "Dados inválidos", description: "Selecione um item e informe a quantidade.", variant: "destructive" });
      return;
    }

    const total = selectedMaterial.precoUnitario! * quantidade;
    const margem = parseFloat(margemLucroStr.replace(',', '.')) || 0;
    const precoVenda = total * (1 + margem / 100);

    const orcamentoItem: OrcamentoItem = {
      id: generateId(),
      materialId: selectedMaterial.id,
      materialNome: selectedMaterial.descricao,
      unidade: selectedMaterial.unidade,
      quantidade,
      precoUnitario: selectedMaterial.precoUnitario!,
      total,
      margemLucro: margem,
      precoVenda,
    };

    setEditingBudgetItens([...editingBudgetItens, orcamentoItem]);
    setNewItem({ materialId: '', quantidade: '', margemLucro: '' });
    setQuantidadeStr('');
    setMargemLucroStr('');
  };

  const handleAddAvulso = () => {
    const quantidade = parseFloat(itemAvulso.quantidade.replace(',', '.'));
    const precoVenda = parseFloat(itemAvulsoPrecoStr.replace(/[^\d,]/g, '').replace(',', '.'));

    if (!itemAvulso.descricao || !quantidade || quantidade <= 0 || !precoVenda || precoVenda <= 0) {
      toast({ title: "Dados inválidos", description: "Preencha todos os campos do item avulso.", variant: "destructive" });
      return;
    }

    const precoUnitario = precoVenda / quantidade;

    const orcamentoItem: OrcamentoItem = {
      id: generateId(),
      materialId: `avulso-${generateId()}`,
      materialNome: itemAvulso.descricao,
      unidade: itemAvulso.unidade,
      quantidade,
      precoUnitario,
      total: precoVenda,
      margemLucro: 0,
      precoVenda,
    };

    setEditingBudgetItens([...editingBudgetItens, orcamentoItem]);
    setItemAvulso({ descricao: '', unidade: 'un', quantidade: '', precoFinal: '' });
    setItemAvulsoPrecoStr('');
    setIsAddingAvulso(false);
  };


  if (!editingBudget) return null;

  /* ===========================
     JSX
  =========================== */
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0"
          onPointerDownOutside={e => {
            if (Capacitor.isNativePlatform()) e.preventDefault();
          }}
        >
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Editar Orçamento Nº {editingBudget.numeroOrcamento}</DialogTitle>
            <DialogDescription>
              Ajuste as informações do cliente, itens e valores do orçamento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 px-6">
            <Card>
              <CardContent className="p-4 grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input value={editingBudget.cliente.nome} onChange={(e) => setEditingBudget({...editingBudget, cliente: {...editingBudget.cliente, nome: e.target.value}})}/>
                </div>
                 <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editingBudget.cliente.telefones?.[0]?.numero ?? ''} onChange={handleClienteTelefoneChange} />
                </div>
              </CardContent>
            </Card>

            {/* Adicionar Itens */}
            <div className="border p-4 rounded-md space-y-4">
              <h3 className="font-semibold">Adicionar Novo Item</h3>
              <RadioGroup value={isAddingAvulso ? 'avulso' : 'catalogo'} onValueChange={v => setIsAddingAvulso(v === 'avulso')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="catalogo" id="r-edit-catalogo" />
                  <Label htmlFor="r-edit-catalogo">Item do Catálogo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avulso" id="r-edit-avulso" />
                  <Label htmlFor="r-edit-avulso">Item Avulso</Label>
                </div>
              </RadioGroup>

              {isAddingAvulso ? (
                <div className="space-y-2">
                  <Input placeholder="Descrição do item" value={itemAvulso.descricao} onChange={e => setItemAvulso({ ...itemAvulso, descricao: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={itemAvulso.unidade} onValueChange={v => setItemAvulso({ ...itemAvulso, unidade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Qtd" 
                      value={itemAvulso.quantidade} 
                      onChange={e => setItemAvulso({ ...itemAvulso, quantidade: isCurrentUnitInteger ? maskInteger(e.target.value) : maskDecimal(e.target.value) })}
                    />
                    <Input placeholder="Preço Final" value={itemAvulsoPrecoStr} onChange={e => setItemAvulsoPrecoStr(maskCurrency(e.target.value))} />
                  </div>
                  <Button onClick={handleAddAvulso} className="w-full">Adicionar Item Avulso</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Popover open={isMaterialPopoverOpen} onOpenChange={setIsMaterialPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isMaterialPopoverOpen} className="w-full justify-between">
                        {selectedMaterial?.descricao || "Selecione um item..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar item..." />
                        <CommandList>
                          <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                          <CommandGroup>
                            {materiais.map(m => (
                              <CommandItem key={m.id} value={m.descricao} onSelect={() => {
                                setNewItem({ ...newItem, materialId: m.id });
                                setIsMaterialPopoverOpen(false);
                                setTimeout(() => quantidadeInputRef.current?.focus(), 100);
                              }}>
                                <Check className={cn("mr-2 h-4 w-4", newItem.materialId === m.id ? "opacity-100" : "opacity-0")} />
                                {m.descricao} ({formatCurrency(m.precoUnitario)}/{m.unidade})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      ref={quantidadeInputRef}
                      placeholder={`Qtd (${selectedMaterial?.unidade || 'un'})`}
                      value={quantidadeStr}
                      onChange={(e) => setQuantidadeStr(isCurrentUnitInteger ? maskInteger(e.target.value) : maskDecimal(e.target.value))}
                    />
                    <Input placeholder="Acréscimo % (Opcional)" value={margemLucroStr} onChange={e => setMargemLucroStr(maskDecimal(e.target.value))} />
                  </div>
                  <Button onClick={handleAddItem} className="w-full" disabled={!selectedMaterial}>Adicionar ao Orçamento</Button>
                </div>
              )}
            </div>
            
            {/* Mobile Item List */}
            <div className="sm:hidden space-y-3">
              {editingBudgetItens.length > 0 && <h3 className="font-semibold">Itens do Orçamento</h3>}
              {editingBudgetItens.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="font-semibold">{item.materialNome}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(item.quantidade, 2)} {item.unidade} x {formatCurrency(item.precoUnitario)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <p className="font-bold text-primary">{formatCurrency(item.precoVenda)}</p>
                      <div>
                        <Button variant="ghost" size="icon" onClick={() => setItemToEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingBudgetItens(prev => prev.filter(i => i.id !== item.id))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>


            {/* Desktop Item List */}
            <div className="hidden sm:block border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Valor Final</TableHead>
                            <TableHead className="w-[120px] text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {editingBudgetItens.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div>
                                      <p className="font-medium">{item.materialNome}</p>
                                      <p className="text-xs text-muted-foreground">{formatNumber(item.quantidade, 2)} {item.unidade} x {formatCurrency(item.precoUnitario)}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {formatCurrency(item.precoVenda)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div>
                                      <Button variant="ghost" size="icon" onClick={() => setItemToEdit(item)}>
                                          <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => setEditingBudgetItens(prev => prev.filter(i => i.id !== item.id))}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-end items-center">
                <div className="flex-1 max-w-[250px] space-y-1">
                  <Label htmlFor="manualTotal" className="text-right block pr-2">Total do Orçamento</Label>
                  <div className="relative">
                    <Input
                      id="manualTotal"
                      className="text-right text-lg font-bold h-10 pr-10"
                      value={isTotalLocked ? formatCurrency(finalTotal, false) : manualTotalStr}
                      onChange={handleManualTotalChange}
                      disabled={isTotalLocked}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => {
                        const newLockState = !isTotalLocked;
                        if (newLockState === false) { // Unlocking
                          setManualTotalStr(formatCurrency(calculatedTotal, false));
                          setManualTotal(calculatedTotal);
                        }
                        setIsTotalLocked(newLockState);
                      }}
                    >
                      {isTotalLocked ? <Lock size={16} /> : <Unlock size={16}/>}
                    </Button>
                  </div>
                  {isTotalEdited && !isTotalLocked && (
                    <div className='flex justify-between items-center text-xs mt-1 pr-2'>
                        <Button type="button" size="xs" variant="link" className="h-auto p-0" onClick={resetManualTotal}>
                          <RotateCcw className="mr-1 h-3 w-3"/> Usar calculado
                        </Button>
                         <p className="text-muted-foreground">
                          Original: {formatCurrency(calculatedTotal)}
                        </p>
                    </div>
                  )}
                  {isTotalEdited && (
                    <div className="text-right pr-2">
                      <Badge variant={adjustmentPercentage < 0 ? 'destructive' : 'default'}>
                        {adjustmentPercentage < 0 ? 'Desconto' : 'Acréscimo'}: {Math.abs(adjustmentPercentage).toFixed(2)}%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Observações (visível para o cliente)</Label>
                    <Textarea value={editingBudget.observacoes} onChange={(e) => setEditingBudget({...editingBudget, observacoes: e.target.value})}/>
                </div>
                <div className="space-y-2">
                    <Label>Anotações Internas (não visível)</Label>
                    <Textarea value={editingBudget.observacoesInternas} onChange={(e) => setEditingBudget({...editingBudget, observacoesInternas: e.target.value})}/>
                </div>
            </div>

          </div>

          <DialogFooter className="p-6 pt-4 border-t flex-col sm:flex-row sm:space-x-2 w-full">
            <DialogClose asChild>
              <Button variant="outline" className="w-full">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleUpdateBudget} disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {itemToEdit && (
        <EditItemModal
          isOpen
          item={itemToEdit}
          onOpenChange={open => !open && setItemToEdit(null)}
          onSave={item => {
            setEditingBudgetItens(prev =>
              prev.map(i => (i.id === item.id ? item : i))
            );
            setItemToEdit(null);
          }}
        />
      )}
    </>
  );
}
