
'use client';

import React, { useState, useMemo, useRef } from 'react';
import type { MaterialItem, ClienteData, Orcamento, OrcamentoItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableTotalFooter } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, PlusCircle, Trash2, Pencil, ArrowLeft, ArrowRight, FileText, ArrowRightLeft, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatNumber, maskCpfCnpj, maskTelefone, maskCurrency, maskDecimal } from '@/lib/utils';
import { cn } from '@/lib/utils';
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

interface BudgetWizardProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    clientes: ClienteData[];
    materiais: MaterialItem[];
    onSaveBudget: (budget: Omit<Orcamento, 'id'>) => void;
}

export function BudgetWizard({ isOpen, onOpenChange, clientes, materiais, onSaveBudget }: BudgetWizardProps) {
    const [wizardStep, setWizardStep] = useState(1);
    const [orcamentoItens, setOrcamentoItens] = useState<OrcamentoItem[]>([]);
    const [clienteData, setClienteData] = useState<Omit<ClienteData, 'userId' | 'id'> & {id?: string; telefones: {nome: string, numero: string, principal?: boolean}[]}>({ id: undefined, nome: '', endereco: '', telefones: [{nome: 'Principal', numero: '', principal: true}], email: '', cpfCnpj: ''});
    const [validadeDias, setValidadeDias] = useState('7');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const quantidadeInputRef = useRef<HTMLInputElement>(null);
    
    const [novoItem, setNovoItem] = useState({ materialId: '', quantidade: '', margemLucro: '' });
    const [quantidadeStr, setQuantidadeStr] = useState('');
    const [margemLucroStr, setMargemLucroStr] = useState('');
    
    const [isAddingAvulso, setIsAddingAvulso] = useState(false);
    const [itemAvulso, setItemAvulso] = useState({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
    const [itemAvulsoPrecoStr, setItemAvulsoPrecoStr] = useState('');

    const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
    const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

    const [isConfirmSaveClientOpen, setIsConfirmSaveClientOpen] = useState(false);
    const [clientToSave, setClientToSave] = useState<Omit<ClienteData, 'id' | 'userId'> & { id?: string } | null>(null);
    
    const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);

    const selectedMaterial = useMemo(() => {
        return materiais.find(m => m.id === novoItem.materialId);
    }, [materiais, novoItem.materialId]);
    
    const totalVenda = useMemo(() => orcamentoItens.reduce((sum, item) => sum + item.precoVenda, 0), [orcamentoItens]);

    const resetWizard = () => {
        setWizardStep(1);
        setOrcamentoItens([]);
        setClienteData({ id: undefined, nome: '', endereco: '', telefones: [{nome: 'Principal', numero: '', principal: true}], email: '', cpfCnpj: ''});
        setValidadeDias('7');
        setIsAddingAvulso(false);
        setNovoItem({ materialId: '', quantidade: '', margemLucro: '' });
        setQuantidadeStr('');
        setMargemLucroStr('');
        setItemAvulso({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
        setItemAvulsoPrecoStr('');
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resetWizard();
        }
        onOpenChange(open);
    };
    
    const handleClienteDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'cpfCnpj') finalValue = maskCpfCnpj(value);
        setClienteData(prev => ({...prev, [name]: finalValue}));
    };

    const handleClientTelefoneChange = (index: number, field: 'nome' | 'numero', value: string) => {
        const maskedValue = field === 'numero' ? maskTelefone(value) : value;
    
        setClienteData(prev => {
            if (!prev) return prev;
            const novosTelefones = [...(prev.telefones || [])];
            novosTelefones[index] = { ...novosTelefones[index], [field]: maskedValue, principal: novosTelefones[index].principal };
            return { ...prev, telefones: novosTelefones };
        });
    };
    
    const handlePrincipalTelefoneChange = (selectedIndex: number) => {
        setClienteData(prev => {
            if (!prev) return prev;
            const novosTelefones = (prev.telefones || []).map((tel, index) => ({
                ...tel,
                principal: index === selectedIndex,
            }));
            return { ...prev, telefones: novosTelefones };
        });
    };

    const handleClientAddTelefone = () => {
        setClienteData(prev => ({
            ...prev,
            telefones: [...(prev.telefones || []), { nome: '', numero: '', principal: false }]
        }));
    };
    
    const handleClientRemoveTelefone = (index: number) => {
        setClienteData(prev => {
            if (!prev.telefones || prev.telefones.length <= 1) {
                toast({ title: "Ação não permitida", description: "Deve haver pelo menos um número de telefone.", variant: "destructive" });
                return prev;
            }
            const novosTelefones = prev.telefones.filter((_, i) => i !== index);
            if (!novosTelefones.some(t => t.principal)) {
                novosTelefones[0].principal = true;
            }
            return { ...prev, telefones: novosTelefones };
        });
    };

    const handleNovoItemChange = (field: keyof typeof novoItem, value: string) => {
        if (field === 'materialId') {
            setNovoItem(prev => ({ ...prev, [field]: value }));
            setTimeout(() => quantidadeInputRef.current?.focus(), 0);
        } else if (field === 'quantidade') {
            const masked = maskDecimal(value);
            setQuantidadeStr(masked);
            setNovoItem(prev => ({ ...prev, [field]: masked.replace(',', '.') }));
        } else if (field === 'margemLucro') {
            const masked = maskDecimal(value);
            setMargemLucroStr(masked);
            setNovoItem(prev => ({ ...prev, [field]: masked.replace(',', '.') }));
        }
    };

    const addLinha = () => {
        if (!selectedMaterial) {
          toast({ title: 'Seleção necessária', description: 'Por favor, selecione um item ou serviço.', variant: 'destructive' });
          return;
        }
        const { precoUnitario, id: materialId, descricao, unidade, tipo, quantidade: estoqueAtual, quantidadeMinima } = selectedMaterial;
        const numMargemLucro = parseFloat(novoItem.margemLucro.replace(',', '.')) || 0;
        const numQuantidade = parseFloat(novoItem.quantidade.replace(/[^0-9,]/g, '').replace(',', '.'));
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
          id: crypto.randomUUID(), materialId, materialNome: descricao, unidade,
          quantidade: numQuantidade, precoUnitario, total: custoFinal, 
          margemLucro: numMargemLucro, precoVenda,
        };
        setOrcamentoItens(prev => [...prev, novoOrcamentoItem]);
        setNovoItem({ materialId: '', quantidade: '', margemLucro: '' });
        setQuantidadeStr('');
        setMargemLucroStr('');
    };
    
    const addLinhaAvulsa = () => {
        const { descricao, quantidade, unidade } = itemAvulso;
        const numQuantidade = parseFloat(quantidade.replace(',', '.')) || 1;
        const numPrecoFinal = parseFloat(itemAvulsoPrecoStr.replace(/\D/g, '')) / 100;
    
        if (!descricao.trim()) { toast({ title: "Descrição obrigatória", variant: "destructive" }); return; }
        if (isNaN(numQuantidade) || numQuantidade <= 0) { toast({ title: "Quantidade inválida", variant: "destructive" }); return; }
        if (isNaN(numPrecoFinal) || numPrecoFinal <= 0) { toast({ title: "Preço inválido", variant: "destructive" }); return; }
    
        const novoOrcamentoItem: OrcamentoItem = {
          id: crypto.randomUUID(),
          materialId: 'avulso-' + crypto.randomUUID(),
          materialNome: descricao,
          unidade: unidade || 'un',
          quantidade: numQuantidade,
          precoUnitario: numPrecoFinal / numQuantidade,
          total: numPrecoFinal,
          margemLucro: 0,
          precoVenda: numPrecoFinal,
        };
    
        setOrcamentoItens(prev => [...prev, novoOrcamentoItem]);
        
        setItemAvulso({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
        setItemAvulsoPrecoStr('');
        setIsAddingAvulso(false);
    };

    const removeLinha = (id: string) => {
        setOrcamentoItens(prev => prev.filter(i => i.id !== id));
    };

    const handleEditItemClick = (item: OrcamentoItem) => {
        setEditingItem({ ...item });
        setIsEditItemModalOpen(true);
    };

    const handleSaveItemEdit = (itemAtualizado: OrcamentoItem) => {
        setOrcamentoItens(prev => prev.map(item => item.id === itemAtualizado.id ? itemAtualizado : item));
        setIsEditItemModalOpen(false);
        setEditingItem(null);
        toast({ title: 'Item atualizado.' });
    };
    
    const handleConfirmSave = () => {
        if (orcamentoItens.length === 0) { toast({ title: "Orçamento vazio", variant: "destructive" }); return; }
        if (!clienteData.nome) { toast({ title: "Cliente não informado", variant: "destructive" }); return; }
        setIsSubmitting(true);
        
        const normalizedNewClientName = clienteData.nome.trim().toLowerCase();
        const existingClient = clientes.find(c => c.nome.trim().toLowerCase() === normalizedNewClientName);
    
        if (existingClient) {
            const budgetData = {
                userId: '', // será preenchido na função pai
                numeroOrcamento: '', // será gerado na função pai
                cliente: existingClient,
                itens: orcamentoItens,
                totalVenda,
                dataCriacao: new Date().toISOString(),
                status: "Pendente" as const,
                validadeDias,
                dataAceite: null,
                dataRecusa: null,
            };
            onSaveBudget(budgetData);
            setIsSubmitting(false);
        } else {
            setClientToSave({ ...clienteData });
            setIsConfirmSaveClientOpen(true);
        }
    };
    
    const handleConfirmSaveClientDialog = (shouldSave: boolean) => {
        setIsConfirmSaveClientOpen(false);
        if (!clientToSave) { setIsSubmitting(false); return; };

        let finalClientData = { ...clientToSave };
        if (!shouldSave) {
            finalClientData.id = `temp_${crypto.randomUUID()}`;
        }
        
        const budgetData = {
            userId: '', 
            numeroOrcamento: '',
            cliente: finalClientData,
            itens: orcamentoItens,
            totalVenda,
            dataCriacao: new Date().toISOString(),
            status: "Pendente" as const,
            validadeDias,
            dataAceite: null,
            dataRecusa: null,
        };
        onSaveBudget(budgetData);
        setIsSubmitting(false);
        setClientToSave(null);
    };
    
    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent 
                    className="max-w-4xl max-h-[90vh] flex flex-col"
                    onPointerDownOutside={(e) => {
                    if (Capacitor.isNativePlatform()) e.preventDefault();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Novo Orçamento - Etapa {wizardStep} de 2</DialogTitle>
                        <DialogDescription>
                        {wizardStep === 1 ? "Preencha ou selecione os dados do cliente para o orçamento." : "Adicione os itens ou serviços que farão parte do orçamento."}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {wizardStep === 1 && (
                        <div className="flex-grow overflow-y-auto p-1 pr-4">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Selecione o Cliente</h3>
                                <div className="space-y-2">
                                <Label htmlFor="cliente-select">Cliente Salvo</Label>
                                <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={isClientPopoverOpen}
                                            className="w-full justify-between"
                                        >
                                            {clienteData.id
                                                ? clientes.find((c) => c.id === clienteData.id)?.nome
                                                : "Selecionar cliente..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar cliente..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {clientes.map((c) => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={c.nome}
                                                            onSelect={() => {
                                                                const client = clientes.find(cli => cli.id === c.id);
                                                                if (client) {
                                                                    setClienteData({
                                                                        id: client.id,
                                                                        nome: client.nome,
                                                                        endereco: client.endereco || '',
                                                                        telefones: client.telefones && client.telefones.length > 0 ? client.telefones : [{ nome: 'Principal', numero: '', principal: true }],
                                                                        email: client.email || '',
                                                                        cpfCnpj: client.cpfCnpj || ''
                                                                    });
                                                                }
                                                                setIsClientPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    clienteData.id === c.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {c.nome}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                </div>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou preencha manualmente</span></div>
                                </div>

                                <div className="space-y-2">
                                <Label htmlFor="cliente-nome">Nome</Label>
                                <Input id="cliente-nome" name="nome" value={clienteData.nome} onChange={handleClienteDataChange} required/>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-4">
                                    <Label>Telefones de Contato</Label>
                                    <RadioGroup
                                        value={clienteData.telefones?.findIndex(t => t.principal).toString() ?? "0"}
                                        onValueChange={(value) => handlePrincipalTelefoneChange(parseInt(value, 10))}
                                        className="space-y-2"
                                    >
                                        {(clienteData.telefones || []).map((tel, index) => (
                                        <div key={index} className="flex items-center gap-2 p-3 border rounded-md">
                                            <div className="flex items-center h-full">
                                            <RadioGroupItem value={index.toString()} id={`tel-principal-orc-${index}`} />
                                            </div>
                                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="sm:col-span-1">
                                                <Label htmlFor={`tel-nome-orc-${index}`} className="text-xs text-muted-foreground">Apelido</Label>
                                                <Input id={`tel-nome-orc-${index}`} value={tel.nome} onChange={(e) => handleClientTelefoneChange(index, 'nome', e.target.value)} placeholder="Ex: Principal" />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <Label htmlFor={`tel-numero-orc-${index}`} className="text-xs text-muted-foreground">Número</Label>
                                                <Input id={`tel-numero-orc-${index}`} value={tel.numero} onChange={(e) => handleClientTelefoneChange(index, 'numero', e.target.value)} placeholder="(DD) XXXXX-XXXX" />
                                            </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleClientRemoveTelefone(index)} disabled={!clienteData.telefones || clienteData.telefones.length <= 1}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        ))}
                                    </RadioGroup>
                                    <Label className="text-xs text-muted-foreground">Selecione o telefone principal para contato.</Label>
                                    <Button type="button" variant="outline" onClick={handleClientAddTelefone} className="w-full sm:w-auto">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Adicionar Telefone
                                    </Button>
                                </div>

                                <div className="space-y-2 md:col-span-2"><Label htmlFor="cliente-endereco">Endereço</Label><Input id="cliente-endereco" name="endereco" value={clienteData.endereco} onChange={handleClienteDataChange} /></div>
                                <div className="space-y-2"><Label htmlFor="cliente-cpfCnpj">CPF/CNPJ</Label><Input id="cliente-cpfCnpj" name="cpfCnpj" value={clienteData.cpfCnpj || ''} onChange={handleClienteDataChange} placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX" /></div>
                                <div className="space-y-2"><Label htmlFor="cliente-email">Email</Label><Input id="cliente-email" name="email" type="email" value={clienteData.email || ''} onChange={handleClienteDataChange} /></div>
                                <div className="space-y-2"><Label htmlFor="validade-dias">Validade da Proposta (dias)</Label><Input id="validade-dias" type="number" value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)} placeholder="Ex: 7" /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {wizardStep === 2 && (
                        <div className="flex-grow overflow-y-auto p-1 pr-4">
                            <div className="mb-6 p-4 border rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-muted-foreground">
                                        {isAddingAvulso ? 'Adicionar Item Avulso' : 'Adicionar Item'}
                                    </h4>
                                    <Button variant="outline" onClick={() => setIsAddingAvulso(!isAddingAvulso)}>
                                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                                        <span>{isAddingAvulso ? 'Item da Lista' : 'Item Avulso'}</span>
                                    </Button>
                                </div>
                                
                                {isAddingAvulso ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                    <div className="lg:col-span-2"><Label htmlFor="avulso-desc">Descrição</Label><Input id="avulso-desc" value={itemAvulso.descricao} onChange={e => setItemAvulso(p => ({...p, descricao: e.target.value}))} /></div>
                                    <div><Label htmlFor="avulso-qtd">Qtd.</Label><Input id="avulso-qtd" value={itemAvulso.quantidade} onChange={e => setItemAvulso(p => ({...p, quantidade: maskDecimal(e.target.value)}))} placeholder="1" /></div>
                                    <div>
                                        <Label htmlFor="avulso-un">Unidade</Label>
                                        <Select name="unidade" value={itemAvulso.unidade} onValueChange={(value) => setItemAvulso(p => ({...p, unidade: value}))}>
                                            <SelectTrigger id="avulso-un"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <Label htmlFor="avulso-preco">Preço Final (R$)</Label>
                                        <Input 
                                            id="avulso-preco" 
                                            value={itemAvulsoPrecoStr} 
                                            onChange={e => setItemAvulsoPrecoStr(maskCurrency(e.target.value))}
                                            placeholder="R$ 50,00" 
                                        />
                                    </div>
                                    <div className="lg:col-span-1"><Button onClick={addLinhaAvulsa} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Add Avulso</Button></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="material-select">Item / Serviço</Label>
                                        <Select value={novoItem.materialId} onValueChange={(val) => handleNovoItemChange('materialId', val)}>
                                        <SelectTrigger id="material-select"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {materiais.map(mat => (<SelectItem key={mat.id} value={mat.id}>{`${mat.descricao} (${formatCurrency(mat.precoUnitario)}/${mat.unidade})`}</SelectItem>))}
                                        </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedMaterial && (
                                        <>
                                        <div><Label htmlFor="quantidade">Qtd ({selectedMaterial.unidade})</Label><Input ref={quantidadeInputRef} id="quantidade" type="text" inputMode='decimal' placeholder="1,5" value={quantidadeStr} onChange={e => handleNovoItemChange('quantidade', e.target.value)} /></div>
                                        <div><Label htmlFor="margem-lucro">Acréscimo (%)</Label><Input id="margem-lucro" type="text" inputMode='decimal' placeholder="10" value={margemLucroStr} onChange={e => handleNovoItemChange('margem-lucro', e.target.value)} /></div>
                                        <div className="lg:col-span-1"><Button onClick={addLinha} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Add</Button></div>
                                        </>
                                    )}
                                    </div>
                                )}
                            </div>

                            {orcamentoItens.length > 0 && (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead className="text-right">Venda</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                            {orcamentoItens.map(item => (
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
                                            <TableTotalFooter>
                                                <TableRow className="bg-muted/50 font-bold text-base">
                                                    <TableCell colSpan={2}>TOTAL</TableCell>
                                                    <TableCell className="text-right text-primary">{formatCurrency(totalVenda)}</TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            </TableTotalFooter>
                                        </Table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-4 border-t">
                        {wizardStep > 1 && <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}><ArrowLeft className="mr-2" /> Voltar</Button>}
                        <div className="flex-grow"></div>
                        {wizardStep === 1 && <Button onClick={() => setWizardStep(2)} disabled={!clienteData.nome}><ArrowRight className="mr-2" /> Próximo</Button>}
                        {wizardStep === 2 && (
                            <Button onClick={handleConfirmSave} disabled={isSubmitting || orcamentoItens.length === 0}>
                                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2"/>} Salvar Orçamento
                            </Button>
                        )}
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

            <AlertDialog open={isConfirmSaveClientOpen} onOpenChange={setIsConfirmSaveClientOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Salvar novo cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                        O cliente &quot;{clientToSave?.nome}&quot; não está na sua lista. Deseja adicioná-lo para uso futuro?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => handleConfirmSaveClientDialog(false)}>Não, usar apenas uma vez</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleConfirmSaveClientDialog(true)}>Sim, salvar cliente</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    