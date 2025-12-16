'use client';

import React, { useState, useMemo } from 'react';
import type { ClienteData } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addCliente, deleteCliente, updateCliente } from '@/services/clientesService';
import { useRouter } from 'next/navigation';
import { Accordion } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';

import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';

import ClientForm from './_components/client-form';
import ClientList from './_components/client-list';
import ClientModals from './_components/client-modals';
import type { SelectedContactDetails, BudgetCounts } from './_components/client-list';

/* -------------------------------------------------------------------------- */
/* ESTADO INICIAL                                                             */
/* -------------------------------------------------------------------------- */

const initialNewClientState: Omit<ClienteData, 'id' | 'userId'> = {
  nome: '',
  cpfCnpj: '',
  endereco: '',
  telefones: [{ nome: 'Principal', numero: '' }],
  email: '',
};

export default function ClientesPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  /* -------------------------------------------------------------------------- */
  /* DADOS LOCAIS (DEXIE)                                                        */
  /* -------------------------------------------------------------------------- */

  const clientes = useLiveQuery(
    () =>
      user
        ? db.clientes
            .where('userId')
            .equals(user.uid)
            .sortBy('nome')
        : [],
    [user]
  )?.map(c => ({ ...c.data, id: c.id }));

  const orcamentos = useLiveQuery(
    () =>
      user
        ? db.orcamentos
            .where('userId')
            .equals(user.uid)
            .toArray()
        : [],
    [user]
  )?.map(o => o.data);

  const isLoadingData =
    loadingAuth || clientes === undefined || orcamentos === undefined;

  /* -------------------------------------------------------------------------- */
  /* STATES                                                                     */
  /* -------------------------------------------------------------------------- */

  const [newClient, setNewClient] = useState(initialNewClientState);
  const [editingClient, setEditingClient] = useState<ClienteData | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClienteData | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] =
    useState(false);
  const [selectedContactDetails, setSelectedContactDetails] =
    useState<SelectedContactDetails | null>(null);

  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [isApiNotSupportedAlertOpen, setIsApiNotSupportedAlertOpen] =
    useState(false);
  const [deleteErrorAlert, setDeleteErrorAlert] = useState({
    isOpen: false,
    message: '',
  });

  /* -------------------------------------------------------------------------- */
  /* FILTRO E CONTAGEM                                                          */
  /* -------------------------------------------------------------------------- */

  const filteredClientes = useMemo(() => {
    if (!clientes) return [];
    if (!searchTerm) return clientes;
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  const budgetCountsByClient = useMemo(() => {
    const counts: Record<string, BudgetCounts> = {};
    if (!clientes || !orcamentos) return counts;

    clientes.forEach(c => {
      counts[c.id!] = {
        Pendente: 0,
        Aceito: 0,
        Recusado: 0,
        Vencido: 0,
        Total: 0,
      };
    });

    orcamentos.forEach(o => {
      const id = o.cliente.id;
      if (id && counts[id]) {
        counts[id][o.status]++;
        counts[id].Total++;
      }
    });

    return counts;
  }, [clientes, orcamentos]);

  /* -------------------------------------------------------------------------- */
  /* CRUD CLIENTE                                                               */
  /* -------------------------------------------------------------------------- */

  const handleAdicionarCliente = async (
    data: Omit<ClienteData, 'id' | 'userId'>
  ) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await addCliente(user.uid, {
        ...data,
        telefones: data.telefones.filter(t => t.numero.trim()),
      });

      setNewClient(initialNewClientState);
      toast({ title: 'Cliente adicionado com sucesso' });
    } catch (e) {
      toast({ title: 'Erro ao adicionar cliente', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSalvarEdicao = async (client: ClienteData) => {
    if (!client.id) return;

    setIsSubmitting(true);
    try {
      const { id, userId, ...data } = client;

      await updateCliente(id, {
        ...data,
        telefones: data.telefones.filter(t => t.numero.trim()),
      });

      setEditingClient(null);
      toast({ title: 'Cliente atualizado' });
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmarRemocao = async () => {
    if (!clientToDelete?.id) return;

    try {
      await deleteCliente(clientToDelete.id);
      toast({ title: 'Cliente removido', variant: 'destructive' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    } finally {
      setClientToDelete(null);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* IMPORTAÇÃO DE CONTATOS (WEB + APK)                                          */
  /* -------------------------------------------------------------------------- */

  const normalizePhone = (tel: string) =>
    tel.replace(/\D/g, '').replace(/^55/, '');

  const handleImportContacts = async () => {
    const isNative = Capacitor.isNativePlatform();

    /* ----------------------------- ANDROID APK ----------------------------- */
    if (isNative) {
      try {
        const perm = await Contacts.requestPermissions();
        if (perm.contacts !== 'granted') {
          toast({
            title: 'Permissão negada',
            description: 'Permita acesso aos contatos.',
            variant: 'destructive',
          });
          return;
        }

        const result = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true,
            emails: true,
            postalAddresses: true,
          },
        });

        const contact = result.contacts[0];
        if (!contact) return;

        setNewClient({
          nome: contact.name?.display || 'Sem nome',
          email: contact.emails?.[0]?.address || '',
          telefones: [
            {
              nome: 'Principal',
              numero: normalizePhone(contact.phones?.[0]?.number || ''),
            },
          ],
          endereco: contact.postalAddresses?.[0]?.street || '',
          cpfCnpj: '',
        });

        toast({ title: 'Contato importado do celular' });
      } catch {
        toast({
          title: 'Erro ao importar contatos',
          variant: 'destructive',
        });
      }
      return;
    }

    /* ---------------------------------- WEB --------------------------------- */
    if (!('contacts' in navigator)) {
      setIsApiNotSupportedAlertOpen(true);
      return;
    }

    try {
      const contacts = await (navigator as any).contacts.select(
        ['name', 'email', 'tel', 'address'],
        { multiple: false }
      );

      const c = contacts[0];
      if (!c) return;

      setNewClient({
        nome: c.name?.[0] || '',
        email: c.email?.[0] || '',
        telefones: [
          { nome: 'Principal', numero: normalizePhone(c.tel?.[0] || '') },
        ],
        endereco: c.address?.[0] || '',
        cpfCnpj: '',
      });

      toast({ title: 'Contato importado' });
    } catch {
      setIsApiNotSupportedAlertOpen(true);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* UI                                                                         */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Clientes
          </CardTitle>
          <CardDescription>
            Cadastre, edite e importe clientes da agenda do celular.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Accordion type="single" collapsible>
            <ClientForm
              initialData={newClient}
              onSubmit={handleAdicionarCliente}
              onImportContacts={handleImportContacts}
              isSubmitting={isSubmitting}
              triggerTitle="Adicionar Cliente"
            />
          </Accordion>

          {isLoadingData ? (
            <Skeleton className="h-40 w-full mt-6" />
          ) : (
            <ClientList
              clientes={filteredClientes}
              budgetCounts={budgetCountsByClient}
              onEdit={setEditingClient}
              onDelete={setClientToDelete}
              onViewBudgets={id =>
                router.push(`/dashboard/orcamento?clienteId=${id}`)
              }
            />
          )}
        </CardContent>
      </Card>

      <ClientModals
        isEditModalOpen={!!editingClient}
        setIsEditModalOpen={open => !open && setEditingClient(null)}
        editingClient={editingClient}
        onSaveEdit={handleSalvarEdicao}
        isSubmitting={isSubmitting}
        isContactSelectionModalOpen={isContactSelectionModalOpen}
        setIsContactSelectionModalOpen={setIsContactSelectionModalOpen}
        selectedContactDetails={selectedContactDetails}
        onConfirmContactSelection={() => {}}
        isDuplicateAlertOpen={isDuplicateAlertOpen}
        setIsDuplicateAlertOpen={setIsDuplicateAlertOpen}
        duplicateMessage={duplicateMessage}
        isApiNotSupportedAlertOpen={isApiNotSupportedAlertOpen}
        setIsApiNotSupportedAlertOpen={setIsApiNotSupportedAlertOpen}
        deleteErrorAlert={deleteErrorAlert}
        setDeleteErrorAlert={setDeleteErrorAlert}
        clientToDelete={clientToDelete}
        setClientToDelete={setClientToDelete}
        onConfirmDelete={handleConfirmarRemocao}
      />
    </div>
  );
}
