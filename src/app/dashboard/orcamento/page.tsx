
'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react';

import type { ClienteData, Orcamento } from '@/lib/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

import {
  addOrcamento,
  deleteOrcamento,
  getNextOrcamentoNumber,
  updateOrcamento,
  updateOrcamentoStatus,
} from '@/services/orcamentosService';
import { updateEstoque } from '@/services/materiaisService';
import { addCliente } from '@/services/clientesService';


import {
  addDays,
  parseISO,
  differenceInHours,
  isPast,
} from 'date-fns';

import { useSearchParams, useRouter } from 'next/navigation';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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

  // =========================
  // DADOS OFFLINE (DEXIE)
  // =========================
  const materiais = useLiveQuery(
    () =>
      user
        ? db.materiais
            .where('userId')
            .equals(user.uid)
            .sortBy('data.descricao')
        : [],
    [user]
  )?.map(m => m.data);

  const clientes = useLiveQuery(
    () =>
      user
        ? db.clientes
            .where('userId')
            .equals(user.uid)
            .sortBy('data.nome')
        : [],
    [user]
  )?.map(c => c.data);

  const orcamentosSalvos = useLiveQuery(
    () =>
      user
        ? db.orcamentos
            .where('userId')
            .equals(user.uid)
            .sortBy('data.dataCriacao')
            .then(list => list.reverse())
        : [],
    [user]
  )?.map(o => o.data);

  const empresa = useLiveQuery(
    () => (user ? db.empresa.get(user.uid) : undefined),
    [user]
  )?.data;

  // =========================
  // STATE UI
  // =========================
  const [clienteFiltrado, setClienteFiltrado] =
    useState<ClienteData | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBudget, setEditingBudget] =
    useState<Orcamento | null>(null);

  const budgetPdfRef = useRef<{
    gerarPDF: (
      orcamento: Orcamento,
      type: 'client' | 'internal'
    ) => void;
  }>(null);

  const isLoading =
    loadingAuth ||
    !materiais ||
    !clientes ||
    !orcamentosSalvos ||
    empresa === undefined;

  // =========================
  // FILTRO POR CLIENTE (URL)
  // =========================
  useEffect(() => {
    if (!clienteIdParam || !clientes) {
      setClienteFiltrado(null);
      return;
    }

    const cliente = clientes.find(
      c => c.id === clienteIdParam
    );
    setClienteFiltrado(cliente || null);
  }, [clienteIdParam, clientes]);

  // =========================
  // PERMISSÃO DE NOTIFICAÇÃO
  // =========================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    LocalNotifications.checkPermissions().then(
      result => {
        if (result.display !== 'granted') {
          LocalNotifications.requestPermissions();
        }
      }
    );
  }, []);

  // =========================
  // NOTIFICAÇÃO E STATUS DE VENCIMENTO
  // =========================
  useEffect(() => {
    if (!orcamentosSalvos || !user) return;
  
    const now = new Date();
  
    orcamentosSalvos.forEach(async orc => {
      if (orc.status !== 'Pendente') return;
  
      const validade = Number(orc.validadeDias);
      if (!validade) return;
  
      const dataCriacao = parseISO(orc.dataCriacao);
      const dataValidade = addDays(dataCriacao, validade);
      
      // Atualiza para "Vencido" se a data já passou
      if (isPast(dataValidade)) {
        await updateOrcamentoStatus(orc.id, 'Vencido', {});
        return; // Pula para o próximo
      }
  
      // Envia notificação se estiver a 24h de vencer (e se for app nativo)
      if (Capacitor.isNativePlatform() && !orc.notificacaoVencimentoEnviada) {
        const horas = differenceInHours(dataValidade, now);
        if (horas > 0 && horas <= 24) {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now(),
                title: 'Orçamento quase vencendo',
                body: `Orçamento #${orc.numeroOrcamento} - ${orc.cliente.nome}`,
                schedule: { at: new Date(Date.now() + 1000) },
              },
            ],
          });
          await updateOrcamento(orc.id, { notificacaoVencimentoEnviada: true });
        }
      }
    });
  }, [orcamentosSalvos, user]);

  // =========================
  // FILTRO LISTA
  // =========================
  const filteredOrcamentos = useMemo(() => {
    if (!orcamentosSalvos) return [];

    let list = [...orcamentosSalvos];

    if (clienteIdParam) {
      list = list.filter(
        o => o.cliente.id === clienteIdParam
      );
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        o =>
          o.cliente.nome.toLowerCase().includes(s) ||
          o.numeroOrcamento?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [orcamentosSalvos, searchTerm, clienteIdParam]);

  // =========================
  // HANDLERS
  // =========================
  const handleSaveBudget = async (
    data: Omit<Orcamento, 'id'>,
    saveNewClient: boolean
  ) => {
    if (!user) return;
  
    let finalClientData = data.cliente;
  
    // Se for um novo cliente a ser salvo
    if (saveNewClient && !data.cliente.id) {
      try {
        const newClientId = await addCliente(user.uid, data.cliente);
        finalClientData = { ...data.cliente, id: newClientId };
        toast({ title: 'Novo cliente salvo com sucesso!' });
      } catch (error) {
        console.error("Erro ao salvar novo cliente:", error);
        toast({ title: 'Erro ao salvar o novo cliente', variant: 'destructive' });
        return; // Interrompe se não conseguir salvar o cliente
      }
    }
    
    const numero = await getNextOrcamentoNumber(user.uid);
  
    await addOrcamento({
      ...data,
      cliente: finalClientData, // Usa os dados do cliente (novo ou existente)
      numeroOrcamento: numero,
      userId: user.uid,
    });
  
    toast({ title: 'Orçamento salvo com sucesso' });
    setIsWizardOpen(false);
  };

  const handleUpdateBudget = async (budget: Orcamento) => {
    if (!user) return;

    const { id, ...data } = budget;
    await updateOrcamento(id, data);

    toast({ title: 'Orçamento atualizado com sucesso' });
  };

  const handleUpdateStatus = async (
    budgetId: string,
    status: 'Aceito' | 'Recusado'
  ) => {
    if (!user) return;

    const now = new Date().toISOString();

    await updateOrcamentoStatus(budgetId, status, {
      ...(status === 'Aceito'
        ? { dataAceite: now }
        : { dataRecusa: now }),
    });

    if (status === 'Aceito') {
      const budget = orcamentosSalvos?.find(
        o => o.id === budgetId
      );

      if (budget) {
        for (const item of budget.itens) {
          if (!item.materialId.startsWith('avulso-')) {
            try {
              await updateEstoque(
                user.uid,
                item.materialId,
                item.quantidade
              );
            } catch (err) {
              console.error(
                'Erro ao atualizar estoque:',
                err
              );
            }
          }
        }
      }
    }

    toast({
      title: `Orçamento ${status.toLowerCase()}`,
    });
  };

  const handleGerarPDF = (
    orc: Orcamento,
    type: 'client' | 'internal'
  ) => {
    budgetPdfRef.current?.gerarPDF(orc, type);
  };

  const handleClearFilter = () => {
    router.push('/dashboard/orcamento');
    setSearchTerm('');
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meus Orçamentos</CardTitle>
          <CardDescription>
            {clienteFiltrado
              ? `Filtrando orçamentos para ${clienteFiltrado.nome}`
              : 'Crie e gerencie seus orçamentos, mesmo offline.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => setIsWizardOpen(true)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
            <div className="flex-grow">
              <BudgetHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                showClearFilter={!!clienteFiltrado}
                onClearFilter={handleClearFilter}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <BudgetList
        isLoading={isLoading}
        budgets={filteredOrcamentos}
        empresa={empresa || null}
        onGeneratePDF={handleGerarPDF}
        onEdit={setEditingBudget}
        onDelete={deleteOrcamento}
        onUpdateStatus={handleUpdateStatus}
        clienteFiltrado={clienteFiltrado}
      />

      {isWizardOpen && clientes && materiais && (
        <BudgetWizard
          isOpen
          onOpenChange={setIsWizardOpen}
          clientes={clientes}
          materiais={materiais}
          onSaveBudget={handleSaveBudget}
        />
      )}

      {editingBudget && materiais && (
        <BudgetEditDialog
          isOpen
          onOpenChange={open =>
            !open && setEditingBudget(null)
          }
          budget={editingBudget}
          materiais={materiais}
          onUpdateBudget={handleUpdateBudget}
        />
      )}

      <BudgetPDFs
        ref={budgetPdfRef}
        empresa={empresa || null}
      />
    </div>
  );
}
