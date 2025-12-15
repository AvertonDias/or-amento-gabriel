
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Orcamento, OrcamentoItem, MaterialItem, ClienteData } from '@/lib/types';
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
  TableFooter as TableTotalFooter,
} from '@/components/ui/table';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Pencil,
  ArrowRightLeft,
  RotateCcw,
  Lock,
  Unlock
} from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  maskCurrency,
  maskDecimal,
  maskInteger,
  maskDecimalWithAutoComma,
  maskTelefone,
} from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { EditItemModal } from './edit-item-modal';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';


/* ===========================
   Helpers
=========================== */
const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

  const [newItemForEdit, setNewItemForEdit] = useState({
    materialId: '',
    quantidade: '',
    margemLucro: '',
  });

  const [newItemQtyStr, setNewItemQtyStr] = useState('');
  const [newItemMarginStr, setNewItemMarginStr] = useState('');

  const [isAddingAvulsoInEdit, setIsAddingAvulsoInEdit] = useState(false);
  const [itemAvulsoInEdit, setItemAvulsoInEdit] = useState({
    descricao: '',
    quantidade: '',
    unidade: 'un',
  });
  const [itemAvulsoPrecoStr, setItemAvulsoPrecoStr] = useState('');

  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  
  const [isTotalLocked, setIsTotalLocked] = useState(true);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [manualTotalStr, setManualTotalStr] = useState('');


  useEffect(() => {
    if (budget) {
        setEditingBudget({ ...budget });
        setEditingBudgetItens([...budget.itens]);
        
        const calculatedTotal = budget.itens.reduce((sum, item) => sum + item.precoVenda, 0);
        if (budget.totalVenda.toFixed(2) !== calculatedTotal.toFixed(2)) {
            setManualTotal(budget.totalVenda);
            setManualTotalStr(formatCurrency(budget.totalVenda, false));
            setIsTotalLocked(false); // Se o valor já veio editado, começa desbloqueado
        } else {
            setManualTotal(null);
            setManualTotalStr('');
            setIsTotalLocked(true);
        }
    }
  }, [budget]);

  const selectedMaterialForEdit = useMemo(
    () => materiais.find(m => m.id === newItemForEdit.materialId),
    [materiais, newItemForEdit.materialId]
  );

  const isEditUnitInteger = useMemo(() => {
    if (isAddingAvulsoInEdit) {
      return integerUnits.includes(itemAvulsoInEdit.unidade);
    }
    return selectedMaterialForEdit
      ? integerUnits.includes(selectedMaterialForEdit.unidade)
      : false;
  }, [isAddingAvulsoInEdit, itemAvulsoInEdit.unidade, selectedMaterialForEdit]);
  
  const calculatedTotal = useMemo(() => editingBudgetItens.reduce((sum, item) => sum + item.precoVenda, 0), [editingBudgetItens]);
  const finalTotal = useMemo(() => manualTotal ?? calculatedTotal, [manualTotal, calculatedTotal]);
  const isTotalEdited = useMemo(() => manualTotal !== null, [manualTotal]);

  const adjustmentPercentage = useMemo(() => {
    if (!isTotalEdited || calculatedTotal === 0) return 0;
    return ((finalTotal - calculatedTotal) / calculatedTotal) * 100;
  }, [isTotalEdited, finalTotal, calculatedTotal]);


  /* ===========================
     Handlers
  =========================== */

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingBudget) return;
    const { name, value } = e.target;

    setEditingBudget(prev => {
        if (!prev) return null;
        if (name === 'observacoes' || name === 'observacoesInternas') {
            return { ...prev, [name]: value };
        }
        if (name in prev.cliente) {
             return {
                ...prev,
                cliente: {
                    ...prev.cliente,
                    [name]: value
                }
            }
        }
        return { ...prev, [name]: value };
    });
  };

  const handleClienteTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingBudget) return;
      const maskedValue = maskTelefone(e.target.value);
      setEditingBudget(prev => {
          if (!prev) return null;
          // Assegura que telefones existe e tem pelo menos um item
          const telefones = Array.isArray(prev.cliente.telefones) && prev.cliente.telefones.length > 0
              ? [...prev.cliente.telefones]
              : [{ nome: 'Principal', numero: '' }];
          
          // Atualiza o primeiro telefone (ou o principal, se a lógica for mais complexa)
          telefones[0] = { ...telefones[0], numero: maskedValue };
          
          return {
              ...prev,
              cliente: {
                  ...prev.cliente,
                  telefones: telefones,
              }
          }
      });
  };


  const handleNewItemChange = (field: keyof typeof newItemForEdit, value: string) => {
    if (field === 'materialId') {
      setNewItemForEdit(prev => ({ ...prev, [field]: value }));
      setTimeout(() => quantidadeInputRef.current?.focus(), 0);
    } else if (field === 'quantidade') {
      const mask = isEditUnitInteger ? maskInteger : maskDecimalWithAutoComma;
      const masked = mask(value);
      setNewItemQtyStr(masked);
      setNewItemForEdit(prev => ({ ...prev, [field]: masked.replace(',', '.') }));
    } else if (field === 'margemLucro') {
      const masked = maskDecimal(value);
      setNewItemMarginStr(masked);
      setNewItemForEdit(prev => ({ ...prev, [field]: masked.replace(',', '.') }));
    }
  };
  
  const addLinha = () => {
    if (!selectedMaterialForEdit) {
      toast({ title: 'Seleção necessária', description: 'Por favor, selecione um item ou serviço.', variant: 'destructive' });
      return;
    }
    const { precoUnitario, id: materialId, descricao, unidade, tipo, quantidade: estoqueAtual, quantidadeMinima } = selectedMaterialForEdit;
    const numMargemLucro = parseFloat(newItemForEdit.margemLucro.replace(',', '.')) || 0;
    const numQuantidade = parseFloat(newItemForEdit.quantidade.replace(',', '.'));
    if (isNaN(numQuantidade) || numQuantidade <= 0 || precoUnitario === null) {
      toast({ title: 'Valores inválidos', description: 'Preencha a Quantidade e verifique os dados do item.', variant: 'destructive' });
      return;
    }
  
    if (tipo === 'item' && estoqueAtual != null && quantidadeMinima != null) {
      const novoEstoque = estoqueAtual - numQuantidade;
      if (novoEstoque <= quantidadeMinima) {
        toast({
          title: "Aviso de Estoque Baixo",
          description: `O item "${descricao}" atingiu o estoque mínimo. Restam: ${novoEstoque}`,
          variant: "destructive"
        });
      }
    }
    
    const custoFinal = precoUnitario * numQuantidade;
    const precoVenda = custoFinal * (1 + numMargemLucro / 100);
    const novoOrcamentoItem: OrcamentoItem = { 
      id: generateId(), materialId, materialNome: descricao, unidade,
      quantidade: numQuantidade, precoUnitario, total: custoFinal, 
      margemLucro: numMargemLucro, precoVenda,
    };
    setEditingBudgetItens(prev => [...prev, novoOrcamentoItem]);
    setNewItemForEdit({ materialId: '', quantidade: '', margemLucro: '' });
    setNewItemQtyStr('');
    setNewItemMarginStr('');
  };
  
  const addLinhaAvulsa = () => {
    const { descricao, quantidade, unidade } = itemAvulsoInEdit;
    const numQuantidade = parseFloat(quantidade.replace(',', '.')) || 1;
    const numPrecoFinal = parseFloat(itemAvulsoPrecoStr.replace(/\D/g, '')) / 100;

    if (!descricao.trim()) { toast({ title: "Descrição obrigatória", variant: "destructive" }); return; }
    if (isNaN(numQuantidade) || numQuantidade <= 0) { toast({ title: "Quantidade inválida", variant: "destructive" }); return; }
    if (isNaN(numPrecoFinal) || numPrecoFinal <= 0) { toast({ title: "Preço inválido", variant: "destructive" }); return; }

    const novoOrcamentoItem: OrcamentoItem = {
      id: generateId(),
      materialId: 'avulso-' + generateId(),
      materialNome: descricao,
      unidade: unidade || 'un',
      quantidade: numQuantidade,
      precoUnitario: numPrecoFinal / numQuantidade,
      total: numPrecoFinal,
      margemLucro: 0,
      precoVenda: numPrecoFinal,
    };

    setEditingBudgetItens(prev => [...prev, novoOrcamentoItem]);
    setItemAvulsoInEdit({ descricao: '', quantidade: '', unidade: 'un' });
    setItemAvulsoPrecoStr('');
    setIsAddingAvulsoInEdit(false);
  };
  
  const removeLinha = (id: string) => {
    setEditingBudgetItens(prev => prev.filter(i => i.id !== id));
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
  
  const handleToggleLock = () => {
    const newLockState = !isTotalLocked;
    if (!newLockState && !manualTotalStr) {
      // Ao destravar, se o campo manual estiver vazio, preenche com o valor calculado
      setManualTotalStr(formatCurrency(calculatedTotal, false));
      setManualTotal(calculatedTotal);
    }
    setIsTotalLocked(newLockState);
  };

  const handleManualTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskCurrency(e.target.value);
    setManualTotalStr(maskedValue.replace('R$ ', ''));
    
    const numericValue = parseFloat(maskedValue.replace(/[^\d,]/g, '').replace(',', '.')) || null;
    setManualTotal(numericValue);
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

      toast({ title: 'Orçamento atualizado com sucesso.' });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar orçamento',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!editingBudget) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] flex flex-col"
          onPointerDownOutside={e => {
            if (Capacitor.isNativePlatform()) e.preventDefault();
          }}
        >
            <DialogHeader>
                <DialogTitle>Editar Orçamento</DialogTitle>
                <DialogDescription>Ajuste os itens, cliente e outras informações do orçamento.</DialogDescription>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto p-1 pr-4 space-y-6">
                {/* DADOS DO CLIENTE */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold text-muted-foreground">Dados do Cliente</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Nome do Cliente</Label><Input value={editingBudget.cliente.nome} disabled/></div>
                        <div><Label htmlFor="cliente-telefone">Telefone</Label><Input id="cliente-telefone" name="telefone" value={editingBudget.cliente.telefones?.[0]?.numero || ''} onChange={handleClienteTelefoneChange} /></div>
                        <div className="md:col-span-2"><Label htmlFor="cliente-endereco">Endereço</Label><Input id="cliente-endereco" name="endereco" value={editingBudget.cliente.endereco} onChange={handleDataChange} /></div>
                     </div>
                </div>

                {/* ADICIONAR ITENS */}
                <div className="mb-6 p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-muted-foreground">
                            {isAddingAvulsoInEdit ? 'Adicionar Item Avulso' : 'Adicionar Item'}
                        </h4>
                        <Button variant="outline" onClick={() => setIsAddingAvulsoInEdit(!isAddingAvulsoInEdit)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            <span>{isAddingAvulsoInEdit ? 'Item da Lista' : 'Item Avulso'}</span>
                        </Button>
                    </div>
                    {isAddingAvulsoInEdit ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <div className="lg:col-span-2"><Label htmlFor="edit-avulso-desc">Descrição</Label><Input id="edit-avulso-desc" value={itemAvulsoInEdit.descricao} onChange={e => setItemAvulsoInEdit(p => ({...p, descricao: e.target.value}))} /></div>
                            <div>
                                <Label htmlFor="edit-avulso-qtd">Qtd.</Label>
                                <Input id="edit-avulso-qtd" value={itemAvulsoInEdit.quantidade} 
                                    onChange={e => {
                                        const mask = isEditUnitInteger ? maskInteger : maskDecimalWithAutoComma;
                                        setItemAvulsoInEdit(p => ({...p, quantidade: mask(e.target.value)}));
                                    }} 
                                placeholder="1" />
                            </div>
                            <div>
                                <Label htmlFor="edit-avulso-un">Unidade</Label>
                                <Select name="unidade" value={itemAvulsoInEdit.unidade} onValueChange={(value) => setItemAvulsoInEdit(p => ({...p, unidade: value}))}>
                                    <SelectTrigger id="edit-avulso-un"><SelectValue /></SelectTrigger>
                                    <SelectContent>{unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="lg:col-span-2">
                                <Label htmlFor="edit-avulso-preco">Preço Final (R$)</Label>
                                <Input id="edit-avulso-preco" value={itemAvulsoPrecoStr} onChange={e => setItemAvulsoPrecoStr(maskCurrency(e.target.value))} placeholder="R$ 50,00" />
                            </div>
                            <div className="lg:col-span-1"><Button onClick={addLinhaAvulsa} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Add</Button></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="sm:col-span-2">
                                <Label htmlFor="edit-material-select">Item / Serviço</Label>
                                <Select value={newItemForEdit.materialId} onValueChange={(val) => handleNewItemChange('materialId', val)}>
                                <SelectTrigger id="edit-material-select"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>{materiais.map(mat => (<SelectItem key={mat.id} value={mat.id}>{`${mat.descricao} (${formatCurrency(mat.precoUnitario)}/${mat.unidade})`}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                            {selectedMaterialForEdit && (
                                <>
                                <div>
                                    <Label htmlFor="edit-quantidade-novo">Qtd ({selectedMaterialForEdit.unidade})</Label>
                                    <Input ref={quantidadeInputRef} id="edit-quantidade-novo" type="text" inputMode='decimal' placeholder="1,50" value={newItemQtyStr} onChange={e => handleNewItemChange('quantidade', e.target.value)} />
                                </div>
                                <div><Label htmlFor="edit-margem-lucro">Acréscimo (%)</Label><Input id="edit-margem-lucro" type="text" inputMode='decimal' placeholder="10" value={newItemMarginStr} onChange={e => handleNewItemChange('margemLucro', e.target.value)} /></div>
                                <div className="lg:col-span-1"><Button onClick={addLinha} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Add</Button></div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* TABELA DE ITENS - DESKTOP */}
                <div className="hidden md:block">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead className="text-right">Venda</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {editingBudgetItens.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.materialNome}</TableCell>
                                    <TableCell className="text-right">{formatNumber(item.quantidade, 2)}</TableCell>
                                    <TableCell className="text-right font-bold text-primary">{formatCurrency(item.precoVenda)}</TableCell>
                                    <TableCell className="flex justify-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => removeLinha(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                 {/* LISTA DE ITENS - MOBILE */}
                <div className="md:hidden grid grid-cols-1 gap-4">
                  {editingBudgetItens.map(item => (
                    <Card key={item.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-foreground pr-2">{item.materialNome}</p>
                           <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItemClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLinha(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                           <span>{formatNumber(item.quantidade, 2)} {item.unidade}</span>
                           <span className="font-bold text-primary">{formatCurrency(item.precoVenda)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>


                <div>
                    <Table>
                        <TableTotalFooter>
                            <TableRow className="bg-muted/50 font-bold text-lg">
                                <TableCell colSpan={3} className="md:col-span-2">TOTAL</TableCell>
                                <TableCell className="text-right text-primary">
                                <div className="flex items-center justify-end gap-2">
                                    {isTotalEdited && (
                                        <span className="text-sm font-normal text-muted-foreground line-through">
                                            {formatCurrency(calculatedTotal)}
                                        </span>
                                    )}

                                    {isTotalLocked ? (
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-lg font-bold", isTotalEdited && "text-amber-600 dark:text-amber-400")}>
                                                {formatCurrency(finalTotal)}
                                            </span>
                                             {isTotalEdited && (
                                                <Badge variant={adjustmentPercentage < 0 ? "destructive" : "default"}>
                                                    {adjustmentPercentage > 0 ? "+" : ""}
                                                    {formatNumber(adjustmentPercentage, 1)}%
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                        <span>R$</span>
                                        <Input
                                            type="text"
                                            value={manualTotalStr}
                                            onChange={handleManualTotalChange}
                                            className="w-32 h-8 text-right text-lg font-bold"
                                            placeholder={formatCurrency(calculatedTotal, false)}
                                            autoFocus
                                            onBlur={() => { if (!manualTotalStr) setIsTotalLocked(true); }}
                                        />
                                        </>
                                    )}
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={handleToggleLock}
                                        className="h-8 w-8"
                                    >
                                        {isTotalLocked ? <Lock className="h-4 w-4"/> : <Unlock className="h-4 w-4 text-primary"/>}
                                    </Button>
                                     {isTotalEdited && (
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={resetManualTotal}
                                            className="h-8 w-8"
                                            title="Resetar para o valor calculado"
                                        >
                                            <RotateCcw className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell"></TableCell>
                            </TableRow>
                        </TableTotalFooter>
                    </Table>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações para o Cliente</Label>
                  <Textarea id="observacoes" name="observacoes" placeholder="Ex: Condições de pagamento, prazo de entrega, etc." value={editingBudget.observacoes || ''} onChange={handleDataChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="observacoesInternas">Observações Internas</Label>
                  <Textarea id="observacoesInternas" name="observacoesInternas" placeholder="Anotações que não aparecerão para o cliente." value={editingBudget.observacoesInternas || ''} onChange={handleDataChange} />
                </div>
            </div>

            <DialogFooter className="pt-4 border-t">
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleUpdateBudget} disabled={isSubmitting || editingBudgetItens.length === 0}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Alterações
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
