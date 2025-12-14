
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { MaterialItem, EmpresaData, ClienteData, Orcamento } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, History, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { updateEstoque } from '@/services/materiaisService';
import { addCliente, updateCliente } from '@/services/clientesService';
import { addOrcamento, deleteOrcamento, getNextOrcamentoNumber, updateOrcamento, updateOrcamentoStatus } from '@/services/orcamentosService';
import { addDays, parseISO, isBefore, startOfToday, differenceInHours } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';

import { BudgetHeader } from './_components/budget-header';
import { BudgetList } from './_components/budget-list';
import { BudgetWizard } from './_components/budget-wizard';
import { BudgetEditDialog } from './_components/budget-edit-dialog';
import { BudgetPDFs } from './_components/budget-pdfs';


export default function OrcamentoPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clienteIdParam = searchParams.get('clienteId');

  // --- Live Queries from Dexie ---
  const materiais = useLiveQuery(() => 
    user ? db.materiais.where('userId').equals(user.uid).sortBy('data.descricao') : [],
    [user]
  )?.map(m => m.data);

  const clientes = useLiveQuery(() =>
    user ? db.clientes.where('userId').equals(user.uid).sortBy('data.nome') : [],
    [user]
  )?.map(c => c.data);

  const orcamentosSalvos = useLiveQuery(() =>
    user ? db.orcamentos.where('userId').equals(user.uid).sortBy('data.dataCriacao').then(os => os.reverse()) : [],
    [user]
  )?.map(o => o.data);

  const empresa = useLiveQuery(() =>
    user ? db.empresa.get(user.uid) : undefined,
    [user]
  )?.data;

  // --- Local State ---
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
  const [expiredBudgets, setExpiredBudgets] = useState<Orcamento[]>([]);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);

  const isLoading = loadingAuth || materiais === undefined || clientes === undefined || orcamentosSalvos === undefined || empresa === undefined;
  
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
    if (!orcamentosSalvos || orcamentosSalvos.length === 0) return;
    const now = new Date();

    orcamentosSalvos.forEach(orcamento => {
      if (orcamento.status !== 'Pendente') return;

      const dataCriacao = parseISO(orcamento.dataCriacao);
      const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
      if (isNaN(validadeDiasNum)) return;

      const dataValidade = addDays(dataCriacao, validadeDiasNum);
      const hoursUntilExpiry = differenceInHours(dataValidade, now);

      if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 24) {
        scheduleNotification(orcamento, 'expiring');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentosSalvos]);

  useEffect(() => {
    if (orcamentosSalvos && orcamentosSalvos.length > 0) {
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
        budgetsToExpire.forEach(orcamento => {
          updateOrcamentoStatus(orcamento.id, 'Vencido', { dataRecusa: null, dataAceite: null });
          scheduleNotification(orcamento, 'expired');
        });
        setExpiredBudgets(budgetsToExpire);
        setIsExpiredModalOpen(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentosSalvos]);

  const filteredOrcamentos = useMemo(() => {
    if (!orcamentosSalvos) return [];
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
  
  const handleOpenWizard = () => {
    setIsWizardOpen(true);
  };
  
  const handleUpdateStatus = async (budgetId: string, status: 'Aceito' | 'Recusado') => {
    if (!user || !materiais) return null;
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
        
        const acceptedBudget = orcamentosSalvos?.find(b => b.id === budgetId);
        if (status === 'Aceito' && acceptedBudget) {
            for (const item of acceptedBudget.itens) {
                const materialOriginal = materiais.find(m => m.id === item.materialId);
                if (materialOriginal && materialOriginal.tipo === 'item') {
                    try { await updateEstoque(user.uid, item.materialId, item.quantidade); } 
                    catch (error: any) { toast({ title: 'Erro ao atualizar estoque', description: error.message, variant: 'destructive' }); }
                }
            }
            return acceptedBudget; 
        }
        toast({ title: `Orçamento ${status.toLowerCase()}!` });
    } catch(error) {
        toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
    return null;
  }
  
  const handleRemoverOrcamento = (id: string) => {
    if (!user) return;
    deleteOrcamento(id).then(() => {
        toast({ title: 'Orçamento Excluído', description: 'A exclusão será sincronizada.', variant: 'destructive' });
    }).catch(error => {
        toast({ title: 'Erro ao excluir orçamento', variant: 'destructive'});
        console.error(error)
    })
  };

  const handleOpenEditBudgetModal = (orcamento: Orcamento) => {
    setEditingBudget({ ...orcamento });
    setIsEditBudgetModalOpen(true);
  };
  
  const handleUpdateBudget = async (budget: Orcamento) => {
    if (!user) return;
    setIsEditBudgetModalOpen(false);
    try {
        await updateOrcamento(budget.id, budget);
        if (budget.cliente.id && !budget.cliente.id.startsWith('temp_')) {
          await updateCliente(budget.cliente.id, {
            endereco: budget.cliente.endereco,
          });
        }
        toast({title: "Orçamento atualizado e pendente de sincronização."});
    } catch (error) {
        toast({title: "Erro ao atualizar o orçamento", variant: "destructive"});
        console.error(error);
    }
  };

  const handleSaveBudget = async (budgetData: Omit<Orcamento, 'id'>) => {
    if (!user) return;
    try {
      let finalClient = budgetData.cliente;
      if (!finalClient.id || finalClient.id.startsWith('temp_')) {
        const newClientId = await addCliente(user.uid, {
          nome: finalClient.nome,
          cpfCnpj: finalClient.cpfCnpj,
          endereco: finalClient.endereco,
          telefones: finalClient.telefones,
          email: finalClient.email,
        });
        finalClient = { ...finalClient, id: newClientId, userId: user.uid };
        toast({ title: "Novo cliente salvo localmente!" });
      }

      const numeroOrcamento = await getNextOrcamentoNumber(user.uid);
      const newBudget: Omit<Orcamento, "id"> = {
        ...budgetData,
        userId: user.uid,
        numeroOrcamento,
        cliente: finalClient,
      };

      await addOrcamento(newBudget);
      toast({ title: `Orçamento salvo e pendente de sincronização!` });
      setIsWizardOpen(false);

    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      toast({ title: "Erro ao salvar orçamento", variant: "destructive" });
    }
  };
  
  const clienteFiltrado = clienteIdParam ? (clientes?.find(c => c.id === clienteIdParam) ?? null) : null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Meus Orçamentos</CardTitle>
          <CardDescription>Crie e gerencie seus orçamentos, mesmo offline.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleOpenWizard} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Orçamento
          </Button>
        </CardContent>
      </Card>
      
      {!isLoading && (orcamentosSalvos && (orcamentosSalvos.length > 0 || searchTerm || clienteIdParam)) && (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><History className="h-6 w-6"/> Histórico de Orçamentos</CardTitle>
                        <CardDescription className="mt-2">
                        {clienteIdParam && clienteFiltrado ? `Exibindo orçamentos para ${clienteFiltrado.nome}.` : "Gerencie os orçamentos salvos, aprove, recuse e envie para seus clientes."}
                        </CardDescription>
                    </div>
                    <BudgetHeader
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        isRefreshing={isRefreshing}
                        onRefresh={() => { /* Sincronização é automática */ }}
                        showClearFilter={!!clienteIdParam}
                        onClearFilter={() => router.push('/dashboard/orcamento')}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <BudgetList
                    isLoading={isLoading}
                    budgets={filteredOrcamentos}
                    empresa={empresa || null}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleRemoverOrcamento}
                    onEdit={handleOpenEditBudgetModal}
                    clienteFiltrado={clienteFiltrado}
                />
            </CardContent>
        </Card>
      )}

      {isWizardOpen && (
        <BudgetWizard
            isOpen={isWizardOpen}
            onOpenChange={setIsWizardOpen}
            clientes={clientes || []}
            materiais={materiais || []}
            onSaveBudget={handleSaveBudget}
        />
      )}
      
      {editingBudget && (
        <BudgetEditDialog
            isOpen={isEditBudgetModalOpen}
            onOpenChange={setIsEditBudgetModalOpen}
            budget={editingBudget}
            materiais={materiais || []}
            onUpdateBudget={handleUpdateBudget}
        />
      )}

      <AlertDialog open={isExpiredModalOpen} onOpenChange={setIsExpiredModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
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
      </AlertDialog>
      
      <BudgetPDFs empresa={empresa || null} />

    </div>
  );
}
