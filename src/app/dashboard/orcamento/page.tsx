'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ClienteData, Orcamento } from '@/lib/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, History, AlertTriangle } from 'lucide-react';

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
import { updateCliente } from '@/services/clientesService';
import { updateEstoque } from '@/services/materiaisService';

import {
  addDays,
  parseISO,
  isBefore,
  startOfToday,
  differenceInHours,
} from 'date-fns';

import { useSearchParams, useRouter } from 'next/navigation';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  // DEXIE (OFFLINE)
  // =========================
  const materiais = useLiveQuery(
    () => (user ? db.materiais.where('userId').equals(user.uid).sortBy('data.descricao') : []),
    [user]
  )?.map(m => m.data);

  const clientes = useLiveQuery(
    () => (user ? db.clientes.where('userId').equals(user.uid).sortBy('data.nome') : []),
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
  // STATE
  // =========================
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
  const [expiredBudgets, setExpiredBudgets] = useState<Orcamento[]>([]);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);

  const budgetPdfRef = useRef<{
    handleGerarPDF: (orcamento: Orcamento, type: 'client' | 'internal') => void;
  }>(null);

  const isLoading =
    loadingAuth ||
    !materiais ||
    !clientes ||
    !orcamentosSalvos ||
    !empresa;

  // =========================
  // PERMISSÃO DE NOTIFICAÇÃO
  // =========================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    LocalNotifications.checkPermissions().then(result => {
      if (result.display !== 'granted') {
        LocalNotifications.requestPermissions();
      }
    });
  }, []);

  // =========================
  // NOTIFICAÇÕES
  // =========================
  const scheduleNotification = async (
    orcamento: Orcamento,
    type: 'expiring' | 'expired'
  ) => {
    if (!Capacitor.isNativePlatform()) return;

    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;

    const key = `notif_${type}_${orcamento.id}`;
    if (localStorage.getItem(key)) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title:
            type === 'expiring'
              ? 'Orçamento quase vencendo'
              : 'Orçamento vencido',
          body: `Orçamento #${orcamento.numeroOrcamento} - ${orcamento.cliente.nome}`,
          schedule: { at: new Date(Date.now() + 1000) },
        },
      ],
    });

    localStorage.setItem(key, '1');
  };

  // =========================
  // VERIFICA VENCIMENTO
  // =========================
  useEffect(() => {
    if (!orcamentosSalvos) return;

    const now = new Date();

    orcamentosSalvos.forEach(orc => {
      if (orc.status !== 'Pendente') return;

      const validade = parseInt(orc.validadeDias, 10);
      if (isNaN(validade)) return;

      const dataCriacao = parseISO(orc.dataCriacao);
      const dataValidade = addDays(dataCriacao, validade);
      const horas = differenceInHours(dataValidade, now);

      if (horas > 0 && horas <= 24) {
        scheduleNotification(orc, 'expiring');
      }
    });
  }, [orcamentosSalvos]);

  // =========================
  // FILTROS
  // =========================
  const filteredOrcamentos = useMemo(() => {
    if (!orcamentosSalvos) return [];

    let list = orcamentosSalvos;

    if (clienteIdParam) {
      list = list.filter(o => o.cliente.id === clienteIdParam);
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
  const handleSaveBudget = async (data: Omit<Orcamento, 'id'>) => {
    if (!user) return;

    const numero = await getNextOrcamentoNumber(user.uid);

    await addOrcamento({
      ...data,
      numeroOrcamento: numero,
      userId: user.uid,
    });

    toast({ title: 'Orçamento salvo (offline)' });
    setIsWizardOpen(false);
  };

  const handleGerarPDF = (orc: Orcamento, type: 'client' | 'internal') => {
    budgetPdfRef.current?.handleGerarPDF(orc, type);
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
            Crie e gerencie seus orçamentos, mesmo offline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsWizardOpen(true)} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </CardContent>
      </Card>

      <BudgetList
        isLoading={isLoading}
        budgets={filteredOrcamentos}
        empresa={empresa || null}
        onGeneratePDF={handleGerarPDF}
        onEdit={setEditingBudget}
        onDelete={deleteOrcamento}
      />

      {isWizardOpen && (
        <BudgetWizard
          isOpen
          onOpenChange={setIsWizardOpen}
          clientes={clientes || []}
          materiais={materiais || []}
          onSaveBudget={handleSaveBudget}
        />
      )}

      <BudgetPDFs ref={budgetPdfRef} empresa={empresa || null} />
    </div>
  );
}
