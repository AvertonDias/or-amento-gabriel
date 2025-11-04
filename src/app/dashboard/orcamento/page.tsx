
'use client';

import React, { useState, useMemo, useEffect, FormEvent, useRef, useCallback } from 'react';
import type { MaterialItem, OrcamentoItem, EmpresaData, ClienteData, Orcamento } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableTotalFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, FileText, Pencil, MessageCircle, History, CheckCircle2, XCircle, Search, Loader2, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatNumber, maskCpfCnpj, maskTelefone } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getMateriais, updateEstoque } from '@/services/materiaisService';
import { getClientes } from '@/services/clientesService';
import { getEmpresaData } from '@/services/empresaService';
import { addOrcamento, deleteOrcamento, getOrcamentos, getNextOrcamentoNumber, updateOrcamento, updateOrcamentoStatus } from '@/services/orcamentosService';
import { addDays, parseISO, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


// Componente para o layout do PDF do Cliente
const BudgetPDFLayout = ({ orcamento, empresa }: {
  orcamento: Orcamento | null,
  empresa: EmpresaData | null,
}) => {
    if (!orcamento) return null;
    
    const dataCriacao = parseISO(orcamento.dataCriacao);
    const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
    const dataValidade = !isNaN(validadeDiasNum) ? addDays(dataCriacao, validadeDiasNum) : null;

    return (
      <div className="p-8 font-sans bg-white text-black text-base">
        <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200 mb-4">
          <div className="flex items-start gap-4">
            {empresa?.logo && (
              <div className="flex-shrink-0 w-[80px] h-[80px]">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={empresa.logo} alt="Logo da Empresa" className="object-contain w-full h-full" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{empresa?.nome || 'Sua Empresa'}</h1>
              <p>{empresa?.endereco}</p>
              <p>{empresa?.telefone}</p>
              <p>{empresa?.cnpj}</p>
            </div>
          </div>
           <div className="text-right">
            <h2 className="text-lg font-semibold">Orçamento #{orcamento.numeroOrcamento}</h2>
            <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>
            {dataValidade && <p className="mt-1">Validade: {format(dataValidade, 'dd/MM/yyyy')}</p>}
          </div>
        </header>

        <section className="mb-4">
          <h3 className="font-semibold text-lg mb-2">Cliente:</h3>
          <div className="space-y-1">
            <p><span className="font-medium">Nome:</span> {orcamento.cliente.nome}</p>
            {orcamento.cliente.cpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {orcamento.cliente.cpfCnpj}</p>}
            {orcamento.cliente.endereco && <p><span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}</p>}
            <p><span className="font-medium">Telefone:</span> {orcamento.cliente.telefone}</p>
            {orcamento.cliente.email && <p><span className="font-medium">Email:</span> {orcamento.cliente.email}</p>}
          </div>
        </section>

        <table className="w-full text-black">
          <thead className="bg-gray-100">
            <tr className='border-b'>
              <th className="p-2 text-left font-semibold text-black">Item / Descrição</th>
              <th className="p-2 text-right font-semibold text-black">Qtd.</th>
              <th className="p-2 text-right font-semibold text-black">Preço Unit.</th>
              <th className="p-2 text-right font-semibold text-black">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {orcamento.itens.map(item => (
              <tr key={item.id} className="even:bg-gray-50 border-b">
                <td className="p-2">{item.materialNome}</td>
                <td className="p-2 text-right">{formatNumber(item.quantidade, 2)} {item.unidade}</td>
                <td className="p-2 text-right">{formatCurrency(item.precoVenda / item.quantidade)}</td>
                <td className="p-2 text-right font-medium">{formatCurrency(item.precoVenda)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold text-lg">
              <td colSpan={3} className="p-2 text-right text-black">TOTAL</td>
              <td className="p-2 text-right text-black">{formatCurrency(orcamento.totalVenda)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
};

// Componente para o layout do PDF Interno
const InternalBudgetPDFLayout = ({ orcamento, empresa }: {
  orcamento: Orcamento | null,
  empresa: EmpresaData | null,
}) => {
    if (!orcamento) return null;
    
    const dataCriacao = parseISO(orcamento.dataCriacao);
    const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
    const dataValidade = !isNaN(validadeDiasNum) ? addDays(dataCriacao, validadeDiasNum) : null;
    const totalCusto = orcamento.itens.reduce((acc, item) => acc + item.total, 0);
    const lucroTotal = orcamento.totalVenda - totalCusto;

    return (
      <div className="p-8 font-sans bg-white text-black text-base">
        <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200 mb-4">
            <div className="flex items-start gap-4">
              {empresa?.logo && (
                <div className="flex-shrink-0 w-[80px] h-[80px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={empresa.logo} alt="Logo da Empresa" className="object-contain w-full h-full" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{empresa?.nome || 'Sua Empresa'}</h1>
                <p>{empresa?.endereco}</p>
                <p>{empresa?.telefone}</p>
                <p>{empresa?.cnpj}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold">Orçamento Interno #{orcamento.numeroOrcamento}</h2>
              <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>
              {dataValidade && <p className="mt-1">Validade: {format(dataValidade, 'dd/MM/yyyy')}</p>}
            </div>
        </header>

        <section className="mb-4">
            <h3 className="font-semibold text-lg mb-2">Cliente:</h3>
            <div className="space-y-1">
              <p><span className="font-medium">Nome:</span> {orcamento.cliente.nome}</p>
              {orcamento.cliente.cpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {orcamento.cliente.cpfCnpj}</p>}
              {orcamento.cliente.endereco && <p><span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}</p>}
              <p><span className="font-medium">Telefone:</span> {orcamento.cliente.telefone}</p>
              {orcamento.cliente.email && <p><span className="font-medium">Email:</span> {orcamento.cliente.email}</p>}
            </div>
        </section>

        <table className="w-full text-black">
          <thead className="bg-gray-100">
            <tr className='border-b'>
              <th className="p-2 text-left font-semibold text-black">Item</th>
              <th className="p-2 text-right font-semibold text-black">Qtd.</th>
              <th className="p-2 text-right font-semibold text-black">Custo UN</th>
              <th className="p-2 text-right font-semibold text-black">Custo Total</th>
              <th className="p-2 text-right font-semibold text-black">Margem %</th>
              <th className="p-2 text-right font-semibold text-black">Venda Total</th>
            </tr>
          </thead>
          <tbody>
            {orcamento.itens.map(item => (
              <tr key={item.id} className="even:bg-gray-50 border-b">
                <td className="p-2">{item.materialNome}</td>
                <td className="p-2 text-right">{formatNumber(item.quantidade, 2)} {item.unidade}</td>
                <td className="p-2 text-right">{formatCurrency(item.precoUnitario)}</td>
                <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                <td className="p-2 text-right">{formatNumber(item.margemLucro, 1)}%</td>
                <td className="p-2 text-right font-medium">{formatCurrency(item.precoVenda)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
             <tr className="border-t-2 font-bold">
              <td colSpan={3} className="p-2 text-right">Totais</td>
              <td className="p-2 text-right bg-red-100">{formatCurrency(totalCusto)}</td>
              <td className="p-2 text-right"></td>
              <td className="p-2 text-right bg-green-100">{formatCurrency(orcamento.totalVenda)}</td>
            </tr>
             <tr className="font-bold text-lg">
              <td colSpan={5} className="p-2 text-right bg-blue-100">LUCRO TOTAL</td>
              <td className="p-2 text-right bg-blue-100">{formatCurrency(lucroTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
};


export default function OrcamentoPage() {
  const [user, loadingAuth] = useAuthState(auth);
  
  const [materiais, setMateriais] = useState<MaterialItem[]>([]);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [orcamentosSalvos, setOrcamentosSalvos] = useState<Orcamento[]>([]);
  
  // States for budget creation wizard
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [orcamentoItens, setOrcamentoItens] = useState<OrcamentoItem[]>([]);
  const [clienteData, setClienteData] = useState<Omit<ClienteData, 'userId'>>({ id: undefined, nome: '', endereco: '', telefone: '', email: '', cpfCnpj: ''});
  const [validadeDias, setValidadeDias] = useState('7');
  
  const [isLoading, setIsLoading] = useState({
      materiais: true,
      clientes: true,
      empresa: true,
      orcamentos: true
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const pdfRef = useRef<HTMLDivElement>(null);
  const internalPdfRef = useRef<HTMLDivElement>(null);
  
  const [novoItem, setNovoItem] = useState({ materialId: '', quantidade: '', margemLucro: '' });
  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [margemLucroStr, setMargemLucroStr] = useState('');

  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [editingQuantidadeStr, setEditingQuantidadeStr] = useState('');
  const [editingMargemLucroStr, setEditingMargemLucroStr] = useState('0');
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);


  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfBudget, setPdfBudget] = useState<Orcamento | null>(null);
  
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
  const [editingBudgetItens, setEditingBudgetItens] = useState<OrcamentoItem[]>([]);

  // State for adding new item in edit modal
  const [newItemForEdit, setNewItemForEdit] = useState({ materialId: '', quantidade: '', margemLucro: '' });
  const [newItemQtyStr, setNewItemQtyStr] = useState('');
  const [newItemMarginStr, setNewItemMarginStr] = useState('');


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
      setMateriais([]);
      setClientes([]);
      setOrcamentosSalvos([]);
      setEmpresa(null);
      setIsLoading({ materiais: false, clientes: false, empresa: false, orcamentos: false });
    }
  }, [user, loadingAuth, fetchAllData]);
  
  const fetchOrcamentos = useCallback(async () => {
    if (!user) return;
    setIsLoading(prev => ({ ...prev, orcamentos: true }));
    try {
      const orcamentosData = await getOrcamentos(user.uid);
      setOrcamentosSalvos(orcamentosData);
    } catch (error) {
      console.error("Erro ao buscar orçamentos:", error);
      toast({ title: 'Erro ao carregar orçamentos', variant: 'destructive' });
    } finally {
      setIsLoading(prev => ({ ...prev, orcamentos: false }));
    }
  }, [user, toast]);


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

  const selectedMaterialForEdit = useMemo(() => {
    return materiais.find(m => m.id === newItemForEdit.materialId);
  }, [materiais, newItemForEdit.materialId]);
  
  const totalCusto = useMemo(() => orcamentoItens.reduce((sum, item) => sum + item.total, 0), [orcamentoItens]);
  const totalVenda = useMemo(() => orcamentoItens.reduce((sum, item) => sum + item.precoVenda, 0), [orcamentoItens]);
  
  const handleOpenWizard = () => {
    // Reset state before opening
    setOrcamentoItens([]);
    setClienteData({ id: undefined, nome: '', endereco: '', telefone: '', email: '', cpfCnpj: ''});
    setValidadeDias('7');
    setWizardStep(1);
    setIsWizardOpen(true);
  };
  
  const handleClienteDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cpfCnpj') finalValue = maskCpfCnpj(value);
    else if (name === 'telefone') finalValue = maskTelefone(value);
    setClienteData(prev => ({...prev, [name]: finalValue}));
  };

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

  const handleNewItemForEditChange = (field: keyof typeof newItemForEdit, value: string) => {
    const setterMap = {
      quantidade: setNewItemQtyStr,
      margemLucro: setNewItemMarginStr,
    };
    const targetSetter = setterMap[field as keyof typeof setterMap];

    if (targetSetter) {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        targetSetter(sanitizedValue);
        setNewItemForEdit(prev => ({ ...prev, [field]: sanitizedValue.replace(',', '.') }));
    } else {
        setNewItemForEdit(prev => ({ ...prev, [field]: value }));
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
    
    // Reset form fields for adding new item in edit modal
    setNewItemForEdit({ materialId: '', quantidade: '', margemLucro: '' });
    setNewItemQtyStr('');
    setNewItemMarginStr('');
  };

  const removeLinha = (id: string) => {
    setOrcamentoItens(prev => prev.filter(i => i.id !== id));
  };
  
  const handleConfirmSave = async () => {
    if (!user) { toast({ title: "Usuário não autenticado", variant: "destructive" }); return; }
    if (orcamentoItens.length === 0) { toast({ title: "Orçamento vazio", description: "Adicione pelo menos um item ao orçamento.", variant: "destructive" }); return;}
    
    setIsSubmitting(true);
    try {
        const numeroOrcamento = await getNextOrcamentoNumber(user.uid);
        
        const finalClienteData = { ...clienteData };
        if (finalClienteData.id === undefined) {
            delete (finalClienteData as Partial<typeof finalClienteData>).id;
        }

        const newBudget: Omit<Orcamento, 'id'> = {
            userId: user.uid, 
            numeroOrcamento,
            cliente: { ...finalClienteData, userId: user.uid },
            itens: orcamentoItens, 
            totalVenda: totalVenda,
            dataCriacao: new Date().toISOString(), 
            status: 'Pendente', 
            validadeDias: validadeDias
        };

        await addOrcamento(newBudget);
        await fetchOrcamentos();
        toast({ title: `Orçamento ${numeroOrcamento} salvo com sucesso!` });
        setIsWizardOpen(false);
    } catch(error: any) {
        toast({ title: "Erro ao salvar orçamento", description: error.message, variant: "destructive" });
        console.error("Erro ao salvar:", error);
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleUpdateStatus = async (budgetId: string, status: 'Aceito' | 'Recusado') => {
    if (!user) return;
    try {
        await updateOrcamentoStatus(budgetId, status);
        const acceptedBudget = orcamentosSalvos.find(b => b.id === budgetId);
        if (status === 'Aceito' && acceptedBudget) {
            for (const item of acceptedBudget.itens) {
                const materialOriginal = materiais.find(m => m.id === item.materialId);
                if (materialOriginal && materialOriginal.tipo === 'item') {
                    try { await updateEstoque(user.uid, item.materialId, item.quantidade); } 
                    catch (error: any) { toast({ title: 'Erro ao atualizar estoque', description: error.message, variant: 'destructive' }); }
                }
            }
        }
        await fetchOrcamentos();
        toast({ title: `Orçamento ${status.toLowerCase()}!` });
        if (status === 'Aceito' && acceptedBudget) { handleSendAcceptanceWhatsApp(acceptedBudget); }
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
    let mensagem = `✅ *Orçamento Aceito!*\n\n*Nº do Orçamento:* ${orcamento.numeroOrcamento}\n*Cliente:* ${orcamento.cliente.nome}\n`;
    if (orcamento.cliente.telefone) mensagem += `*Tel. Cliente:* ${orcamento.cliente.telefone}\n`;
    if (orcamento.cliente.endereco) mensagem += `*Endereço:* ${orcamento.cliente.endereco}\n`;
    mensagem += `*Valor Total:* ${formatCurrency(orcamento.totalVenda)}\n\n*Itens do Serviço:*\n`;
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
    const canvas = await html2canvas(pdfElement, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    let width = pdfWidth;
    let height = width / ratio;
    if (height > pdfHeight) { height = pdfHeight; width = height * ratio; }
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`orcamento-${orcamento.cliente.nome.toLowerCase().replace(/ /g, '_')}-${orcamento.numeroOrcamento}.pdf`);
    setPdfBudget(null);
  };
  
  const handleGerarPDFInterno = async (orcamento: Orcamento) => {
    setPdfBudget(orcamento);
    await new Promise(resolve => setTimeout(resolve, 100)); // Aguarda a renderização do PDF
    const pdfElement = internalPdfRef.current;
    if (!pdfElement) return;
    const canvas = await html2canvas(pdfElement, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    let width = pdfWidth;
    let height = width / ratio;
    if (height > pdfHeight) { height = pdfHeight; width = height * ratio; }
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`interno-${orcamento.cliente.nome.toLowerCase().replace(/ /g, '_')}-${orcamento.numeroOrcamento}.pdf`);
    setPdfBudget(null);
  };
  
  const handleEnviarWhatsApp = (orcamento: Orcamento) => {
    const telefoneLimpo = orcamento.cliente.telefone.replace(/\D/g, '');
    if (!telefoneLimpo) { toast({ title: 'Telefone do Cliente inválido.', variant: 'destructive' }); return; }
    let mensagem = `*Orçamento de ${empresa?.nome || 'Serviços'}*\n\n*Nº do Orçamento:* ${orcamento.numeroOrcamento}\n\nOlá, *${orcamento.cliente.nome}*!\nSegue o seu orçamento:\n\n`;
    orcamento.itens.forEach(item => {
      let linha = `*- ${item.materialNome}* (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade}) - *${formatCurrency(item.precoVenda)}*\n`;
      mensagem += linha;
    });
    mensagem += `\n*VALOR TOTAL: ${formatCurrency(orcamento.totalVenda)}*\n\n`;
    if (orcamento.validadeDias) {
      const dataCriacao = parseISO(orcamento.dataCriacao);
      const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
      if (!isNaN(validadeDiasNum)) {
        const dataValidade = addDays(dataCriacao, validadeDiasNum);
        mensagem += `_Proposta válida até ${format(dataValidade, 'dd/MM/yyyy')}._\n\n`;
      }
    }
    const urlWhatsApp = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
  };

  const handleEditItemClick = (item: OrcamentoItem, sourceList: 'wizard' | 'modal') => {
    setEditingItem({ ...item });
    setEditingQuantidadeStr(String(item.quantidade).replace('.', ','));
    setEditingMargemLucroStr(String(item.margemLucro).replace('.', ','));
    // Definir de qual lista o item veio para saber onde salvar de volta
    (item as any).sourceList = sourceList; 
    setIsEditItemModalOpen(true);
  };
  
  const handleEditItemFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingItem) return;
    const { name, value } = e.target;
    
    if (name === 'quantidade') { 
      setEditingQuantidadeStr(value.replace(/[^0-9,]/g, ''));
    } else if (name === 'margemLucro') { 
      setEditingMargemLucroStr(value.replace(/[^0-9,]/g, ''));
    } else if (name === 'materialNome') {
       setEditingItem(prev => prev ? { ...prev, materialNome: value } : null);
    }
  };

  const handleSalvarEdicaoItem = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const sourceList = (editingItem as any).sourceList;
    const numQuantidade = parseFloat(editingQuantidadeStr.replace(',', '.'));
    const numMargemLucro = parseFloat(editingMargemLucroStr.replace(',', '.')) || 0;
    if (isNaN(numQuantidade) || numQuantidade <= 0) { toast({ title: 'Quantidade inválida', variant: 'destructive' }); return; }

    const custoFinal = editingItem.precoUnitario * numQuantidade;
    const precoVendaCalculado = custoFinal * (1 + numMargemLucro / 100);
    
    const itemAtualizado: OrcamentoItem = { 
        ...editingItem,
        materialNome: editingItem.materialNome, // garante que o nome editado seja salvo
        quantidade: numQuantidade, 
        margemLucro: numMargemLucro,
        total: custoFinal, 
        precoVenda: precoVendaCalculado 
    };

    if (sourceList === 'wizard') {
        setOrcamentoItens(prev => prev.map(item => item.id === itemAtualizado.id ? itemAtualizado : item));
    } else if (sourceList === 'modal') {
        setEditingBudgetItens(prev => prev.map(item => item.id === itemAtualizado.id ? itemAtualizado : item));
    }

    setIsEditItemModalOpen(false);
    setEditingItem(null);
    toast({ title: 'Item atualizado.' });
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
        await fetchOrcamentos();
        toast({ title: 'Orçamento Excluído', variant: 'destructive' });
    } catch(error) {
        toast({ title: 'Erro ao excluir orçamento', variant: 'destructive'});
    }
  };

  const handleOpenEditBudgetModal = (orcamento: Orcamento) => {
    setEditingBudget({ ...orcamento });
    setEditingBudgetItens([...orcamento.itens]);
    setIsEditBudgetModalOpen(true);
  };
  
  const handleRemoveItemFromEditBudget = (itemId: string) => {
    setEditingBudgetItens(prev => prev.filter(item => item.id !== itemId));
  };
  
  const handleUpdateBudget = async () => {
    if (!editingBudget || !user) return;
    setIsSubmitting(true);
    try {
        const totalVendaFinal = editingBudgetItens.reduce((acc, item) => acc + item.precoVenda, 0);
        const budgetToUpdate = {
            ...editingBudget,
            itens: editingBudgetItens,
            totalVenda: totalVendaFinal,
        };
        await updateOrcamento(budgetToUpdate.id, budgetToUpdate);
        await fetchOrcamentos();
        setIsEditBudgetModalOpen(false);
        setEditingBudget(null);
        toast({title: "Orçamento atualizado com sucesso!"});
    } catch (error) {
        toast({title: "Erro ao atualizar o orçamento", variant: "destructive"});
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const anyLoading = loadingAuth || Object.values(isLoading).some(Boolean);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Meus Orçamentos</CardTitle>
          <CardDescription>Crie e gerencie seus orçamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleOpenWizard} disabled={anyLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Orçamento
          </Button>
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
                  <Button variant="ghost" size="icon" onClick={() => fetchOrcamentos()} disabled={isRefreshing}>
                    <RefreshCw className={`h-5 w-5 ${isRefreshing || isLoading.orcamentos ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {anyLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                ) : filteredOrcamentos.length > 0 ? (
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
                            <div className="overflow-x-auto">
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
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-wrap justify-end gap-2 bg-muted/50 p-4">
                           <Button variant="outline" size="sm" onClick={() => handleOpenEditBudgetModal(orcamento)} disabled={orcamento.status !== 'Pendente'}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>Tem certeza que deseja excluir este orçamento permanentemente? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleRemoverOrcamento(orcamento.id)}>Sim, Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="sm"><FileText className="mr-2"/>Gerar PDF</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleGerarPDF(orcamento)}>
                                        Cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGerarPDFInterno(orcamento)}>
                                        Interno
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="secondary" size="sm" onClick={() => handleEnviarWhatsApp(orcamento)} disabled={!orcamento.cliente.telefone}><MessageCircle className="mr-2"/>Enviar Proposta</Button>
                            {orcamento.status === 'Pendente' && (
                                <>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><XCircle className="mr-2"/>Recusar</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Confirmar Recusa</AlertDialogTitle><AlertDialogDescription>Tem certeza de que deseja recusar este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleUpdateStatus(orcamento.id, 'Recusado')}>Sim, Recusar</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 className="mr-2"/>Aceitar</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Confirmar Aceite</AlertDialogTitle><AlertDialogDescription>Ao aceitar, o status será atualizado e uma notificação será preparada para envio via WhatsApp para sua empresa.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={() => handleUpdateStatus(orcamento.id, 'Aceito')}>Sim, Aceitar</AlertDialogAction></AlertDialogFooter>
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
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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
                  <Select onValueChange={(clientId) => {
                      const selected = clientes.find(c => c.id === clientId);
                      if (selected) setClienteData(selected);
                  }}>
                      <SelectTrigger id="cliente-select"><SelectValue placeholder="Selecionar cliente da lista..." /></SelectTrigger>
                      <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id!}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou preencha manualmente</span></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="cliente-nome">Nome</Label><Input id="cliente-nome" name="nome" value={clienteData.nome} onChange={handleClienteDataChange} required/></div>
                  <div className="space-y-2"><Label htmlFor="cliente-telefone">Telefone</Label><Input id="cliente-telefone" name="telefone" value={clienteData.telefone} onChange={handleClienteDataChange} placeholder="(DD) XXXXX-XXXX"/></div>
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
              <h3 className="text-lg font-semibold mb-4">Adicionar Itens ao Orçamento</h3>
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
                    <div><Label htmlFor="quantidade">Qtd ({selectedMaterial.unidade})</Label><Input id="quantidade" type="text" inputMode='decimal' placeholder="1,5" value={quantidadeStr} onChange={e => handleNovoItemChange('quantidade', e.target.value)} /></div>
                    <div><Label htmlFor="margem-lucro">Acréscimo (%)</Label><Input id="margem-lucro" type="text" inputMode='decimal' placeholder="10" value={margemLucroStr} onChange={e => handleNovoItemChange('margemLucro', e.target.value)} /></div>
                    <div className="lg:col-span-1"><Button onClick={addLinha} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Add</Button></div>
                  </>
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
                                        <Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item, 'wizard')}><Pencil className="h-4 w-4 text-primary" /></Button>
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
            {wizardStep === 2 && <Button onClick={handleConfirmSave} disabled={isSubmitting || orcamentoItens.length === 0}>{isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2"/>} Salvar Orçamento</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditItemModalOpen} onOpenChange={setIsEditItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item do Orçamento</DialogTitle>
            <DialogDescription>Modifique o nome, a quantidade e o acréscimo do item selecionado.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleSalvarEdicaoItem} className="space-y-4 py-4">
              <div><Label htmlFor="edit-nome">Nome do Item</Label><Input id="edit-nome" name="materialNome" value={editingItem.materialNome} onChange={handleEditItemFormChange}/></div>
              <div><Label htmlFor="edit-quantidade">Quantidade ({editingItem.unidade})</Label><Input id="edit-quantidade" name="quantidade" type="text" inputMode='decimal' value={editingQuantidadeStr} onChange={handleEditItemFormChange}/></div>
              <div><Label htmlFor="edit-margemLucro">Acréscimo (%)</Label><Input id="edit-margemLucro" name="margemLucro" type="text" inputMode='decimal' value={editingMargemLucroStr} onChange={handleEditItemFormChange}/></div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditBudgetModalOpen} onOpenChange={setIsEditBudgetModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Editar Orçamento #{editingBudget?.numeroOrcamento}</DialogTitle>
                <DialogDescription>
                    Cliente: {editingBudget?.cliente.nome} <br/>
                    Ajuste os itens e clique em salvar.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto p-1 pr-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg items-end">
                  <div className="sm:col-span-2">
                    <Label htmlFor="edit-material-select">Item / Serviço</Label>
                    <Select value={newItemForEdit.materialId} onValueChange={(val) => handleNewItemForEditChange('materialId', val)}>
                      <SelectTrigger id="edit-material-select"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {materiais.map(mat => (<SelectItem key={mat.id} value={mat.id}>{`${mat.descricao} (${formatCurrency(mat.precoUnitario)}/${mat.unidade})`}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedMaterialForEdit && (
                    <>
                      <div><Label htmlFor="edit-quantidade">Qtd ({selectedMaterialForEdit.unidade})</Label><Input id="edit-quantidade" type="text" inputMode='decimal' placeholder="1,5" value={newItemQtyStr} onChange={e => handleNewItemForEditChange('quantidade', e.target.value)} /></div>
                      <div><Label htmlFor="edit-margem-lucro">Acréscimo (%)</Label><Input id="edit-margem-lucro" type="text" inputMode='decimal' placeholder="10" value={newItemMarginStr} onChange={e => handleNewItemForEditChange('margemLucro', e.target.value)} /></div>
                      <div className="lg:col-span-1"><Button onClick={handleAddItemToEditBudget} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Adicionar Item</Button></div>
                    </>
                  )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qtd.</TableHead>
                            <TableHead className="text-right">Venda</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {editingBudgetItens.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.materialNome}</TableCell>
                                <TableCell className="text-right">{formatNumber(item.quantidade, 2)}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{formatCurrency(item.precoVenda)}</TableCell>
                                <TableCell className="flex justify-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item, 'modal')}><Pencil className="h-4 w-4 text-primary" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItemFromEditBudget(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                     <TableTotalFooter>
                        <TableRow className="bg-muted/50 font-bold text-base">
                            <TableCell colSpan={2}>TOTAL</TableCell>
                            <TableCell className="text-right text-primary">{formatCurrency(editingBudgetItens.reduce((acc, item) => acc + item.precoVenda, 0))}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableTotalFooter>
                </Table>
            </div>
            <DialogFooter className="pt-4 border-t">
                <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button onClick={handleUpdateBudget} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2"/>}
                  Salvar Alterações
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="absolute -z-10 top-0 -left-[9999px] w-[595pt] bg-white text-black">
          <div ref={pdfRef}>
              {<BudgetPDFLayout orcamento={pdfBudget} empresa={empresa} />}
          </div>
          <div ref={internalPdfRef}>
              {<InternalBudgetPDFLayout orcamento={pdfBudget} empresa={empresa} />}
          </div>
      </div>
    </div>
  );
}
