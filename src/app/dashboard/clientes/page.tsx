'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { ClienteData } from '@/lib/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Users, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

import {
  addCliente,
  deleteCliente,
  updateCliente,
} from '@/services/clientesService';

import { useRouter } from 'next/navigation';
import { Accordion } from '@/components/ui/accordion';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';

import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';

import ClientForm from './_components/client-form';
import ClientList from './_components/client-list';
import type { BudgetCounts } from './_components/client-list';
import { DeleteClientDialog } from './_components/delete-client-dialog';
import { EditClientDialog } from './_components/edit-client-dialog';
import {
  ContactImportModals,
  type SelectedContactDetails,
} from './_components/contact-import-modals';

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const normalizePhone = (value: string) =>
  value.replace(/\D/g, '').replace(/^55/, '');

const normalizeEmail = (value: string) =>
  value.trim().toLowerCase();

function findDuplicateClient(
  newClient: Omit<ClienteData, 'id' | 'userId'>,
  existingClients: ClienteData[]
): ClienteData | null {
  const newPhones =
    newClient.telefones?.map(t => normalizePhone(t.numero)) ?? [];

  const newEmail = newClient.email
    ? normalizeEmail(newClient.email)
    : null;

  for (const client of existingClients) {
    // Verifica telefone
    const clientPhones =
      client.telefones?.map(t => normalizePhone(t.numero)) ?? [];

    if (
      newPhones.length > 0 &&
      newPhones.some(p => p && clientPhones.includes(p))
    ) {
      return client;
    }

    // Verifica email
    if (
      newEmail &&
      client.email &&
      normalizeEmail(client.email) === newEmail
    ) {
      return client;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* ESTADO INICIAL                                                              */
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
  /* DADOS OFFLINE (DEXIE)                                                       */
  /* -------------------------------------------------------------------------- */

  const clientes = useLiveQuery(
    () =>
      user
        ? db.clientes
            .where('userId')
            .equals(user.uid)
            .toArray()
        : [],
    [user]
  )?.map(c => ({ ...c.data, id: c.id }));

  const orcamentos = useLiveQuery(
    () =>
      user
        ? db.orcamentos.where('userId').equals(user.uid).toArray()
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

  const [isApiNotSupportedAlertOpen, setIsApiNotSupportedAlertOpen] =
    useState(false);

  const [deleteErrorAlert, setDeleteErrorAlert] = useState({
    isOpen: false,
    message: '',
  });

  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] =
    useState(false);

  const [selectedContactDetails, setSelectedContactDetails] =
    useState<SelectedContactDetails | null>(null);

  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  /* -------------------------------------------------------------------------- */
  /* FILTRO, ORDENAÇÃO E CONTAGEM                                               */
  /* -------------------------------------------------------------------------- */

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredClientes = useMemo(() => {
    if (!clientes) return [];

    return clientes
      .filter(c => {
        if (!normalizedSearch) return true;

        const nome = c.nome.toLowerCase();
        const email = c.email?.toLowerCase() || '';
        const telefones =
          c.telefones?.map(t => t.numero).join(' ') || '';

        return (
          nome.includes(normalizedSearch) ||
          email.includes(normalizedSearch) ||
          telefones.includes(normalizedSearch)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientes, normalizedSearch]);

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

  const handleAdicionarCliente = useCallback(
    async (data: Omit<ClienteData, 'id' | 'userId'>) => {
      if (!user || !clientes) return;

      // 🔍 DETECÇÃO DE DUPLICADO
      const duplicate = findDuplicateClient(data, clientes);

      if (duplicate) {
        setDuplicateMessage(
          `Já existe um cliente cadastrado com este telefone ou email:\n\n${duplicate.nome}`
        );
        setIsDuplicateAlertOpen(true);
        return;
      }

      setIsSubmitting(true);
      try {
        await addCliente(user.uid, {
          ...data,
          telefones: data.telefones.filter(t => t.numero.trim()),
        });

        setNewClient(initialNewClientState);
        toast({ title: 'Cliente adicionado com sucesso' });
      } catch {
        toast({
          title: 'Erro ao adicionar cliente',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, clientes, toast]
  );

  const handleSalvarEdicao = useCallback(
    async (client: ClienteData) => {
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
        toast({
          title: 'Erro ao atualizar',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [toast]
  );

  const handleConfirmarRemocao = useCallback(async () => {
    if (!clientToDelete?.id) return;

    try {
      await deleteCliente(clientToDelete.id);
      toast({
        title: 'Cliente removido',
        variant: 'destructive',
      });
    } catch {
      toast({
        title: 'Erro ao remover',
        variant: 'destructive',
      });
    } finally {
      setClientToDelete(null);
    }
  }, [clientToDelete, toast]);

  /* -------------------------------------------------------------------------- */
  /* IMPORTAÇÃO DE CONTATOS                                                      */
  /* -------------------------------------------------------------------------- */

  const handleImportContacts = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsApiNotSupportedAlertOpen(true);
      return;
    }

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

      const contact = result.contacts.find(
        c => c.phones?.length || c.emails?.length
      );

      if (!contact) {
        toast({ title: 'Nenhum contato válido encontrado' });
        return;
      }

      setNewClient({
        nome: contact.name?.display || 'Sem nome',
        email: contact.emails?.[0]?.address || '',
        telefones: [
          {
            nome: 'Principal',
            numero: normalizePhone(
              contact.phones?.[0]?.number || ''
            ),
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
  }, [toast]);

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
            Cadastre, edite e gerencie seus clientes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

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
            <Skeleton className="h-40 w-full" />
          ) : filteredClientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <ClientList
              clientes={filteredClientes}
              budgetCounts={budgetCountsByClient}
              onEdit={setEditingClient}
              onDelete={setClientToDelete}
              onViewBudgets={id =>
                router.push(
                  `/dashboard/orcamento?clienteId=${id}`
                )
              }
            />
          )}
        </CardContent>
      </Card>

      <EditClientDialog
        isEditModalOpen={!!editingClient}
        setIsEditModalOpen={open =>
          !open && setEditingClient(null)
        }
        editingClient={editingClient}
        onSaveEdit={handleSalvarEdicao}
        isSubmitting={isSubmitting}
      />

      <DeleteClientDialog
        clientToDelete={clientToDelete}
        setClientToDelete={setClientToDelete}
        onConfirmDelete={handleConfirmarRemocao}
        deleteErrorAlert={deleteErrorAlert}
        setDeleteErrorAlert={setDeleteErrorAlert}
      />

      <ContactImportModals
        isContactSelectionModalOpen={
          isContactSelectionModalOpen
        }
        setIsContactSelectionModalOpen={
          setIsContactSelectionModalOpen
        }
        selectedContactDetails={selectedContactDetails}
        onConfirmContactSelection={() => {}}
        isDuplicateAlertOpen={isDuplicateAlertOpen}
        setIsDuplicateAlertOpen={setIsDuplicateAlertOpen}
        duplicateMessage={duplicateMessage}
        isApiNotSupportedAlertOpen={
          isApiNotSupportedAlertOpen
        }
        setIsApiNotSupportedAlertOpen={
          setIsApiNotSupportedAlertOpen
        }
      />
    </div>
  );
}
