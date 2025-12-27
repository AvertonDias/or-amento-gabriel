'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { MaterialItem, ClienteData, Orcamento, OrcamentoItem } from '@/lib/types';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
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
  Loader2, Trash2, Pencil, ArrowLeft, ArrowRight,
  FileText, ChevronsUpDown, Check, Lock, Unlock, RotateCcw
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import {
  formatCurrency, formatNumber,
  maskCpfCnpj, maskTelefone,
  maskCurrency, maskDecimal,
  maskInteger, findDuplicateClient
} from '@/lib/utils';

import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { EditItemModal } from './edit-item-modal';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';

/* =========================
   CONSTANTES
========================= */

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const unidadesDeMedida = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'dia', label: 'Dia de Serviço (dia)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'serv', label: 'Serviço (serv)' },
];

const integerUnits = ['un', 'h', 'serv', 'dia'];

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
  const [clientSelectionType, setClientSelectionType] =
    useState<'existente' | 'novo'>('novo');

  const [clienteData, setClienteData] = useState<ClienteData>({
    id: '',
    userId: '', // ✅ CORREÇÃO AQUI
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

  // States for adding new item
  const [newItem, setNewItem] = useState<{ materialId: string, quantidade: string, margemLucro: string }>({
    materialId: '',
    quantidade: '',
    margemLucro: ''
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


  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

  const [isConfirmSaveClientOpen, setIsConfirmSaveClientOpen] = useState(false);

  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  const [isMaterialPopoverOpen, setIsMaterialPopoverOpen] = useState(false);

  const [isTotalLocked, setIsTotalLocked] = useState(true);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [manualTotalStr, setManualTotalStr] = useState('');

  const [potentialDuplicate, setPotentialDuplicate] =
    useState<ClienteData | null>(null);

  const debouncedClienteData = useDebounce(clienteData, 500);

  /* ---------- MEMOS ---------- */

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
    () => orcamentoItens.reduce((sum, i) => sum + i.precoVenda, 0),
    [orcamentoItens]
  );

  const finalTotal = manualTotal ?? calculatedTotal;

  const isTotalEdited = manualTotal !== null;

  const adjustmentPercentage = useMemo(() => {
    if (!isTotalEdited || calculatedTotal === 0) return 0;
    return ((finalTotal - calculatedTotal) / calculatedTotal) * 100;
  }, [isTotalEdited, finalTotal, calculatedTotal]);

  /* ---------- EFEITOS ---------- */

  useEffect(() => {
    if (
      clientSelectionType === 'novo' &&
      (debouncedClienteData.nome ||
        debouncedClienteData.telefones?.[0]?.numero)
    ) {
      setPotentialDuplicate(
        findDuplicateClient(debouncedClienteData, clientes)
      );
    } else {
      setPotentialDuplicate(null);
    }
  }, [debouncedClienteData, clientSelectionType, clientes]);

  /* ---------- HANDLERS ---------- */

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

  const resetWizard = () => {
    setWizardStep(1);
    setOrcamentoItens([]);
    setClientSelectionType('novo');
    setClienteData({ id: '', userId: '', nome: '', endereco: '', email: '', cpfCnpj: '', telefones: [{ nome: 'Principal', numero: '', principal: true }] });
    setValidadeDias('7');
    setObservacoes('');
    setObservacoesInternas('');
    setNewItem({ materialId: '', quantidade: '', margemLucro: '' });
    setQuantidadeStr('');
    setMargemLucroStr('');
    setManualTotal(null);
    setManualTotalStr('');
    setIsTotalLocked(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetWizard();
    }
    onOpenChange(open);
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

    setOrcamentoItens([...orcamentoItens, orcamentoItem]);
    setItemAvulso({ descricao: '', unidade: 'un', quantidade: '', precoFinal: '' });
    setItemAvulsoPrecoStr('');
    setIsAddingAvulso(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setOrcamentoItens(orcamentoItens.filter(i => i.id !== itemId));
  };

  const handleUpdateItem = (updatedItem: OrcamentoItem) => {
    setOrcamentoItens(
      orcamentoItens.map(i => (i.id === updatedItem.id ? updatedItem : i))
    );
    setIsEditItemModalOpen(false);
    setEditingItem(null);
  };


  const handleNextStep = () => {
    if (wizardStep === 1 && orcamentoItens.length === 0) {
      toast({ title: "Nenhum item adicionado", description: "Adicione ao menos um item para prosseguir.", variant: 'destructive' });
      return;
    }
    if (wizardStep === 2) {
      if (clientSelectionType === 'novo' && !clienteData.nome) {
        toast({ title: "Nome do cliente obrigatório", variant: 'destructive' });
        return;
      }
      if (clientSelectionType === 'existente' && !clienteData.id) {
        toast({ title: "Selecione um cliente", variant: 'destructive' });
        return;
      }
    }

    setWizardStep(prev => prev + 1);
  };

  const handleSave = () => {
    if (clientSelectionType === 'novo' && !potentialDuplicate) {
      setIsConfirmSaveClientOpen(true);
    } else {
      handleFinalSave(false);
    }
  };

  const handleFinalSave = async (saveClient: boolean) => {
    setIsSubmitting(true);
    try {
      onSaveBudget({
        userId: '',
        numeroOrcamento: '',
        cliente: {
          ...clienteData,
          telefones: clienteData.telefones.filter(t => t.numero)
        },
        itens: orcamentoItens,
        totalVenda: finalTotal,
        dataCriacao: new Date().toISOString(),
        status: 'Pendente',
        validadeDias,
        observacoes,
        observacoesInternas,
        dataAceite: null,
        dataRecusa: null,
      }, saveClient);
      handleOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };


  /* =========================
     JSX
  ========================= */

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0"
          onPointerDownOutside={(e) => {
            if (Capacitor.isNativePlatform()) e.preventDefault();
          }}
        >
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl">Novo Orçamento - Passo {wizardStep} de 3</DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Adicione itens ou serviços ao orçamento."}
              {wizardStep === 2 && "Selecione ou cadastre os dados do cliente."}
              {wizardStep === 3 && "Revise e finalize o orçamento."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 px-6">
            {/* ETAPA 1: ITENS */}
            {wizardStep === 1 && (
              <div className="space-y-4">
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
                    // Formulário Item Avulso
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
                    // Formulário Item Catálogo
                    <div className="space-y-2">
                        <Popover open={isMaterialPopoverOpen} onOpenChange={setIsMaterialPopoverOpen}>
                            <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isMaterialPopoverOpen} className="w-full justify-between text-left h-auto">
                                <span className="truncate">{selectedMaterial?.descricao || "Selecione um item..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar item..." />
                                <ScrollArea className="h-[250px]">
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
                                            <div className="flex flex-col">
                                                <span>{m.descricao}</span>
                                                <span className="text-xs text-muted-foreground">{formatCurrency(m.precoUnitario)}/{m.unidade} {m.tipo === 'item' && m.quantidade !== null ? `(Estoque: ${formatNumber(m.quantidade, integerUnits.includes(m.unidade) ? 0 : 2)})` : ''}</span>
                                            </div>
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                </ScrollArea>
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

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Valor Final</TableHead>
                        <TableHead className="w-[120px] text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orcamentoItens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground h-24">Nenhum item adicionado</TableCell>
                        </TableRow>
                      ) : (
                        orcamentoItens.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium">{item.materialNome}</p>
                              <p className="text-xs text-muted-foreground">{formatNumber(item.quantidade, 2)} {item.unidade} x {formatCurrency(item.precoUnitario)}</p>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(item.precoVenda)}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsEditItemModalOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(calculatedTotal)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            )}

            {/* ETAPA 2: CLIENTE */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <RadioGroup value={clientSelectionType} onValueChange={(v) => setClientSelectionType(v as 'existente' | 'novo')}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="novo" id="r-novo" /><Label htmlFor="r-novo">Novo Cliente</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="existente" id="r-existente" /><Label htmlFor="r-existente">Cliente Existente</Label></div>
                </RadioGroup>
                
                {clientSelectionType === 'novo' ? (
                   <div className="border p-4 rounded-md space-y-4">
                      {potentialDuplicate && (
                      <AlertDialog defaultOpen>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cliente Duplicado?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Um cliente com dados semelhantes já existe: <strong>{potentialDuplicate.nome}</strong>. Deseja usar este cliente?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setPotentialDuplicate(null)}>Não, continuar cadastro</AlertDialogCancel>
                                <AlertDialogAction onClick={() => {
                                setClienteData(potentialDuplicate);
                                setClientSelectionType('existente');
                                setPotentialDuplicate(null);
                                }}>Sim, usar este</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      )}
                     <div className="space-y-2"><Label>Nome*</Label><Input value={clienteData.nome} onChange={(e) => setClienteData({...clienteData, nome: e.target.value})} /></div>
                     <div className="space-y-2"><Label>CPF/CNPJ</Label><Input value={clienteData.cpfCnpj} onChange={(e) => setClienteData({...clienteData, cpfCnpj: maskCpfCnpj(e.target.value)})} /></div>
                     <div className="space-y-2"><Label>Email</Label><Input type="email" value={clienteData.email} onChange={(e) => setClienteData({...clienteData, email: e.target.value})} /></div>
                     <div className="space-y-2"><Label>Endereço</Label><Input value={clienteData.endereco} onChange={(e) => setClienteData({...clienteData, endereco: e.target.value})} /></div>
                     <div className="space-y-2"><Label>Telefone</Label><Input value={clienteData.telefones[0].numero} onChange={(e) => setClienteData({...clienteData, telefones: [{...clienteData.telefones[0], numero: maskTelefone(e.target.value)}]})} /></div>
                   </div>
                ) : (
                   <div className="border p-4 rounded-md space-y-4">
                     <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isClientPopoverOpen} className="w-full justify-between">
                                {clienteData.id ? clientes.find(c => c.id === clienteData.id)?.nome : "Selecione um cliente..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                             <ScrollArea className="h-[250px]">
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
                            </ScrollArea>
                            </Command>
                        </PopoverContent>
                    </Popover>
                   </div>
                )}
              </div>
            )}

            {/* ETAPA 3: REVISÃO */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Validade da Proposta (dias)</Label>
                    <Input value={validadeDias} onChange={(e) => setValidadeDias(maskInteger(e.target.value))} />
                  </div>
                </div>
                 <div className="space-y-2">
                    <Label>Observações (visível para o cliente)</Label>
                    <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Anotações Internas (não visível)</Label>
                    <Textarea value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} />
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
                            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={resetManualTotal}>
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
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-2 border-t flex-col sm:flex-row space-y-2 sm:space-y-0 w-full">
            <div className="flex w-full justify-between">
              {wizardStep > 1 ? (
                <Button variant="outline" onClick={() => setWizardStep(prev => prev - 1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
              ) : <div></div>}

              {wizardStep < 3 ? (
                <Button onClick={handleNextStep}>Avançar <ArrowRight className="ml-2 h-4 w-4" /></Button>
              ) : (
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
                  Salvar Orçamento
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {editingItem && (
          <EditItemModal
            isOpen={isEditItemModalOpen}
            onOpenChange={setIsEditItemModalOpen}
            item={editingItem}
            onSave={handleUpdateItem}
          />
      )}

      <AlertDialog open={isConfirmSaveClientOpen} onOpenChange={setIsConfirmSaveClientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar Novo Cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está cadastrando um novo cliente. Deseja salvar os dados de &quot;{clienteData.nome}&quot; na sua lista de clientes para uso futuro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { handleFinalSave(false); setIsConfirmSaveClientOpen(false); }}>
              Não, usar só neste orçamento
            </Button>
            <Button onClick={() => { handleFinalSave(true); setIsConfirmSaveClientOpen(false); }}>
              Sim, salvar cliente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
