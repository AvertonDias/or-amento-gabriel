
'use client';

import React, { useState, useMemo, useRef } from 'react';
import type { MaterialItem, ClienteData, Orcamento, OrcamentoItem } from '@/lib/types';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  RadioGroup, RadioGroupItem
} from '@/components/ui/radio-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from '@/components/ui/command';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

import {
  Loader2, PlusCircle, Trash2, Pencil, ArrowLeft, ArrowRight,
  FileText, ArrowRightLeft, ChevronsUpDown, Check, Lock, Unlock, RotateCcw
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import {
  formatCurrency, formatNumber,
  maskCpfCnpj, maskTelefone,
  maskCurrency, maskDecimal,
  maskInteger
} from '@/lib/utils';

import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { EditItemModal } from './edit-item-modal';
import { Badge } from '@/components/ui/badge';

/* =========================
   CONSTANTES
========================= */
const generateId = () => crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

/* =========================
   PROPS
========================= */

interface BudgetWizardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: ClienteData[];
  materiais: MaterialItem[];
  onSaveBudget: (budget: Omit<Orcamento, 'id'>, saveNewClient: boolean) => void;
}

/* =========================
   COMPONENTE
========================= */

export function BudgetWizard({
  isOpen,
  onOpenChange,
  clientes,
  materiais,
  onSaveBudget
}: BudgetWizardProps) {

  const { toast } = useToast();
  const quantidadeInputRef = useRef<HTMLInputElement>(null);

  /* ---------- ESTADOS ---------- */

  const [wizardStep, setWizardStep] = useState(1);
  const [orcamentoItens, setOrcamentoItens] = useState<OrcamentoItem[]>([]);
  
  const [clientSelectionType, setClientSelectionType] = useState<'existente' | 'novo'>('novo');

  const [clienteData, setClienteData] = useState<{
    id?: string;
    nome: string;
    endereco?: string;
    email?: string;
    cpfCnpj?: string;
    telefones: { nome: string; numero: string; principal?: boolean }[];
  }>({
    id: undefined,
    nome: '',
    endereco: '',
    email: '',
    cpfCnpj: '',
    telefones: [{ nome: 'Principal', numero: '', principal: true }]
  });

  const [validadeDias, setValidadeDias] = useState('7');
  const [observacoes, setObservacoes] = useState('');
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [novoItem, setNovoItem] = useState({
    materialId: '',
    quantidade: '',
    margemLucro: ''
  });

  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [margemLucroStr, setMargemLucroStr] = useState('');

  const [isAddingAvulso, setIsAddingAvulso] = useState(false);
  const [itemAvulso, setItemAvulso] = useState({
    descricao: '',
    quantidade: '',
    unidade: 'un',
    precoFinal: ''
  });
  const [itemAvulsoPrecoStr, setItemAvulsoPrecoStr] = useState('');

  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

  const [isConfirmSaveClientOpen, setIsConfirmSaveClientOpen] = useState(false);
  const [clientToSave, setClientToSave] = useState<any>(null);

  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  const [isMaterialPopoverOpen, setIsMaterialPopoverOpen] = useState(false);

  const [isTotalLocked, setIsTotalLocked] = useState(true);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [manualTotalStr, setManualTotalStr] = useState('');

  /* ---------- MEMOS ---------- */

  const selectedMaterial = useMemo(
    () => materiais.find(m => m.id === novoItem.materialId),
    [materiais, novoItem.materialId]
  );

  const isCurrentUnitInteger = useMemo(() => {
    if (isAddingAvulso) return integerUnits.includes(itemAvulso.unidade);
    return selectedMaterial
      ? integerUnits.includes(selectedMaterial.unidade)
      : false;
  }, [isAddingAvulso, itemAvulso.unidade, selectedMaterial]);

  const calculatedTotal = useMemo(
    () => orcamentoItens.reduce((sum, i) => sum + i.precoVenda, 0),
    [orcamentoItens]
  );

  const finalTotal = manualTotal ?? calculatedTotal;
  const isTotalEdited = manualTotal !== null;

  const adjustmentPercentage = useMemo(() => {
    if (!isTotalEdited || calculatedTotal === 0) return 0;
    return ((finalTotal - calculatedTotal) / calculatedTotal) * 100;
  }, [isTotalEdited, finalTotal, calculatedTotal]);

  /* ---------- FUNÇÕES PRINCIPAIS ---------- */

  const resetWizard = () => {
    setWizardStep(1);
    setOrcamentoItens([]);
    setClientSelectionType('novo');
    setClienteData({
      id: undefined,
      nome: '',
      endereco: '',
      email: '',
      cpfCnpj: '',
      telefones: [{ nome: 'Principal', numero: '', principal: true }]
    });
    setValidadeDias('7');
    setObservacoes('');
    setObservacoesInternas('');
    setNovoItem({ materialId: '', quantidade: '', margemLucro: '' });
    setQuantidadeStr('');
    setMargemLucroStr('');
    setItemAvulso({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
    setItemAvulsoPrecoStr('');
    setIsAddingAvulso(false);
    setIsTotalLocked(true);
    setManualTotal(null);
    setManualTotalStr('');
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) resetWizard();
    onOpenChange(open);
  };
  
  const handleClientSelectionTypeChange = (value: 'existente' | 'novo') => {
    setClientSelectionType(value);
    setClienteData({
      id: undefined,
      nome: '',
      endereco: '',
      email: '',
      cpfCnpj: '',
      telefones: [{ nome: 'Principal', numero: '', principal: true }],
    });
  };

  const handleClienteTelefoneChange = (index: number, value: string) => {
    const telefones = [...clienteData.telefones];
    telefones[index].numero = maskTelefone(value);
    setClienteData({ ...clienteData, telefones });
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

    setOrcamentoItens([...orcamentoItens, orcamentoItem]);
    setNovoItem({ materialId: '', quantidade: '', margemLucro: '' });
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

    setOrcamentoItens([...orcamentoItens, orcamentoItem]);
    setItemAvulso({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
    setItemAvulsoPrecoStr('');
    setIsAddingAvulso(false);
  };

  const handleRemoveItem = (id: string) => {
    setOrcamentoItens(orcamentoItens.filter(i => i.id !== id));
  };

  const handleEditItem = (item: OrcamentoItem) => {
    setEditingItem(item);
    setIsEditItemModalOpen(true);
  };

  const handleSaveItemEdit = (item: OrcamentoItem) => {
    setOrcamentoItens(orcamentoItens.map(i => (i.id === item.id ? item : i)));
    setIsEditItemModalOpen(false);
    setEditingItem(null);
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


  const handleFinalSave = async (saveClient: boolean = false) => {
    setIsSubmitting(true);
    try {
      const budgetData: Omit<Orcamento, 'id'> = {
        userId: '',
        numeroOrcamento: '',
        cliente: {
          ...clienteData,
          id: clienteData.id, 
          telefones: clienteData.telefones.filter(t => t.numero)
        } as ClienteData,
        itens: orcamentoItens,
        totalVenda: finalTotal,
        dataCriacao: new Date().toISOString(),
        status: 'Pendente',
        validadeDias,
        observacoes,
        observacoesInternas,
        dataAceite: null,
        dataRecusa: null,
      };
      
      onSaveBudget(budgetData, saveClient);

    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao salvar", description: "Não foi possível criar o orçamento.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepNext = () => {
    if (wizardStep === 1 && (!clienteData.nome || !clienteData.telefones[0].numero)) {
      toast({ title: "Dados incompletos", description: "Nome e Telefone do cliente são obrigatórios.", variant: "destructive" });
      return;
    }
    if (wizardStep === 2 && orcamentoItens.length === 0) {
      toast({ title: "Nenhum item", description: "Adicione pelo menos um item ao orçamento.", variant: "destructive" });
      return;
    }
    setWizardStep(s => s + 1);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] flex flex-col"
          onPointerDownOutside={(e) => { if (Capacitor.isNativePlatform()) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Novo Orçamento (Passo {wizardStep}/3)</DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Selecione um cliente existente ou cadastre um novo."}
              {wizardStep === 2 && "Adicione os itens e serviços do orçamento."}
              {wizardStep === 3 && "Revise e finalize o orçamento."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 -mr-6 pl-6">
            {/* Passo 1: Cliente */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <RadioGroup value={clientSelectionType} onValueChange={(v) => handleClientSelectionTypeChange(v as 'existente' | 'novo')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existente" id="r-existente" />
                    <Label htmlFor="r-existente">Cliente Existente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="novo" id="r-novo" />
                    <Label htmlFor="r-novo">Novo Cliente</Label>
                  </div>
                </RadioGroup>

                {clientSelectionType === 'existente' ? (
                   <div className="space-y-4">
                    <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={isClientPopoverOpen} className="w-full justify-between">
                          {clienteData.nome || "Selecione um cliente..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clientes.map(c => (
                                <CommandItem key={c.id} value={c.nome} onSelect={() => {
                                  setClienteData(c);
                                  setIsClientPopoverOpen(false);
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", clienteData.id === c.id ? "opacity-100" : "opacity-0")} />
                                  {c.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {clienteData.id && (
                      <div className="border rounded-md p-4 space-y-2 bg-muted/50 text-sm">
                        <h3 className="font-semibold text-base mb-2">Dados do Cliente</h3>
                        <p><strong>Nome:</strong> {clienteData.nome}</p>
                        {clienteData.telefones && clienteData.telefones[0]?.numero && <p><strong>Telefone:</strong> {clienteData.telefones[0].numero}</p>}
                        {clienteData.email && <p><strong>Email:</strong> {clienteData.email}</p>}
                        {clienteData.endereco && <p><strong>Endereço:</strong> {clienteData.endereco}</p>}
                      </div>
                    )}
                   </div>
                ) : (
                  <div className="space-y-4 border p-4 rounded-md">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome Completo*</Label>
                        <Input value={clienteData.nome} onChange={e => setClienteData({ ...clienteData, nome: e.target.value })} />
                      </div>
                      <div>
                        <Label>CPF/CNPJ</Label>
                        <Input value={clienteData.cpfCnpj} onChange={e => setClienteData({ ...clienteData, cpfCnpj: maskCpfCnpj(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <Label>Telefone Principal*</Label>
                      <Input value={clienteData.telefones[0].numero} onChange={e => handleClienteTelefoneChange(0, e.target.value)} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={clienteData.email ?? ''} onChange={e => setClienteData({ ...clienteData, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Endereço</Label>
                      <Input value={clienteData.endereco ?? ''} onChange={e => setClienteData({ ...clienteData, endereco: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Passo 2: Itens */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                {/* Adicionar Itens */}
                <div className="border p-4 rounded-md space-y-4">
                  <h3 className="font-semibold">Adicionar Item</h3>
                  <RadioGroup value={isAddingAvulso ? 'avulso' : 'catalogo'} onValueChange={v => setIsAddingAvulso(v === 'avulso')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="catalogo" id="r-catalogo" />
                      <Label htmlFor="r-catalogo">Item do Catálogo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="avulso" id="r-avulso" />
                      <Label htmlFor="r-avulso">Item Avulso</Label>
                    </div>
                  </RadioGroup>

                  {isAddingAvulso ? (
                    <div className="space-y-2">
                      <Input placeholder="Descrição do item" value={itemAvulso.descricao} onChange={e => setItemAvulso({ ...itemAvulso, descricao: e.target.value })} />
                      <div className="grid grid-cols-3 gap-2">
                        <Input 
                          placeholder="Qtd" 
                          value={itemAvulso.quantidade} 
                          onChange={e => setItemAvulso({ ...itemAvulso, quantidade: isCurrentUnitInteger ? maskInteger(e.target.value) : maskDecimal(e.target.value) })}
                        />
                         <Select value={itemAvulso.unidade} onValueChange={v => setItemAvulso({ ...itemAvulso, unidade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
                                    setNovoItem({ ...novoItem, materialId: m.id });
                                    setIsMaterialPopoverOpen(false);
                                    setTimeout(() => quantidadeInputRef.current?.focus(), 100);
                                  }}>
                                    <Check className={cn("mr-2 h-4 w-4", novoItem.materialId === m.id ? "opacity-100" : "opacity-0")} />
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

                {/* Tabela de Itens */}
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orcamentoItens.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum item adicionado.</TableCell></TableRow>
                      ) : orcamentoItens.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">{item.materialNome}</p>
                            <p className="text-xs text-muted-foreground">{formatNumber(item.quantidade)} {item.unidade} x {formatCurrency(item.precoUnitario)} (+{formatNumber(item.margemLucro)}%)</p>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.precoVenda)}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    {orcamentoItens.length > 0 && (
                      <TableFooter>
                         <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold">Subtotal</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(calculatedTotal)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={2} className="text-right align-middle">
                              <div className='flex justify-end items-center gap-2'>
                                {isTotalEdited && (
                                  <Badge variant={adjustmentPercentage < 0 ? 'destructive' : 'default'}>
                                    Ajuste: {adjustmentPercentage.toFixed(2)}%
                                  </Badge>
                                )}
                                <Label htmlFor="manualTotal" className="text-base font-bold">Total Final</Label>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                               <div className="relative">
                                  <Input
                                    id="manualTotal"
                                    className="text-right text-base font-bold h-9 pr-10"
                                    value={isTotalLocked ? formatCurrency(calculatedTotal, false) : manualTotalStr}
                                    onChange={handleManualTotalChange}
                                    disabled={isTotalLocked}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setIsTotalLocked(v => !v)}
                                  >
                                    {isTotalLocked ? <Lock size={16} /> : <Unlock size={16}/>}
                                  </Button>
                               </div>
                                {isTotalEdited && !isTotalLocked && (
                                  <Button type="button" size="xs" variant="link" className="h-auto p-0 mt-1" onClick={resetManualTotal}>
                                      <RotateCcw className="mr-1 h-3 w-3"/> Usar total calculado
                                  </Button>
                                )}
                            </TableCell>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>
              </div>
            )}

            {/* Passo 3: Resumo */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div className="border rounded-md p-4 space-y-2">
                  <h3 className="font-semibold">Resumo do Cliente</h3>
                  <p><strong>Nome:</strong> {clienteData.nome}</p>
                  {clienteData.cpfCnpj && <p><strong>CPF/CNPJ:</strong> {clienteData.cpfCnpj}</p>}
                  {clienteData.telefones[0]?.numero && <p><strong>Telefone:</strong> {clienteData.telefones[0].numero}</p>}
                  {clienteData.email && <p><strong>Email:</strong> {clienteData.email}</p>}
                  {clienteData.endereco && <p><strong>Endereço:</strong> {clienteData.endereco}</p>}
                </div>
                <div className="border rounded-md p-4">
                  <h3 className="font-semibold mb-2">Itens do Orçamento</h3>
                  <ul className="space-y-1 text-sm">
                    {orcamentoItens.map(i => (
                      <li key={i.id} className="flex justify-between">
                        <span>{i.materialNome} <span className="text-muted-foreground">({formatNumber(i.quantidade)} {i.unidade})</span></span>
                        <span>{formatCurrency(i.precoVenda)}</span>
                      </li>
                    ))}
                  </ul>
                   <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t">
                    <span>Total Final</span>
                     <div className='flex items-center gap-2'>
                        {isTotalEdited && (
                          <Badge variant={adjustmentPercentage < 0 ? 'destructive' : 'default'}>
                            Ajuste: {adjustmentPercentage.toFixed(2)}%
                          </Badge>
                        )}
                        <span>{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Validade (dias)</Label>
                    <Input value={validadeDias} onChange={e => setValidadeDias(maskInteger(e.target.value))} />
                  </div>
                </div>
                <div>
                  <Label>Observações (visível para o cliente)</Label>
                  <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                </div>
                 <div>
                  <Label>Anotações Internas (não visível)</Label>
                  <Textarea value={observacoesInternas} onChange={e => setObservacoesInternas(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            )}
            {wizardStep < 3 && (
              <Button onClick={stepNext}>
                Avançar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {wizardStep === 3 && (
              <Button
                onClick={() => {
                  if (clientSelectionType === 'novo' && !clienteData.id) {
                    setIsConfirmSaveClientOpen(true);
                  } else {
                    handleFinalSave(false);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
                Salvar Orçamento
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingItem && (
        <EditItemModal
          isOpen={isEditItemModalOpen}
          item={editingItem}
          onOpenChange={setIsEditItemModalOpen}
          onSave={handleSaveItemEdit}
        />
      )}

      <AlertDialog open={isConfirmSaveClientOpen} onOpenChange={setIsConfirmSaveClientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar novo cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente &quot;{clienteData.nome}&quot; não está cadastrado. Deseja salvá-lo na sua lista de clientes para uso futuro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { handleFinalSave(false); setIsConfirmSaveClientOpen(false); }}>Não, usar só neste orçamento</Button>
            <Button onClick={() => { handleFinalSave(true); setIsConfirmSaveClientOpen(false); }}>Sim, salvar cliente</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
