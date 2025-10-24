
'use client';

import React, { useState, useMemo, useEffect, FormEvent, useRef, useCallback } from 'react';
import type { MaterialItem, OrcamentoItem, EmpresaData, ClienteData, Orcamento } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableTotalFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, AlertTriangle, FileText, Eraser, Pencil, MessageCircle, History, CheckCircle2, XCircle, Search, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatNumber, maskCpfCnpj, maskTelefone } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getMateriais } from '@/services/materiaisService';
import { getClientes } from '@/services/clientesService';
import { getEmpresaData } from '@/services/empresaService';
import { addOrcamento, deleteOrcamento, getOrcamentos, updateOrcamentoStatus, getNextOrcamentoNumber } from '@/services/orcamentosService';

// Componente para o layout do PDF
const BudgetPDFLayout = ({ orcamento, empresa }: {
  orcamento: Orcamento | null,
  empresa: EmpresaData | null,
}) => {
    if (!orcamento) return null;
    return (
      <div className="p-8 font-sans text-foreground bg-background">
        <header className="flex justify-between items-start pb-4 border-b-2 border-border mb-4">
          <div className="flex items-start gap-4">
            {empresa?.logo && (
              <div className="flex-shrink-0 w-[80px] h-[80px]">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={empresa.logo} alt="Logo da Empresa" className="object-contain w-full h-full" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{empresa?.nome || 'Sua Empresa'}</h1>
              <p className="text-sm">{empresa?.endereco}</p>
              <p className="text-sm">{empresa?.telefone}</p>
              <p className="text-sm">{empresa?.cnpj}</p>
            </div>
          </div>
           <div className="text-right">
            <h2 className="text-xl font-semibold">Orçamento #{orcamento.numeroOrcamento}</h2>
            <p className="text-sm">Data: {new Date(orcamento.dataCriacao).toLocaleDateString('pt-BR')}</p>
            {orcamento.validadeDias && <p className="text-sm mt-1">Validade: {orcamento.validadeDias} dias</p>}
          </div>
        </header>

        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Cliente:</h3>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Nome:</span> {orcamento.cliente.nome}</p>
            {orcamento.cliente.cpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {orcamento.cliente.cpfCnpj}</p>}
            {orcamento.cliente.endereco && <p><span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}</p>}
            <p><span className="font-medium">Telefone:</span> {orcamento.cliente.telefone}</p>
            {orcamento.cliente.email && <p><span className="font-medium">Email:</span> {orcamento.cliente.email}</p>}
          </div>
        </section>

        <Table className="text-sm">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Item / Descrição</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Preço Unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orcamento.itens.map(item => (
              <TableRow key={item.id} className="even:bg-muted/20">
                <TableCell>{item.materialNome}</TableCell>
                <TableCell className="text-right">{formatNumber(item.quantidade, 2)} {item.unidade}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.precoUnitario)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.precoVenda)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableTotalFooter>
            <TableRow className="bg-muted font-bold text-base">
              <TableCell colSpan={3} className="text-right">TOTAL</TableCell>
              <TableCell className="text-right">{formatCurrency(orcamento.totalVenda)}</TableCell>
            </TableRow>
          </TableTotalFooter>
        </Table>
      </div>
    )
};


export default function OrcamentoPage() {
  const [user, loadingAuth] = useAuthState(auth);
  
  const [materiais, setMateriais] = useState<MaterialItem[]>([]);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [orcamentosSalvos, setOrcamentosSalvos] = useState<Orcamento[]>([]);
  
  const [orcamentoItens, setOrcamentoItens] = useState<OrcamentoItem[]>([]);
  
  const [isLoading, setIsLoading] = useState({
      materiais: true,
      clientes: true,
      empresa: true,
      orcamentos: true
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [novoItem, setNovoItem] = useState({ materialId: '', quantidade: '', margemLucro: '0' });
  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [margemLucroStr, setMargemLucroStr] = useState('0');

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [editingQuantidadeStr, setEditingQuantidadeStr] = useState('');
  const [editingMargemLucroStr, setEditingMargemLucroStr] = useState('0');

  const [clienteData, setClienteData] = useState<Omit<ClienteData, 'userId'>>({ id: undefined, nome: '', endereco: '', telefone: '', email: '', cpfCnpj: ''});
  const [validadeDias, setValidadeDias] = useState('7');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pdfBudget, setPdfBudget] = useState<Orcamento | null>(null);

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    
    if(isRefresh) setIsRefreshing(true);

    setIsLoading(prev => ({...prev, materiais: true, clientes: true, empresa: true, orcamentos: true}));

    try {
        const [materiaisData, clientesData, empresaData, orcamentosData] = await Promise.all([
            getMateriais(user.uid),
            getClientes(user.uid),
            getEmpresaData(user.uid),
            getOrcamentos(user.uid)
        ]);
        setMateriais(materiaisData);
        setClientes(clientesData);
        setEmpresa(empresaData);
        setOrcamentosSalvos(orcamentosData);
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast({ title: 'Erro ao carregar dados do servidor', variant: 'destructive' });
    } finally {
        setIsLoading({ materiais: false, clientes: false, empresa: false, orcamentos: false });
        if(isRefresh) setIsRefreshing(false);
    }
  }, [user, toast]);
  
  useEffect(() => {
    if (user) {
      fetchAllData();
    } else if (!loadingAuth) {
      // Clear data if user logs out
      setMateriais([]);
      setClientes([]);
      setOrcamentosSalvos([]);
      setEmpresa(null);
      setIsLoading({ materiais: false, clientes: false, empresa: false, orcamentos: false });
    }
  }, [user, loadingAuth, fetchAllData]);


  const filteredOrcamentos = useMemo(() => {
    if (!searchTerm) {
      return orcamentosSalvos;
    }
    return orcamentosSalvos.filter(orcamento =>
      orcamento.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (orcamento.numeroOrcamento && orcamento.numeroOrcamento.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orcamentosSalvos, searchTerm]);
  
  const selectedMaterial = useMemo(() => {
    return materiais.find(m => m.id === novoItem.materialId);
  }, [materiais, novoItem.materialId]);
  
  const totalCusto = useMemo(() => orcamentoItens.reduce((sum, item) => sum + item.total, 0), [orcamentoItens]);
  const totalVenda = useMemo(() => orcamentoItens.reduce((sum, item) => sum + item.precoVenda, 0), [orcamentoItens]);

  const handleNovoItemChange = (field: keyof typeof novoItem, value: string) => {
    if (field === 'quantidade') {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setQuantidadeStr(sanitizedValue);
        setNovoItem(prev => ({ ...prev, [field]: sanitizedValue.replace(',', '.') }));
    } else if (field === 'margemLucro') {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setMargemLucroStr(sanitizedValue);
        setNovoItem(prev => ({ ...prev, [field]: sanitizedValue.replace(',', '.') }));
    } else {
        setNovoItem(prev => ({ ...prev, [field]: value }));
    }
  };
  
  const handleClienteDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cpfCnpj') finalValue = maskCpfCnpj(value);
    else if (name === 'telefone') finalValue = maskTelefone(value);
    setClienteData(prev => ({...prev, [name]: finalValue}));
  };

  const addLinha = () => {
    if (!selectedMaterial) {
      toast({ title: 'Seleção necessária', description: 'Por favor, selecione um item ou serviço.', variant: 'destructive' });
      return;
    }

    const { precoUnitario, id: materialId, descricao, unidade } = selectedMaterial;
    
    const numMargemLucro = parseFloat(novoItem.margemLucro.replace(',', '.')) || 0;
    const numQuantidade = parseFloat(novoItem.quantidade.replace(/[^0-9,]/g, '').replace(',', '.'));
    
    if (isNaN(numQuantidade) || numQuantidade <= 0 || precoUnitario === null) {
      toast({ title: 'Valores inválidos', description: 'Preencha a Quantidade e verifique os dados do item.', variant: 'destructive' });
      return;
    }

    const custoFinal = precoUnitario * numQuantidade;
    const precoVenda = custoFinal * (1 + numMargemLucro / 100);

    const novoOrcamentoItem: OrcamentoItem = { 
      id: crypto.randomUUID(), 
      materialId, 
      materialNome: descricao, 
      unidade,
      quantidade: numQuantidade, 
      precoUnitario,
      total: custoFinal, 
      margemLucro: numMargemLucro,
      precoVenda,
    };

    setOrcamentoItens(prev => [...prev, novoOrcamentoItem]);
    setNovoItem(prev => ({ ...prev, materialId: '', quantidade: '' }));
    setQuantidadeStr('');
    toast({ title: 'Sucesso', description: 'Item adicionado ao orçamento.' });
  };

  const removeLinha = (id: string) => {
    setOrcamentoItens(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Item Removido', variant: 'destructive' });
  };

  const limparValores = () => {
    setOrcamentoItens([]);
    toast({ title: 'Tabela Limpa' });
  };

  const handleMargemLucroChange = (id: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9,]/g, '');
    setOrcamentoItens(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newMargin = parseFloat(sanitizedValue.replace(',', '.')) || 0;
          const newPrecoVenda = item.total * (1 + newMargin / 100);
          return { ...item, margemLucro: newMargin, precoVenda: newPrecoVenda };
        }
        return item;
      })
    );
  };
  
  const handleSaveBudgetClick = () => {
    setClienteData({ id: undefined, nome: '', endereco: '', telefone: '', email: '', cpfCnpj: ''});
    setValidadeDias('7');
    setIsSaveModalOpen(true);
  }

  const handleConfirmSave = async () => {
    if (!user) { toast({ title: "Usuário não autenticado", variant: "destructive" }); return; }
    if (!clienteData.nome) { toast({ title: "Nome do cliente é obrigatório.", variant: "destructive" }); return; }
    
    setIsSubmitting(true);
    try {
        const numeroOrcamento = await getNextOrcamentoNumber(user.uid);
        
        const newBudget: Omit<Orcamento, 'id'> = {
            userId: user.uid,
            numeroOrcamento,
            cliente: { ...clienteData, userId: user.uid },
            itens: orcamentoItens,
            totalVenda: totalVenda,
            dataCriacao: new Date().toISOString(),
            status: 'Pendente',
            validadeDias: validadeDias
        };

        await addOrcamento(newBudget);
        limparValores();
        setIsSaveModalOpen(false);
        await fetchAllData(true); // Refresh all data, including orcamentos
        toast({ title: `Orçamento ${numeroOrcamento} salvo com sucesso!` });
    } catch(error) {
        toast({ title: "Erro ao salvar orçamento", variant: "destructive" });
        console.error("Erro ao salvar:", error);
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleUpdateStatus = async (budgetId: string, status: 'Aceito' | 'Recusado') => {
    try {
        await updateOrcamentoStatus(budgetId, status);
        await fetchAllData(true); // Refresh all data
        toast({ title: `Orçamento ${status.toLowerCase()}!` });

        if (status === 'Aceito') {
            const acceptedBudget = orcamentosSalvos.find(b => b.id === budgetId);
            if (acceptedBudget) {
                handleSendAcceptanceWhatsApp(acceptedBudget);
            }
        }
    } catch(error) {
        toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  }

  const handleSendAcceptanceWhatsApp = (orcamento: Orcamento) => {
     if (!empresa?.telefone) {
      toast({ title: "Telefone da empresa não configurado.", description: "Vá para 'Dados da Empresa' para adicionar.", variant: "destructive" });
      return;
    }
    const companyPhone = empresa.telefone.replace(/\D/g, '');

    let mensagem = `✅ *Orçamento Aceito!*\n\n`;
    mensagem += `*Nº do Orçamento:* ${orcamento.numeroOrcamento}\n`;
    mensagem += `*Cliente:* ${orcamento.cliente.nome}\n`;
    if (orcamento.cliente.telefone) mensagem += `*Tel. Cliente:* ${orcamento.cliente.telefone}\n`;
    if (orcamento.cliente.endereco) mensagem += `*Endereço:* ${orcamento.cliente.endereco}\n`;
    mensagem += `*Valor Total:* ${formatCurrency(orcamento.totalVenda)}\n\n`;
    mensagem += `*Itens do Serviço:*\n`;
    orcamento.itens.forEach(item => {
      let linha = `- ${item.materialNome} (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade})`;
      mensagem += `${linha}\n`;
    });
    
    const urlWhatsApp = `https://wa.me/55${companyPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
  };

  const handleGerarPDF = async (orcamento: Orcamento) => {
    setPdfBudget(orcamento);
    await new Promise(resolve => setTimeout(resolve, 100)); // Aguarda a renderização do PDF

    const pdfElement = pdfRef.current;
    if (!pdfElement) return;

    const canvas = await html2canvas(pdfElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    const width = pdfWidth;
    const height = width / ratio;
    
    let yPos = 0;
    if (height < pdfHeight) yPos = (pdfHeight - height) / 2;

    pdf.addImage(imgData, 'PNG', 0, yPos, width, height);
    pdf.save(`orcamento-${orcamento.cliente.nome.toLowerCase().replace(/ /g, '_')}-${orcamento.numeroOrcamento}.pdf`);
    setPdfBudget(null);
  };
  
  const handleEnviarWhatsApp = (orcamento: Orcamento) => {
    const telefoneLimpo = orcamento.cliente.telefone.replace(/\D/g, '');
    if (!telefoneLimpo) {
        toast({ title: 'Telefone do Cliente inválido.', variant: 'destructive' });
        return;
    }

    let mensagem = `*Orçamento de ${empresa?.nome || 'Serviços'}*\n\n`;
    mensagem += `*Nº do Orçamento:* ${orcamento.numeroOrcamento}\n\n`;
    mensagem += `Olá, *${orcamento.cliente.nome}*!\n`;
    mensagem += `Segue o seu orçamento:\n\n`;

    orcamento.itens.forEach(item => {
      let linha = `*- ${item.materialNome}*`;
      linha += ` (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade})`;
      linha += ` - *${formatCurrency(item.precoVenda)}*\n`;
      mensagem += linha;
    });

    mensagem += `\n*VALOR TOTAL: ${formatCurrency(orcamento.totalVenda)}*\n\n`;
    if (orcamento.validadeDias) {
      mensagem += `_Proposta válida por ${orcamento.validadeDias} dias._\n\n`;
    }
    
    const urlWhatsApp = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
  };

  const handleEditClick = (item: OrcamentoItem) => {
    setEditingItem({ ...item });
    setEditingQuantidadeStr(String(item.quantidade).replace('.', ','));
    setEditingMargemLucroStr(String(item.margemLucro).replace('.', ','));
    setIsEditModalOpen(true);
  };
  
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingItem) return;
    const { name, value } = e.target;
    
    if (name === 'quantidade') {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setEditingQuantidadeStr(sanitizedValue);
    } else if (name === 'margemLucro') {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setEditingMargemLucroStr(sanitizedValue);
    }
  };

  const handleSalvarEdicao = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const numQuantidade = parseFloat(editingQuantidadeStr.replace(/[^0-9,]/g, '').replace(',', '.'));
    const numMargemLucro = parseFloat(editingMargemLucroStr.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;

    if (isNaN(numQuantidade) || numQuantidade <= 0) {
        toast({ title: 'Quantidade inválida', variant: 'destructive' }); return;
    }
    
    const custoFinal = editingItem.precoUnitario * numQuantidade;
    const precoVendaCalculado = custoFinal * (1 + numMargemLucro / 100);

    const itemAtualizado: OrcamentoItem = { 
        ...editingItem,
        quantidade: numQuantidade,
        margemLucro: numMargemLucro,
        total: custoFinal, 
        precoVenda: precoVendaCalculado 
    };
    
    setOrcamentoItens(prev => prev.map(item => item.id === itemAtualizado.id ? itemAtualizado : item));
    setIsEditModalOpen(false);
    setEditingItem(null);
    toast({ title: 'Item atualizado com sucesso.' });
  };
  
  const getStatusBadgeVariant = (status: Orcamento['status']): "default" | "destructive" | "secondary" => {
    switch (status) {
        case 'Aceito': return 'default';
        case 'Recusado': return 'destructive';
        case 'Pendente': return 'secondary';
        default: return 'secondary';
    }
  }
  
  const handleRemoverOrcamento = async (id: string) => {
    try {
        await deleteOrcamento(id);
        await fetchAllData(true); // Refresh
        toast({
            title: 'Orçamento Excluído',
            variant: 'destructive',
        });
    } catch(error) {
        toast({ title: 'Erro ao excluir orçamento', variant: 'destructive'});
    }
  };

  const carregarOrcamentoParaEdicao = async (orcamento: Orcamento) => {
    try {
        // Remove do histórico para que possa ser salvo novamente
        await deleteOrcamento(orcamento.id);
        
        // Carrega os dados para a área de criação
        setOrcamentoItens(orcamento.itens);
        setClienteData(orcamento.cliente);
        setValidadeDias(orcamento.validadeDias);
        setMargemLucroStr(orcamento.itens[0]?.margemLucro.toString() || '0');
        
        await fetchAllData(true); // Refresh
        
        toast({
            title: 'Orçamento Carregado para Edição',
            description: 'Faça suas alterações e salve novamente. O orçamento original foi removido do histórico.',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        toast({ title: 'Erro ao carregar orçamento para edição.', variant: 'destructive'});
        // Se der erro ao apagar, não carrega os dados para evitar duplicidade
    }
  };
  
  const anyLoading = loadingAuth || Object.values(isLoading).some(Boolean);
  const showPrerequisitesAlert = !anyLoading && (materiais.length === 0 || !empresa?.nome);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Orçamento</CardTitle>
           <div className="flex flex-wrap gap-2 pt-4">
              <Button onClick={handleSaveBudgetClick} className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={orcamentoItens.length === 0 || showPrerequisitesAlert || anyLoading}><FileText className="mr-2"/> Salvar Orçamento</Button>
              <Button onClick={limparValores} variant="destructive" disabled={orcamentoItens.length === 0 || showPrerequisitesAlert || anyLoading}><Eraser className="mr-2"/> Limpar Itens</Button>
           </div>
        </CardHeader>
        <CardContent>
          {anyLoading ? (
             <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></div>
          ) : showPrerequisitesAlert ? (
            <div className="space-y-4">
              {materiais.length === 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Nenhum Item ou Serviço Cadastrado</AlertTitle>
                  <AlertDescription>
                    Você precisa cadastrar itens ou serviços antes de criar um orçamento. 
                    <Button asChild variant="link" className="p-1 h-auto"><Link href="/dashboard/materiais">Cadastrar Itens</Link></Button>
                  </AlertDescription>
                </Alert>
              )}
              {!empresa?.nome && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dados da Empresa Incompletos</AlertTitle>
                  <AlertDescription>
                    Você precisa preencher os dados da sua empresa para gerar orçamentos.
                    <Button asChild variant="link" className="p-1 h-auto"><Link href="/dashboard/empresa">Preencher Dados da Empresa</Link></Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg items-end">
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
                    <div><Label htmlFor="quantidade">Quantidade ({selectedMaterial.unidade})</Label><Input id="quantidade" type="text" inputMode='decimal' placeholder="Ex: 1,5" value={quantidadeStr} onChange={e => handleNovoItemChange('quantidade', e.target.value)} /></div>
                    <div><Label htmlFor="margem-lucro">Acréscimo (%)</Label><Input id="margem-lucro" type="text" inputMode='decimal' placeholder="Ex: 10" value={margemLucroStr} onChange={e => handleNovoItemChange('margemLucro', e.target.value)} /></div>
                    <div className="lg:col-span-1"><Button onClick={addLinha} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Adicionar</Button></div>
                  </>
                )}
              </div>

              {orcamentoItens.length > 0 && (
                 <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Item / Descrição</TableHead>
                                    <TableHead className="text-right">Qtd.</TableHead>
                                    <TableHead className="text-right">Preço Unit.</TableHead>
                                    <TableHead className="text-right">Custo Total</TableHead>
                                    <TableHead className="w-[120px] text-right">Acréscimo (%)</TableHead>
                                    <TableHead className="text-right font-bold text-primary">Preço Venda</TableHead>
                                    <TableHead className="text-center">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {orcamentoItens.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.materialNome}</TableCell>
                                    <TableCell className="text-right">{formatNumber(item.quantidade, 2)} {item.unidade}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.precoUnitario)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                                    <TableCell className="text-right">
                                        <Input type="text" inputMode='decimal' value={String(item.margemLucro).replace('.',',')} onChange={(e) => handleMargemLucroChange(item.id, e.target.value)} className="text-right min-w-[80px]" />
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-primary">{formatCurrency(item.precoVenda)}</TableCell>
                                    <TableCell className="flex justify-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => removeLinha(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                            <TableTotalFooter>
                                <TableRow className="bg-muted/50 font-bold text-base">
                                    <TableCell colSpan={3}>TOTAL</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalCusto)}</TableCell>
                                    <TableCell />
                                    <TableCell className="text-right text-primary">{formatCurrency(totalVenda)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableTotalFooter>
                        </Table>
                    </div>
                    
                    {/* Mobile Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {orcamentoItens.map(item => (
                            <Card key={item.id} className="p-0">
                                <CardHeader className="flex flex-row items-center justify-between p-4">
                                    <div>
                                        <CardTitle className="text-base">{item.materialNome}</CardTitle>
                                        <CardDescription>{formatNumber(item.quantidade, 2)} {item.unidade} x {formatCurrency(item.precoUnitario)}</CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => removeLinha(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div><p className="text-muted-foreground">Custo Total</p><p>{formatCurrency(item.total)}</p></div>
                                    <div>
                                        <Label htmlFor={`margem-lucro-mobile-${item.id}`} className="text-muted-foreground">Acréscimo (%)</Label>
                                        <Input id={`margem-lucro-mobile-${item.id}`} type="text" inputMode='decimal' value={String(item.margemLucro).replace('.',',')} onChange={(e) => handleMargemLucroChange(item.id, e.target.value)} className="h-9"/>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 pt-2 bg-muted/50 flex justify-between items-center">
                                    <p className="font-bold">Preço Venda</p>
                                    <p className="font-bold text-primary text-lg">{formatCurrency(item.precoVenda)}</p>
                                </CardFooter>
                            </Card>
                        ))}
                        <Card className="bg-muted">
                            <CardHeader className="p-4 pb-2"><CardTitle className="text-lg">Totais do Orçamento</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0 space-y-2">
                                <div className="flex justify-between items-center font-bold">
                                    <p>Custo Total</p>
                                    <p>{formatCurrency(totalCusto)}</p>
                                </div>
                                <div className="flex justify-between items-center font-bold text-primary text-lg">
                                    <p>Venda Total</p>
                                    <p>{formatCurrency(totalVenda)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {!anyLoading && (orcamentosSalvos.length > 0 || searchTerm) && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-6 w-6"/> Histórico de Orçamentos</CardTitle>
                <CardDescription>Gerencie os orçamentos salvos, aprove, recuse e envie para seus clientes.</CardDescription>
                <div className="flex items-center gap-2 pt-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por cliente ou nº do orçamento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => fetchAllData(true)} disabled={isRefreshing}>
                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {filteredOrcamentos.length > 0 ? (
                  filteredOrcamentos.map(orcamento => (
                    <Card key={orcamento.id} className="overflow-hidden">
                        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                            <div>
                                <CardTitle className="text-xl">{orcamento.cliente.nome}</CardTitle>
                                <CardDescription>
                                    <span className="font-semibold">#{orcamento.numeroOrcamento}</span> - {new Date(orcamento.dataCriacao).toLocaleDateString('pt-BR')} - <span className="font-bold text-primary">{formatCurrency(orcamento.totalVenda)}</span>
                                </CardDescription>
                            </div>
                            <Badge variant={getStatusBadgeVariant(orcamento.status)} className="text-sm">{orcamento.status}</Badge>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qtd.</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orcamento.itens.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.materialNome}</TableCell>
                                            <TableCell className="text-right">{formatNumber(item.quantidade)} {item.unidade}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.precoVenda)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="flex flex-wrap justify-end gap-2 bg-muted/50 p-4">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Carregar Orçamento para Edição?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação irá carregar os itens deste orçamento no editor acima, substituindo quaisquer itens não salvos. O orçamento atual será removido do histórico para que você possa salvá-lo novamente após a edição.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => carregarOrcamentoParaEdicao(orcamento)}>Sim, Carregar e Editar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza que deseja excluir este orçamento permanentemente? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleRemoverOrcamento(orcamento.id)}>Sim, Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button variant="secondary" size="sm" onClick={() => handleGerarPDF(orcamento)}><FileText className="mr-2"/>Gerar PDF</Button>
                            <Button variant="secondary" size="sm" onClick={() => handleEnviarWhatsApp(orcamento)} disabled={!orcamento.cliente.telefone}><MessageCircle className="mr-2"/>Enviar Proposta</Button>
                            
                            {orcamento.status === 'Pendente' && (
                                <>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm"><XCircle className="mr-2"/>Recusar</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar Recusa</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Tem certeza de que deseja recusar este orçamento? Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleUpdateStatus(orcamento.id, 'Recusado')}>Sim, Recusar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 className="mr-2"/>Aceitar</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar Aceite</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Ao aceitar, o status será atualizado e uma notificação será preparada para envio via WhatsApp para sua empresa.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={() => handleUpdateStatus(orcamento.id, 'Aceito')}>Sim, Aceitar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </CardFooter>
                    </Card>
                  ))
                ) : (
                    <p className="text-center text-muted-foreground py-4">Nenhum orçamento encontrado para sua busca.</p>
                )}
            </CardContent>
        </Card>
      )}

      {/* DIALOGS */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Salvar Orçamento</DialogTitle>
            <DialogDescription>
              Selecione um cliente existente ou preencha os dados para salvar o orçamento no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="cliente-select">Cliente Salvo</Label>
                <Select onValueChange={(clientId) => {
                    const selected = clientes.find(c => c.id === clientId);
                    if (selected) setClienteData(selected);
                }}>
                    <SelectTrigger id="cliente-select">
                        <SelectValue placeholder="Selecionar cliente da lista..." />
                    </SelectTrigger>
                    <SelectContent>
                        {clientes.map(c => <SelectItem key={c.id} value={c.id!}>{c.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou preencha manualmente</span></div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente-nome">Nome</Label>
              <Input id="cliente-nome" name="nome" value={clienteData.nome} onChange={handleClienteDataChange} required/>
            </div>
             <div className="space-y-2">
              <Label htmlFor="cliente-cpfCnpj">CPF/CNPJ</Label>
              <Input id="cliente-cpfCnpj" name="cpfCnpj" value={clienteData.cpfCnpj || ''} onChange={handleClienteDataChange} placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente-endereco">Endereço</Label>
              <Input id="cliente-endereco" name="endereco" value={clienteData.endereco} onChange={handleClienteDataChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="cliente-telefone">Telefone</Label>
              <Input id="cliente-telefone" name="telefone" value={clienteData.telefone} onChange={handleClienteDataChange} placeholder="(DD) XXXXX-XXXX"/>
            </div>
             <div className="space-y-2">
              <Label htmlFor="cliente-email">Email</Label>
              <Input id="cliente-email" name="email" type="email" value={clienteData.email || ''} onChange={handleClienteDataChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validade-dias">Validade da Proposta (dias)</Label>
              <Input id="validade-dias" type="number" value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)} placeholder="Ex: 7" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmSave} type="button" className="w-full" disabled={!clienteData.nome || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <History className="mr-2 h-4 w-4" /> Confirmar e Salvar no Histórico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item do Orçamento</DialogTitle>
            <DialogDescription>
              Ajuste a quantidade e o acréscimo do item selecionado.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4 py-4">
              <div><Label htmlFor="edit-quantidade">Quantidade ({editingItem.unidade})</Label><Input id="edit-quantidade" name="quantidade" type="text" inputMode='decimal' value={editingQuantidadeStr} onChange={handleEditFormChange}/></div>
              <div><Label htmlFor="edit-margemLucro">Acréscimo (%)</Label><Input id="edit-margemLucro" name="margemLucro" type="text" inputMode='decimal' value={editingMargemLucroStr} onChange={handleEditFormChange}/></div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="absolute -z-10 -left-[9999px] top-0">
          <div ref={pdfRef} className="w-[595px]">
              {<BudgetPDFLayout orcamento={pdfBudget} empresa={empresa} />}
          </div>
      </div>
    </div>
  );
}
