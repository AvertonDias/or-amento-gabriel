
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { ClienteData } from '@/lib/types';
import { useForm } from 'react-hook-form';

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

import ClientForm, { type ClientFormValues } from './_components/client-form';
import ClientList from './_components/client-list';
import type { BudgetCounts } from './_components/client-list';
import { DeleteClientDialog } from './_components/delete-client-dialog';
import { EditClientDialog } from './_components/edit-client-dialog';
import {
  ContactImportModals,
  type SelectedContactDetails,
} from './_components/contact-import-modals';
import { findDuplicateClient } from '@/lib/utils';


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
  
  const addClientForm = useForm<ClientFormValues>();

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

  // Transforma os dados do formulário para o formato ClienteData
  const transformFormDataToClienteData = (data: ClientFormValues): Omit<ClienteData, 'id' | 'userId'> => {
    const telefones = [{ nome: 'Principal', numero: data.telefonePrincipal, principal: true }];
    if (data.telefonesAdicionais) {
        telefones.push(...data.telefonesAdicionais.filter(t => t.numero?.trim()).map(t => ({ ...t, principal: false })));
    }
    return {
        nome: data.nome,
        cpfCnpj: data.cpfCnpj,
        email: data.email,
        endereco: data.endereco,
        telefones,
    };
  }

  const handleAdicionarCliente = useCallback(
    async (data: ClientFormValues) => {
      if (!user || !clientes) return;

      const clienteParaVerificar = transformFormDataToClienteData(data);
      const duplicate = findDuplicateClient(clienteParaVerificar, clientes);

      if (duplicate) {
        setDuplicateMessage(
          `Já existe um cliente cadastrado com este telefone ou email:\n\n${duplicate.nome}`
        );
        setIsDuplicateAlertOpen(true);
        return;
      }

      setIsSubmitting(true);
      try {
        await addCliente(user.uid, clienteParaVerificar);

        addClientForm.reset();
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
    [user, clientes, toast, addClientForm]
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
  const processSelectedContact = useCallback((contact: any) => {
    
    // Normaliza os dados, pois a API do Capacitor e a da Web retornam formatos diferentes
    const contactPhones = (contact.phones || contact.tel || []).map((p: any) => typeof p === 'string' ? p : p.number).filter(Boolean);
    const contactEmails = (contact.emails || contact.email || []).map((e: any) => typeof e === 'string' ? e : e.address).filter(Boolean);
    const contactAddresses = (contact.postalAddresses || contact.address || []).map((a: any) => typeof a === 'string' ? a : a.street).filter(Boolean);
    const contactName = (contact.name?.display || (Array.isArray(contact.name) && contact.name[0]) || 'Sem nome');

    const needsSelection =
      contactPhones.length > 1 ||
      contactEmails.length > 1 ||
      contactAddresses.length > 1;

    const contactData: Partial<ClienteData> = {
      nome: contactName,
      telefones: contactPhones.map((p, i) => ({ nome: i === 0 ? 'Principal' : 'Outro', numero: p, principal: i === 0 })),
      email: contactEmails.length > 0 ? contactEmails[0] : '',
      endereco: contactAddresses.length > 0 ? contactAddresses[0] : '',
    };
    
    const duplicate = findDuplicateClient(contactData, clientes || []);
    if (duplicate) {
      setDuplicateMessage(`O contato ${contactName} já está cadastrado como ${duplicate.nome}.`);
      setIsDuplicateAlertOpen(true);
      return;
    }

    if (needsSelection) {
      setSelectedContactDetails({
        name: [contactName],
        tel: contactPhones,
        email: contactEmails,
        address: contactAddresses,
      });
      setIsContactSelectionModalOpen(true);
    } else {
      // Adapta para o novo formato do formulário
      addClientForm.reset({
        nome: contactData.nome || '',
        telefonePrincipal: contactData.telefones?.[0]?.numero || '',
        cpfCnpj: '',
        endereco: contactData.endereco || '',
        email: contactData.email || '',
        telefonesAdicionais: contactData.telefones?.slice(1).map(t => ({ nome: t.nome || 'Outro', numero: t.numero })) || [],
      });
      toast({ title: 'Contato pronto para ser salvo!' });
    }
  }, [clientes, addClientForm, toast]);


  const handleImportContacts = useCallback(async () => {
    // Primeiro, tenta a API Nativa do Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await Contacts.requestPermissions();
        if (permission.contacts !== 'granted') {
          toast({ title: 'Permissão negada', description: 'Acesso aos contatos é necessário.', variant: 'destructive' });
          return;
        }
  
        const result = await Contacts.pickContact({
          projection: { name: true, phones: true, emails: true, postalAddresses: true },
        });
  
        processSelectedContact(result.contact);
      } catch (e) {
          if (e instanceof Error && e.message.includes('cancelled')) {
               // Ação cancelada pelo usuário, não mostrar erro
          } else {
              console.error("Erro ao usar API de Contatos do Capacitor:", e);
              setIsApiNotSupportedAlertOpen(true);
          }
      }
      return; // Termina aqui para plataformas nativas
    }

    // Se não for nativo, tenta a API Web (PWA)
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'email', 'tel'], { multiple: false });
        if (contacts.length > 0) {
          processSelectedContact(contacts[0]);
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('cancelled')) {
          // Ação cancelada pelo usuário, não mostrar erro
        } else {
          console.error("Erro ao usar a API Web de Contatos (PWA):", e);
          setIsApiNotSupportedAlertOpen(true);
        }
      }
      return;
    }
    
    // Se chegou até aqui, nenhuma das APIs está disponível ou funcionou
    setIsApiNotSupportedAlertOpen(true);

  }, [toast, processSelectedContact]);
  
  const handleConfirmContactSelection = useCallback((selectedData: Partial<ClienteData>) => {
    const dataToSet = {
      nome: selectedData.nome || '',
      telefonePrincipal: selectedData.telefones?.[0]?.numero || '',
      cpfCnpj: '',
      endereco: selectedData.endereco || '',
      email: selectedData.email || '',
      telefonesAdicionais: selectedData.telefones?.slice(1).map(t => ({ nome: t.nome || 'Outro', numero: t.numero })) || [],
    };
    addClientForm.reset(dataToSet);
    setIsContactSelectionModalOpen(false);
    toast({ title: 'Contato pronto para ser salvo!' });
  }, [addClientForm, toast]);


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
              initialData={{}} // Passa objeto vazio pois os valores padrão estão no form
              formControl={addClientForm.control}
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
              onEdit={(client) => setEditingClient(client)}
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

      {editingClient && (
        <EditClientDialog
          isEditModalOpen={!!editingClient}
          setIsEditModalOpen={open => !open && setEditingClient(null)}
          editingClient={editingClient}
          onSaveEdit={handleSalvarEdicao}
          isSubmitting={isSubmitting}
        />
      )}

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
        onConfirmContactSelection={handleConfirmContactSelection}
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
