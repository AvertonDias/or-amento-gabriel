




'use client';

import React, { useState, useMemo, useEffect, FormEvent, useRef, useCallback } from 'react';
import type { MaterialItem, OrcamentoItem, EmpresaData, ClienteData, Orcamento } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableTotalFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PlusCircle, Trash2, FileText, Pencil, MessageCircle, History, CheckCircle2, XCircle, Search, Loader2, RefreshCw, ArrowRight, ArrowLeft, AlertTriangle, FilterX, MoreVertical, ArrowRightLeft, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatNumber, maskCpfCnpj, maskTelefone, maskCurrency } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getMateriais, updateEstoque } from '@/services/materiaisService';
import { getClientes, addCliente, updateCliente } from '@/services/clientesService';
import { getEmpresaData } from '@/services/empresaService';
import { addOrcamento, deleteOrcamento, getOrcamentos, getNextOrcamentoNumber, updateOrcamento, updateOrcamentoStatus } from '@/services/orcamentosService';
import { addDays, parseISO, format, isBefore, startOfToday, differenceInHours } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from '@/components/ui/separator';
import { useSearchParams, useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';


// Componente para o layout do PDF do Cliente
const BudgetPDFLayout = ({ orcamento, empresa }: {
  orcamento: Orcamento | null,
  empresa: EmpresaData | null,
}) => {
    if (!orcamento) return null;
    
    const dataCriacao = parseISO(orcamento.dataCriacao);
    const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
    const dataValidade = !isNaN(validadeDiasNum) ? addDays(dataCriacao, validadeDiasNum) : null;
    const dataAceite = orcamento.dataAceite ? parseISO(orcamento.dataAceite) : null;
    const dataRecusa = orcamento.dataRecusa ? parseISO(orcamento.dataRecusa) : null;

    const telefonePrincipalEmpresa = empresa?.telefones.find(t => t.principal) || empresa?.telefones[0];
    const telefonePrincipalCliente = orcamento.cliente.telefones.find(t => t.principal) || orcamento.cliente.telefones[0];

    return (
      <div className="p-8 font-sans bg-white text-black text-xs">
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
              {telefonePrincipalEmpresa && <p>{telefonePrincipalEmpresa.numero}</p>}
              <p>{empresa?.cnpj}</p>
            </div>
          </div>
           <div className="text-right">
            <h2 className="text-lg font-semibold">Orçamento #{orcamento.numeroOrcamento}</h2>
            <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>
            
            {orcamento.status === 'Aceito' && dataAceite ? (
                <p className="mt-1 font-semibold text-green-600">Aceito em: {format(dataAceite, 'dd/MM/yyyy')}</p>
            ) : orcamento.status === 'Recusado' && dataRecusa ? (
                 <p className="mt-1 font-semibold text-red-600">Recusado em: {format(dataRecusa, 'dd/MM/yyyy')}</p>
            ) : orcamento.status === 'Vencido' ? (
                <p className="mt-1 font-semibold text-orange-600">Vencido em: {dataValidade ? format(dataValidade, 'dd/MM/yyyy') : 'N/A'}</p>
            ) : dataValidade ? (
                <p className="mt-1">Validade: {format(dataValidade, 'dd/MM/yyyy')}</p>
            ) : null}
          </div>
        </header>

        <section className="mb-4">
          <h3 className="font-semibold text-base mb-2">Cliente:</h3>
          <div className="space-y-1">
            <p><span className="font-medium">Nome:</span> {orcamento.cliente.nome}</p>
            {orcamento.cliente.cpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {orcamento.cliente.cpfCnpj}</p>}
            {orcamento.cliente.endereco && <p><span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}</p>}
            {telefonePrincipalCliente && <p><span className="font-medium">Telefone:</span> {telefonePrincipalCliente.numero}</p>}
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
            <tr className="bg-gray-200 font-bold text-base">
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
    const dataAceite = orcamento.dataAceite ? parseISO(orcamento.dataAceite) : null;
    const dataRecusa = orcamento.dataRecusa ? parseISO(orcamento.dataRecusa) : null;

    const telefonePrincipalEmpresa = empresa?.telefones.find(t => t.principal) || empresa?.telefones[0];
    const telefonePrincipalCliente = orcamento.cliente.telefones.find(t => t.principal) || orcamento.cliente.telefones[0];

    return (
      <div className="p-8 font-sans bg-white text-black text-xs">
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
                {telefonePrincipalEmpresa && <p>{telefonePrincipalEmpresa.numero}</p>}
                <p>{empresa?.cnpj}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold">Orçamento Interno #{orcamento.numeroOrcamento}</h2>
              <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>
              
              {orcamento.status === 'Aceito' && dataAceite ? (
                  <p className="mt-1 font-semibold text-green-600">Aceito em: {format(dataAceite, 'dd/MM/yyyy')}</p>
              ) : orcamento.status === 'Recusado' && dataRecusa ? (
                  <p className="mt-1 font-semibold text-red-600">Recusado em: {format(dataRecusa, 'dd/MM/yyyy')}</p>
              ) : orcamento.status === 'Vencido' ? (
                  <p className="mt-1 font-semibold text-orange-600">Vencido em: {dataValidade ? format(dataValidade, 'dd/MM/yyyy') : 'N/A'}</p>
              ) : dataValidade ? (
                  <p className="mt-1">Validade: {format(dataValidade, 'dd/MM/yyyy')}</p>
              ) : null}

            </div>
        </header>

        <section className="mb-4">
            <h3 className="font-semibold text-base mb-2">Cliente:</h3>
            <div className="space-y-1">
              <p><span className="font-medium">Nome:</span> {orcamento.cliente.nome}</p>
              {orcamento.cliente.cpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {orcamento.cliente.cpfCnpj}</p>}
              {orcamento.cliente.endereco && <p><span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}</p>}
              {telefonePrincipalCliente && <p><span className="font-medium">Telefone:</span> {telefonePrincipalCliente.numero}</p>}
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
             <tr className="font-bold text-base">
              <td colSpan={5} className="p-2 text-right bg-blue-100">LUCRO TOTAL</td>
              <td className="p-2 text-right bg-blue-100">{formatCurrency(lucroTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
};

const unidadesDeMedida = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'serv', label: 'Serviço (serv)' },
];


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
  const [clienteData, setClienteData] = useState<Omit<ClienteData, 'userId' | 'id'> & {id?: string}>({ id: undefined, nome: '', endereco: '', telefones: [{nome: 'Principal', numero: '', principal: true}], email: '', cpfCnpj: ''});
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
  const quantidadeInputRef = useRef<HTMLInputElement>(null);
  
  const [novoItem, setNovoItem] = useState({ materialId: '', quantidade: '', margemLucro: '' });
  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [margemLucroStr, setMargemLucroStr] = useState('');
  
  const [isAddingAvulso, setIsAddingAvulso] = useState(false);
  const [itemAvulso, setItemAvulso] = useState({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
  const [itemAvulsoPrecoStr, setItemAvulsoPrecoStr] = useState('');

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

  // State for expired budgets modal
  const [expiredBudgets, setExpiredBudgets] = useState<Orcamento[]>([]);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  
  const [isConfirmSaveClientOpen, setIsConfirmSaveClientOpen] = useState(false);
  const [clientToSave, setClientToSave] = useState<Omit<ClienteData, 'id' | 'userId'> & { id?: string } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const clienteIdParam = searchParams.get('clienteId');

  // State for adding "avulso" item in edit modal
  const [isAddingAvulsoInEdit, setIsAddingAvulsoInEdit] = useState(false);
  const [itemAvulsoInEdit, setItemAvulsoInEdit] = useState({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
  const [itemAvulsoInEditPrecoStr, setItemAvulsoInEditPrecoStr] = useState('');
  
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);

  // State for phone selection modal
  const [isPhoneSelectionOpen, setIsPhoneSelectionOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [currentBudgetForWpp, setCurrentBudgetForWpp] = useState<Orcamento | null>(null);



 const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(prev => ({...prev, materiais: true, clientes: true, empresa: true, orcamentos: true}));

    Promise.all([
        getMateriais(user.uid),
        getClientes(user.uid),
        getEmpresaData(user.uid),
        getOrcamentos(user.uid)
    ]).then(([materiaisData, clientesData, empresaData, orcamentosData]) => {
        setMateriais(materiaisData);
        setClientes(clientesData);
        setEmpresa(empresaData);
        setOrcamentosSalvos(orcamentosData);
    }).catch(error => {
        console.error("Erro ao buscar dados:", error);
        toast({ title: 'Erro ao carregar dados', description: 'Não foi possível buscar os dados. Verifique sua conexão ou as permissões do banco de dados.', variant: 'destructive' });
    }).finally(() => {
        setIsLoading({ materiais: false, clientes: false, empresa: false, orcamentos: false });
        if (isRefresh) setIsRefreshing(false);
    });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingAuth]);
  
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        toast({title: 'Você está online.', description: 'Sincronizando dados...'});
        fetchAllData(true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, fetchAllData, toast]);

  const scheduleNotification = async (orcamento: Orcamento, type: 'expiring' | 'expired') => {
    if (Capacitor.isNativePlatform() && (await LocalNotifications.checkPermissions()).display === 'granted') {
      const storageKey = `notif_${type}_${orcamento.id}`;
      if (localStorage.getItem(storageKey)) return; // Já notificado

      await LocalNotifications.schedule({
        notifications: [
          {
            title: type === 'expiring' ? `Orçamento quase vencendo` : `Orçamento Vencido`,
            body: `O orçamento #${orcamento.numeroOrcamento} para ${orcamento.cliente.nome} ${type === 'expiring' ? 'vence em 24 horas.' : 'venceu hoje.'}`,
            id: new Date().getTime(), // ID único
            schedule: { at: new Date(Date.now() + 1000) }, // Agendar para agora
            smallIcon: "res://mipmap/ic_launcher",
            iconColor: "#64B5F6",
          },
        ],
      });
      localStorage.setItem(storageKey, 'true');
    }
  };

  useEffect(() => {
    if (orcamentosSalvos.length === 0) return;
    const now = new Date();

    orcamentosSalvos.forEach(orcamento => {
      if (orcamento.status !== 'Pendente') return;

      const dataCriacao = parseISO(orcamento.dataCriacao);
      const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
      if (isNaN(validadeDiasNum)) return;

      const dataValidade = addDays(dataCriacao, validadeDiasNum);
      const hoursUntilExpiry = differenceInHours(dataValidade, now);

      // Checa se está prestes a vencer (nas próximas 24h)
      if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 24) {
        scheduleNotification(orcamento, 'expiring');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentosSalvos]);

  useEffect(() => {
    if (orcamentosSalvos.length > 0) {
      const today = startOfToday();
      const budgetsToExpire = orcamentosSalvos.filter(orcamento => {
        if (orcamento.status !== 'Pendente') return false;
        const dataCriacao = parseISO(orcamento.dataCriacao);
        const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
        if (isNaN(validadeDiasNum)) return false;
        const dataValidade = addDays(dataCriacao, validadeDiasNum);
        return isBefore(dataValidade, today);
      });

      if (budgetsToExpire.length > 0) {
        const updatedBudgets = [...orcamentosSalvos];
        budgetsToExpire.forEach(orcamento => {
          updateOrcamentoStatus(orcamento.id, 'Vencido', { dataRecusa: null, dataAceite: null });
          scheduleNotification(orcamento, 'expired');
          const index = updatedBudgets.findIndex(o => o.id === orcamento.id);
          if (index !== -1) {
            updatedBudgets[index] = { ...updatedBudgets[index], status: 'Vencido' };
          }
        });
        setOrcamentosSalvos(updatedBudgets);
        setExpiredBudgets(budgetsToExpire);
        setIsExpiredModalOpen(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentosSalvos]);

  const fetchOrcamentos = useCallback(async () => {
    if (!user) return;
    setIsLoading(prev => ({ ...prev, orcamentos: true }));
    getOrcamentos(user.uid).then(orcamentosData => {
      setOrcamentosSalvos(orcamentosData);
    }).catch(error => {
      console.error("Erro ao buscar orçamentos:", error);
      toast({ title: 'Erro ao carregar orçamentos', variant: 'destructive' });
    }).finally(() => {
        setIsLoading(prev => ({ ...prev, orcamentos: false }));
    });
  }, [user, toast]);


  const filteredOrcamentos = useMemo(() => {
    let filtered = orcamentosSalvos;

    if (clienteIdParam) {
      filtered = filtered.filter(orcamento => orcamento.cliente.id === clienteIdParam);
    }

    if (searchTerm) {
      filtered = filtered.filter(orcamento =>
        orcamento.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (orcamento.numeroOrcamento && orcamento.numeroOrcamento.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return filtered;
  }, [orcamentosSalvos, searchTerm, clienteIdParam]);
  
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
    setClienteData({ id: undefined, nome: '', endereco: '', telefones: [{nome: 'Principal', numero: '', principal: true}], email: '', cpfCnpj: ''});
    setValidadeDias('7');
    setIsAddingAvulso(false);
    setWizardStep(1);
    setIsWizardOpen(true);
  };
  
  const handleClienteDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cpfCnpj') finalValue = maskCpfCnpj(value);
    setClienteData(prev => ({...prev, [name]: finalValue}));
  };

  const handleClientTelefoneChange = (index: number, field: 'nome' | 'numero', value: string) => {
    const setter = setClienteData;
    const maskedValue = field === 'numero' ? maskTelefone(value) : value;

    setter(prev => {
        if (!prev) return prev;
        const novosTelefones = [...prev.telefones];
        novosTelefones[index] = { ...novosTelefones[index], [field]: maskedValue };
        return { ...prev, telefones: novosTelefones };
    });
  };

  const handleClientAddTelefone = () => {
    setClienteData(prev => ({
        ...prev,
        telefones: [...prev.telefones, { nome: '', numero: '', principal: false }]
    }));
  };

  const handleClientRemoveTelefone = (index: number) => {
    setClienteData(prev => {
        if (prev.telefones.length <= 1) {
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

  const handleClientPrincipalTelefoneChange = (selectedIndex: number) => {
    setClienteData(prev => {
      if (!prev) return prev;
      const novosTelefones = prev.telefones.map((tel, index) => ({
        ...tel,
        principal: index === selectedIndex,
      }));
      return { ...prev, telefones: novosTelefones };
    });
  };


  const handleNovoItemChange = (field: keyof typeof novoItem, value: string) => {
    if (field === 'materialId') {
        setNovoItem(prev => ({ ...prev, [field]: value }));
        // Focus on a quantidade input
        setTimeout(() => quantidadeInputRef.current?.focus(), 0);
    } else if (field === 'quantidade') {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setQuantidadeStr(sanitizedValue);
        setNovoItem(prev => ({ ...prev, [field]: sanitizedValue.replace(',', '.') }));
    } else if (field === 'margemLucro') {
        const sanitizedValue = value.replace(/[^0-9,]/g, '');
        setMargemLucroStr(sanitizedValue);
        setNovoItem(prev => ({ ...prev, [field]: sanitizedValue.replace(',', '.') }));
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

  const addLinhaAvulsa = () => {
    const { descricao, quantidade, unidade } = itemAvulso;
    const numQuantidade = parseFloat(quantidade.replace(',', '.')) || 1;
    const numPrecoFinal = parseFloat(itemAvulsoPrecoStr.replace(/\D/g, '')) / 100;

    if (!descricao.trim()) {
        toast({ title: "Descrição obrigatória", description: "Por favor, preencha a descrição do item avulso.", variant: "destructive" });
        return;
    }
    if (isNaN(numQuantidade) || numQuantidade <= 0) {
        toast({ title: "Quantidade inválida", description: "A quantidade do item avulso deve ser maior que zero.", variant: "destructive" });
        return;
    }
    if (isNaN(numPrecoFinal) || numPrecoFinal <= 0) {
        toast({ title: "Preço inválido", description: "O preço final do item avulso deve ser maior que zero.", variant: "destructive" });
        return;
    }

    const novoOrcamentoItem: OrcamentoItem = {
      id: crypto.randomUUID(),
      materialId: 'avulso-' + crypto.randomUUID(), // ID único para item avulso
      materialNome: descricao,
      unidade: unidade || 'un',
      quantidade: numQuantidade,
      precoUnitario: numPrecoFinal / numQuantidade, // Custo é calculado a partir do preço de venda
      total: numPrecoFinal, // Custo e venda são iguais, margem é 0
      margemLucro: 0,
      precoVenda: numPrecoFinal,
    };

    setOrcamentoItens(prev => [...prev, novoOrcamentoItem]);
    
    // Resetar formulário avulso
    setItemAvulso({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
    setItemAvulsoPrecoStr('');
    setIsAddingAvulso(false); // Fecha o formulário de item avulso
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

  const handleAddItemAvulsoToEditBudget = () => {
    const { descricao, quantidade, unidade } = itemAvulsoInEdit;
    const numQuantidade = parseFloat(quantidade.replace(',', '.')) || 1;
    const numPrecoFinal = parseFloat(itemAvulsoInEditPrecoStr.replace(/\D/g, '')) / 100;

    if (!descricao.trim()) { toast({ title: "Descrição obrigatória", variant: "destructive" }); return; }
    if (isNaN(numQuantidade) || numQuantidade <= 0) { toast({ title: "Quantidade inválida", variant: "destructive" }); return; }
    if (isNaN(numPrecoFinal) || numPrecoFinal <= 0) { toast({ title: "Preço inválido", variant: "destructive" }); return; }

    const novoOrcamentoItem: OrcamentoItem = {
      id: crypto.randomUUID(), materialId: 'avulso-' + crypto.randomUUID(),
      materialNome: descricao, unidade: unidade || 'un',
      quantidade: numQuantidade, precoUnitario: numPrecoFinal / numQuantidade,
      total: numPrecoFinal, margemLucro: 0, precoVenda: numPrecoFinal,
    };

    setEditingBudgetItens(prev => [...prev, novoOrcamentoItem]);

    setItemAvulsoInEdit({ descricao: '', quantidade: '', unidade: 'un', precoFinal: '' });
    setItemAvulsoInEditPrecoStr('');
    setIsAddingAvulsoInEdit(false);
  };

  const removeLinha = (id: string) => {
    setOrcamentoItens(prev => prev.filter(i => i.id !== id));
  };
  
const handleConfirmSave = () => {
    if (orcamentoItens.length === 0) {
        toast({ title: "Orçamento vazio", description: "Adicione pelo menos um item.", variant: "destructive" });
        return;
    }
    if (!clienteData.nome) {
        toast({ title: "Cliente não informado", description: "Preencha o nome do cliente.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    
    const normalizedNewClientName = clienteData.nome.trim().toLowerCase();
    const existingClient = clientes.find(c => c.nome.trim().toLowerCase() === normalizedNewClientName);

    const afterClientResolution = (currentClient: ClienteData) => {
        proceedToSaveBudget(currentClient).finally(() => {
            setIsSubmitting(false);
            setIsWizardOpen(false);
        });
    };

    if (existingClient) {
        afterClientResolution(existingClient);
    } else {
        setClientToSave({ ...clienteData });
        setIsConfirmSaveClientOpen(true);
    }
};

const handleConfirmSaveClientDialog = (shouldSave: boolean) => {
    setIsConfirmSaveClientOpen(false);
    if (!clientToSave || !user) {
        setIsSubmitting(false);
        setIsWizardOpen(false);
        return;
    };
    
    const afterClientResolution = (currentClient: ClienteData) => {
         proceedToSaveBudget(currentClient).finally(() => {
            setIsSubmitting(false);
            setIsWizardOpen(false);
        });
    };

    if (shouldSave) {
        const clientPayload = { ...clientToSave };
        delete clientPayload.id;
        addCliente(user.uid, clientPayload)
            .then((newClientId) => {
                const finalClientData = { ...clientToSave, id: newClientId, userId: user.uid };
                setClientes(prev => [...prev, finalClientData]);
                toast({ title: "Novo cliente salvo!" });
                afterClientResolution(finalClientData);
            })
            .catch(err => {
                console.error("Erro ao salvar novo cliente:", err);
                toast({ title: "Erro ao salvar o cliente.", variant: 'destructive'});
                setIsSubmitting(false);
                setIsWizardOpen(false);
            });
    } else {
        const tempClientData = { ...clientToSave, id: `temp_${crypto.randomUUID()}`, userId: user.uid };
        afterClientResolution(tempClientData);
    }
    setClientToSave(null);
};


const proceedToSaveBudget = (currentClient: ClienteData): Promise<void> => {
    if (!user || !currentClient.id) {
        toast({ title: "Erro de dados", description: "Dados do cliente ou do usuário estão faltando.", variant: 'destructive' });
        return Promise.reject(new Error("Dados do cliente ou do usuário estão faltando."));
    };

    return getNextOrcamentoNumber(user.uid).then(numeroOrcamento => {
        const newBudget: Omit<Orcamento, "id"> = {
            userId: user.uid,
            numeroOrcamento,
            cliente: { ...currentClient },
            itens: orcamentoItens,
            totalVenda,
            dataCriacao: new Date().toISOString(),
            status: "Pendente",
            validadeDias,
            dataAceite: null,
            dataRecusa: null,
        };
        return addOrcamento(newBudget);
    }).then(() => {
        toast({ title: `Orçamento salvo!` });
        fetchAllData(true);
    }).catch(error => {
        console.error("Erro ao salvar orçamento:", error);
        toast({ title: "Erro ao salvar orçamento", variant: "destructive" });
        throw error;
    });
};



  const handleUpdateStatus = async (budgetId: string, status: 'Aceito' | 'Recusado') => {
    if (!user) return;
    try {
        let updatePayload: { dataAceite?: string | null, dataRecusa?: string | null } = { };
        
        if (status === 'Aceito') {
            updatePayload.dataAceite = new Date().toISOString();
            updatePayload.dataRecusa = null;
        } else if (status === 'Recusado') {
            updatePayload.dataRecusa = new Date().toISOString();
            updatePayload.dataAceite = null;
        }

        await updateOrcamentoStatus(budgetId, status, updatePayload);
        
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
        if (status === 'Aceito' && acceptedBudget) { 
            const updatedBudget: Orcamento = { ...acceptedBudget, status: 'Aceito', ...updatePayload };
            handlePrepareWhatsApp(updatedBudget); 
        }
    } catch(error) {
        toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  }
  
  const handlePrepareWhatsApp = (orcamento: Orcamento) => {
    if (!empresa || !empresa.telefones || empresa.telefones.length === 0) {
      toast({ title: "Telefone da empresa não configurado.", description: "Vá para 'Configurações' para adicionar.", variant: "destructive" });
      return;
    }
    
    if (empresa.telefones.length === 1) {
      // Envia direto se só tiver um número
      sendWhatsAppMessage(orcamento, empresa.telefones[0].numero);
    } else {
      // Abre o modal de seleção se tiver múltiplos números
      setCurrentBudgetForWpp(orcamento);
      const principalPhone = empresa.telefones.find(t => t.principal) || empresa.telefones[0];
      setSelectedPhone(principalPhone.numero);
      setIsPhoneSelectionOpen(true);
    }
  };

  const handleConfirmPhoneSelection = () => {
    if (currentBudgetForWpp && selectedPhone) {
      sendWhatsAppMessage(currentBudgetForWpp, selectedPhone);
    }
    setIsPhoneSelectionOpen(false);
    setCurrentBudgetForWpp(null);
  };
  
  const sendWhatsAppMessage = (orcamento: Orcamento, companyPhone: string) => {
    const cleanCompanyPhone = companyPhone.replace(/\D/g, '');
    const telefonePrincipalCliente = orcamento.cliente.telefones.find(t => t.principal) || orcamento.cliente.telefones[0];
    let mensagem = `✅ *Orçamento Aceito!*\n\n*Nº do Orçamento:* ${orcamento.numeroOrcamento}\n*Cliente:* ${orcamento.cliente.nome}\n`;
    if (telefonePrincipalCliente?.numero) mensagem += `*Tel. Cliente:* ${telefonePrincipalCliente.numero}\n`;
    if (orcamento.cliente.endereco) mensagem += `*Endereço:* ${orcamento.cliente.endereco}\n`;
    mensagem += `*Valor Total:* ${formatCurrency(orcamento.totalVenda)}\n\n*Itens do Serviço:*\n`;
    orcamento.itens.forEach(item => {
      let linha = `- ${item.materialNome} (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade})`;
      mensagem += `${linha}\n`;
    });
    const urlWhatsApp = `https://wa.me/55${cleanCompanyPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
  };

  const savePdfToFile = async (pdf: jsPDF, fileName: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage !== 'granted') {
          const permResult = await Filesystem.requestPermissions();
          if (permResult.publicStorage !== 'granted') {
            toast({ title: "Permissão negada", description: "Não é possível salvar o PDF sem permissão.", variant: "destructive" });
            return;
          }
        }
    
        const base64Data = pdf.output('datauristring').split(',')[1];
        
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents, // Salva na pasta de Documentos
          recursive: true,
        });
    
        toast({ title: "PDF Salvo!", description: `Salvo em Documentos com o nome ${fileName}.` });
      } catch (e) {
        console.error("Erro ao salvar PDF no dispositivo", e);
        toast({ title: "Erro ao salvar", description: "Não foi possível salvar o PDF no dispositivo.", variant: "destructive" });
        pdf.save(fileName);
      }
    } else {
      pdf.save(fileName);
    }
  };

  const handleGerarPDF = async (orcamento: Orcamento) => {
    setPdfBudget(orcamento);
    await new Promise(resolve => setTimeout(resolve, 100));
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

    const fileName = `orcamento-${orcamento.cliente.nome.toLowerCase().replace(/ /g, '_')}-${orcamento.numeroOrcamento}.pdf`;
    
    await savePdfToFile(pdf, fileName);

    setPdfBudget(null);
  };
  
  const handleGerarPDFInterno = async (orcamento: Orcamento) => {
    setPdfBudget(orcamento);
    await new Promise(resolve => setTimeout(resolve, 100));
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
    
    const fileName = `interno-${orcamento.cliente.nome.toLowerCase().replace(/ /g, '_')}-${orcamento.numeroOrcamento}.pdf`;

    await savePdfToFile(pdf, fileName);
    
    setPdfBudget(null);
  };
  
  const handleEnviarWhatsApp = (orcamento: Orcamento) => {
    const telefonePrincipalCliente = orcamento.cliente.telefones.find(t => t.principal) || orcamento.cliente.telefones[0];
    const telefoneLimpo = telefonePrincipalCliente?.numero.replace(/\D/g, '');
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
  
  const getStatusBadgeVariant = (status: Orcamento['status']): "default" | "destructive" | "secondary" | "warning" => {
    switch (status) {
        case 'Aceito': return 'default';
        case 'Recusado': return 'destructive';
        case 'Vencido': return 'warning';
        case 'Pendente': return 'secondary';
        default: return 'secondary';
    }
  }
  
  const handleRemoverOrcamento = (id: string) => {
    if (!user) return;
    deleteOrcamento(id).then(() => {
        fetchOrcamentos();
        toast({ title: 'Orçamento Excluído', variant: 'destructive' });
    }).catch(error => {
        toast({ title: 'Erro ao excluir orçamento', variant: 'destructive'});
        console.error(error)
    })
  };

  const handleOpenEditBudgetModal = (orcamento: Orcamento) => {
    setEditingBudget({ ...orcamento });
    setEditingBudgetItens([...orcamento.itens]);
    setIsEditBudgetModalOpen(true);
  };
  
  const handleRemoveItemFromEditBudget = (itemId: string) => {
    setEditingBudgetItens(prev => prev.filter(item => item.id !== itemId));
  };
  
  const handleEditingBudgetClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingBudget) return;
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cpfCnpj') finalValue = maskCpfCnpj(value);
    setEditingBudget(prev => {
      if (!prev) return null;
      return {
        ...prev,
        cliente: {
          ...prev.cliente,
          [name]: finalValue
        }
      }
    })
  };
  
  const finishUpdateBudget = async () => {
    if (!editingBudget || !user) return;
    setIsSubmitting(true);
    try {
        const totalVendaFinal = editingBudgetItens.reduce((acc, item) => acc + item.precoVenda, 0);
        const budgetToUpdate: Orcamento = {
            ...editingBudget,
            itens: editingBudgetItens,
            totalVenda: totalVendaFinal,
        };
        await updateOrcamento(budgetToUpdate.id, budgetToUpdate);
        await fetchAllData(true); // Refresh all data to ensure consistency
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

  const handleUpdateBudget = async () => {
    if (!editingBudget || !user) return;

    const { cliente } = editingBudget;

    // Apenas atualiza o cliente se ele não for um cliente temporário.
    if (cliente.id && !cliente.id.startsWith('temp_')) {
        try {
            await updateCliente(cliente.id, {
                telefones: cliente.telefones,
                endereco: cliente.endereco,
            });
            toast({ title: "Dados do cliente atualizados."});
        } catch (error) {
            console.error("Erro ao atualizar cliente existente:", error);
            toast({ title: "Não foi possível atualizar o cliente.", variant: "destructive" });
        } finally {
            await finishUpdateBudget();
        }
    } else {
        await finishUpdateBudget();
    }
  };

  const anyLoading = loadingAuth || Object.values(isLoading).some(Boolean);
  const clienteFiltrado = clienteIdParam ? clientes.find(c => c.id === clienteIdParam) : null;

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
      
      {!anyLoading && (orcamentosSalvos.length > 0 || searchTerm || clienteIdParam) && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-6 w-6"/> Histórico de Orçamentos</CardTitle>
                <CardDescription>
                  {clienteIdParam && clienteFiltrado ? `Exibindo orçamentos para ${clienteFiltrado.nome}.` : "Gerencie os orçamentos salvos, aprove, recuse e envie para seus clientes."}
                </CardDescription>
                <div className="flex items-center gap-2 pt-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por cliente ou nº do orçamento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-10"
                    />
                     {searchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setSearchTerm('')}
                        >
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      )}
                  </div>
                  {clienteIdParam && (
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/orcamento')}>
                        <FilterX className="mr-2 h-4 w-4" />
                        Limpar Filtro
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => fetchAllData(true)} disabled={isRefreshing}>
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
                  filteredOrcamentos.map(orcamento => {
                    const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
                    const dataValidade = !isNaN(validadeDiasNum) ? addDays(parseISO(orcamento.dataCriacao), validadeDiasNum) : null;

                    return (
                      <Card key={orcamento.id} className="overflow-hidden">
                          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                              <div>
                                  <CardTitle className="text-xl">{orcamento.cliente.nome}</CardTitle>
                                  <CardDescription>
                                      <span className="font-semibold">#{orcamento.numeroOrcamento}</span> - {new Date(orcamento.dataCriacao).toLocaleDateString('pt-BR')} - <span className="font-bold text-primary">{formatCurrency(orcamento.totalVenda)}</span>
                                      {orcamento.status === 'Pendente' && dataValidade && (
                                        <span className="block text-xs text-muted-foreground">Vence em: {format(dataValidade, 'dd/MM/yyyy')}</span>
                                      )}
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
                              <div className="hidden md:flex flex-wrap justify-end gap-2">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Gerar PDF</Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleGerarPDF(orcamento)}>Para o Cliente</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleGerarPDFInterno(orcamento)}>Uso Interno</DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button variant="outline" size="sm" onClick={() => handleEnviarWhatsApp(orcamento)} disabled={!orcamento.cliente.telefones.some(t => t.numero)}><MessageCircle className="mr-2 h-4 w-4" />Enviar</Button>
                                  <Button variant="outline" size="sm" onClick={() => handleOpenEditBudgetModal(orcamento)} disabled={orcamento.status !== 'Pendente'}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                                  {orcamento.status === 'Pendente' && (
                                      <>
                                          <AlertDialog>
                                              <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><XCircle className="mr-2"/>Recusar</Button></AlertDialogTrigger>
                                              <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                      <AlertDialogTitle>Confirmar Recusa</AlertDialogTitle>
                                                      <AlertDialogDescription>Tem certeza de que deseja recusar este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleUpdateStatus(orcamento.id, 'Recusado')}>Sim, Recusar</AlertDialogAction>
                                                  </AlertDialogFooter>
                                              </AlertDialogContent>
                                          </AlertDialog>
                                          <AlertDialog>
                                              <AlertDialogTrigger asChild><Button size="sm"><CheckCircle2 className="mr-2"/>Aceitar</Button></AlertDialogTrigger>
                                              <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                      <AlertDialogTitle>Confirmar Aceite</AlertDialogTitle>
                                                      <AlertDialogDescription>Ao aceitar, o status será atualizado e uma notificação será preparada para envio via WhatsApp para sua empresa.</AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                      <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={() => handleUpdateStatus(orcamento.id, 'Aceito')}>Sim, Aceitar</AlertDialogAction>
                                                  </AlertDialogFooter>
                                              </AlertDialogContent>
                                          </AlertDialog>
                                      </>
                                  )}
                                   <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                                      </AlertDialogTrigger>
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
                              </div>

                              {/* Mobile View Buttons */}
                              <div className="flex w-full items-center justify-end gap-2 md:hidden">
                                {orcamento.status === 'Pendente' ? (
                                    <>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="flex-1"><XCircle className="mr-2 h-4 w-4"/>Recusar</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Confirmar Recusa</AlertDialogTitle><AlertDialogDescription>Tem certeza de que deseja recusar este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleUpdateStatus(orcamento.id, 'Recusado')}>Sim, Recusar</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button size="sm" className="flex-1"><CheckCircle2 className="mr-2 h-4 w-4"/>Aceitar</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Confirmar Aceite</AlertDialogTitle><AlertDialogDescription>Ao aceitar, o status será atualizado e uma notificação será preparada para envio via WhatsApp para sua empresa.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={() => handleUpdateStatus(orcamento.id, 'Aceito')}>Sim, Aceitar</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="flex-1"><FileText className="mr-2 h-4 w-4" />Gerar PDF</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleGerarPDF(orcamento)}>Para o Cliente</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGerarPDFInterno(orcamento)}>Uso Interno</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    {orcamento.status === 'Pendente' && (
                                        <>
                                        <DropdownMenuItem onClick={() => handleOpenEditBudgetModal(orcamento)}>
                                            <Pencil className="mr-2 h-4 w-4" />Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        </>
                                    )}
                                    
                                    <DropdownMenuItem onClick={() => handleEnviarWhatsApp(orcamento)} disabled={!orcamento.cliente.telefones.some(t => t.numero)}>
                                        <MessageCircle className="mr-2 h-4 w-4" />Enviar Proposta
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Gerar PDF
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => handleGerarPDF(orcamento)}>Para o Cliente</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleGerarPDFInterno(orcamento)}>Uso Interno</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />Excluir
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este orçamento permanentemente? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleRemoverOrcamento(orcamento.id)}>Sim, Excluir</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                          </CardFooter>
                      </Card>
                    )
                  })
                ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {clienteIdParam ? `Nenhum orçamento encontrado para ${clienteFiltrado?.nome}.` : "Nenhum orçamento encontrado para sua busca."}
                    </p>
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
                    <div className="md:col-span-2 space-y-2">
                        <Label>Telefones</Label>
                        <RadioGroup
                          value={clienteData.telefones.findIndex(t => t.principal).toString()}
                          onValueChange={(value) => handleClientPrincipalTelefoneChange(parseInt(value, 10))}
                          className="space-y-2"
                        >
                            {clienteData.telefones.map((tel, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <RadioGroupItem value={index.toString()} id={`client-tel-principal-${index}`} />
                                  <Input className="flex-1" value={tel.nome} onChange={(e) => handleClientTelefoneChange(index, 'nome', e.target.value)} placeholder="Ex: Principal" />
                                  <Input className="flex-1" value={tel.numero} onChange={(e) => handleClientTelefoneChange(index, 'numero', e.target.value)} placeholder="(DD) XXXXX-XXXX" />
                                  <Button type="button" variant="ghost" size="icon" onClick={() => handleClientRemoveTelefone(index)} disabled={clienteData.telefones.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                        </RadioGroup>
                      <Button type="button" variant="outline" size="sm" onClick={handleClientAddTelefone}><PlusCircle className="mr-2 h-4 w-4"/>Add Telefone</Button>
                  </div>
                  <div className="space-y-2 md:col-span-2"><Label htmlFor="cliente-endereco">Endereço</Label><Input id="cliente-endereco" name="endereco" value={clienteData.endereco} onChange={handleClienteDataChange} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente-cpfCnpj">CPF/CNPJ</Label>
                    <Input id="cliente-cpfCnpj" name="cpfCnpj" value={clienteData.cpfCnpj || ''} onChange={handleClienteDataChange} placeholder="XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX" />
                  </div>
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
                    // Formulário para Item Avulso
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div className="lg:col-span-2"><Label htmlFor="avulso-desc">Descrição</Label><Input id="avulso-desc" value={itemAvulso.descricao} onChange={e => setItemAvulso(p => ({...p, descricao: e.target.value}))} /></div>
                      <div><Label htmlFor="avulso-qtd">Qtd.</Label><Input id="avulso-qtd" value={itemAvulso.quantidade} onChange={e => setItemAvulso(p => ({...p, quantidade: e.target.value.replace(/[^0-9,]/g, '')}))} placeholder="1" /></div>
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
                    // Formulário para Item da Lista
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
                          <div><Label htmlFor="margem-lucro">Acréscimo (%)</Label><Input id="margem-lucro" type="text" inputMode='decimal' placeholder="10" value={margemLucroStr} onChange={e => handleNovoItemChange('margemLucro', e.target.value)} /></div>
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
            {wizardStep === 2 && (
                <Button onClick={handleConfirmSave} disabled={isSubmitting || orcamentoItens.length === 0}>
                    {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2"/>} Salvar Orçamento
                </Button>
            )}
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

      <AlertDialog open={isExpiredModalOpen} onOpenChange={setIsExpiredModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-warning" />
              Orçamentos Vencidos
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os seguintes orçamentos expiraram e seus status foram atualizados para &quot;Vencido&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {expiredBudgets.map(orc => (
                <li key={orc.id} className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Nº {orc.numeroOrcamento}</span> para <span className="font-semibold text-foreground">{orc.cliente.nome}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsExpiredModalOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </Dialog>
      
      <Dialog open={isEditBudgetModalOpen} onOpenChange={setIsEditBudgetModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Orçamento #{editingBudget?.numeroOrcamento}</DialogTitle>
            <DialogDescription>
              Ajuste os dados do cliente e os itens do orçamento. O status não pode ser alterado aqui.
            </DialogDescription>
          </DialogHeader>

          {editingBudget && (
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto p-1 pr-4">
              {/* Client Data Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados do Cliente</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-cliente-nome">Nome</Label>
                  <Input id="edit-cliente-nome" name="nome" value={editingBudget.cliente.nome} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cliente-endereco">Endereço</Label>
                  <Input id="edit-cliente-endereco" name="endereco" value={editingBudget.cliente.endereco} onChange={handleEditingBudgetClientChange} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="edit-validade-dias">Validade da Proposta (dias)</Label>
                  <Input id="edit-validade-dias" type="number" value={editingBudget.validadeDias} onChange={(e) => setEditingBudget(prev => prev ? {...prev, validadeDias: e.target.value} : null)} placeholder="Ex: 7" />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Itens do Orçamento</h3>
                
                {/* Form to add new items */}
                <div className="p-2 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{isAddingAvulsoInEdit ? 'Novo Item Avulso' : 'Novo Item da Lista'}</Label>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsAddingAvulsoInEdit(!isAddingAvulsoInEdit)}>
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </div>

                  {isAddingAvulsoInEdit ? (
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div className="col-span-2"><Label htmlFor="edit-avulso-desc" className="text-xs">Descrição</Label><Input id="edit-avulso-desc" className="h-8" value={itemAvulsoInEdit.descricao} onChange={e => setItemAvulsoInEdit(p => ({...p, descricao: e.target.value}))} /></div>
                      <div><Label htmlFor="edit-avulso-qtd" className="text-xs">Qtd</Label><Input id="edit-avulso-qtd" className="h-8" value={itemAvulsoInEdit.quantidade} onChange={e => setItemAvulsoInEdit(p => ({...p, quantidade: e.target.value.replace(/[^0-9,]/g, '')}))} placeholder="1" /></div>
                      <div>
                        <Label htmlFor="edit-avulso-un" className="text-xs">Unidade</Label>
                        <Select value={itemAvulsoInEdit.unidade} onValueChange={(value) => setItemAvulsoInEdit(p => ({...p, unidade: value}))}>
                          <SelectTrigger id="edit-avulso-un" className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="edit-avulso-preco" className="text-xs">Preço Final (R$)</Label>
                        <Input id="edit-avulso-preco" className="h-8" value={itemAvulsoInEditPrecoStr} onChange={e => setItemAvulsoInEditPrecoStr(maskCurrency(e.target.value))} placeholder="R$ 50,00" />
                      </div>
                      <div className="col-span-2"><Button onClick={handleAddItemAvulsoToEditBudget} size="sm" className="w-full h-8"><PlusCircle className="mr-1 h-4 w-4" />Add Avulso</Button></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                      <div className="col-span-2 lg:col-span-2">
                        <Label htmlFor="edit-material-select" className="text-xs">Novo Item</Label>
                        <Select value={newItemForEdit.materialId} onValueChange={(val) => handleNewItemForEditChange('materialId', val)}>
                          <SelectTrigger id="edit-material-select" className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {materiais.map(mat => (<SelectItem key={mat.id} value={mat.id}>{`${mat.descricao} (${formatCurrency(mat.precoUnitario)}/${mat.unidade})`}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedMaterialForEdit && (
                        <>
                          <div><Label htmlFor="edit-quantidade-novo" className="text-xs">Qtd</Label><Input id="edit-quantidade-novo" className="h-8" type="text" inputMode='decimal' value={newItemQtyStr} onChange={e => handleNewItemForEditChange('quantidade', e.target.value)} /></div>
                          <div><Label htmlFor="edit-margem-novo" className="text-xs">Acr.(%)</Label><Input id="edit-margem-novo" className="h-8" type="text" inputMode='decimal' value={newItemMarginStr} onChange={e => handleNewItemForEditChange('margemLucro', e.target.value)} /></div>
                          <div><Button onClick={handleAddItemToEditBudget} size="sm" className="w-full h-8"><PlusCircle className="mr-1 h-4 w-4" />Add</Button></div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Table of existing items */}
                <div className="overflow-x-auto">
                   <Table>
                      <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Venda</TableHead><TableHead className="w-[80px] text-center">Ações</TableHead></TableRow></TableHeader>
                      <TableBody>
                      {editingBudgetItens.map(item => (
                          <TableRow key={item.id}>
                              <TableCell className="py-2">
                                <p className="font-medium">{item.materialNome}</p>
                                <p className="text-xs text-muted-foreground">{formatNumber(item.quantidade, 2)} {item.unidade} x {formatCurrency(item.precoUnitario)} + {formatNumber(item.margemLucro)}%</p>
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary py-2">{formatCurrency(item.precoVenda)}</TableCell>
                              <TableCell className="flex justify-center gap-1 py-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItemClick(item, 'modal')}><Pencil className="h-4 w-4 text-primary" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItemFromEditBudget(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </TableCell>
                          </TableRow>
                      ))}
                      </TableBody>
                       <TableTotalFooter>
                          <TableRow className="bg-muted/50 font-bold text-base">
                              <TableCell>TOTAL</TableCell>
                              <TableCell className="text-right text-primary">{formatCurrency(editingBudgetItens.reduce((acc, item) => acc + item.precoVenda, 0))}</TableCell>
                              <TableCell></TableCell>
                          </TableRow>
                      </TableTotalFooter>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 border-t">
             <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleUpdateBudget} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <CheckCircle2 className="mr-2"/>} Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhoneSelectionOpen} onOpenChange={setIsPhoneSelectionOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Selecionar Telefone</DialogTitle>
                  <DialogDescription>
                      Sua empresa tem múltiplos telefones. Para qual número devemos enviar a notificação de aceite?
                  </DialogDescription>
              </DialogHeader>
              <RadioGroup value={selectedPhone} onValueChange={setSelectedPhone} className="my-4 space-y-2">
                  {empresa?.telefones?.map((tel, index) => (
                      <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={tel.numero} id={`tel-${index}`} />
                          <Label htmlFor={`tel-${index}`} className="flex-1 cursor-pointer">
                              <span className="font-semibold">{tel.nome || `Telefone ${index + 1}`}</span>
                              <span className="text-muted-foreground ml-2">{tel.numero}</span>
                          </Label>
                      </div>
                  ))}
              </RadioGroup>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPhoneSelectionOpen(false)}>Cancelar</Button>
                  <Button onClick={handleConfirmPhoneSelection}>Confirmar e Enviar</Button>
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
