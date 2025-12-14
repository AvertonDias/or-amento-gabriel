'use client';

import React, { useState, FormEvent, useEffect, useCallback, useMemo } from 'react';
import type { ClienteData, Orcamento } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, PlusCircle, RefreshCw, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addCliente, deleteCliente, getClientes, updateCliente } from '@/services/clientesService';
import { getOrcamentos } from '@/services/orcamentosService';
import { useRouter } from 'next/navigation';
import { Accordion } from "@/components/ui/accordion";
import { usePermissionDialog } from '@/hooks/use-permission-dialog';
import { Input } from '@/components/ui/input';

// --- Imports para Capacitor ---
import { Capacitor } from '@capacitor/core';
import { Contacts, PermissionStatus } from '@capacitor-community/contacts';

// --- Components ---
import { ClientForm } from './_components/client-form';
import { ClientList } from './_components/client-list';
import { ClientModals } from './_components/client-modals';

const initialNewClientState: Omit<ClienteData, 'id' | 'userId'> = {
  nome: '',
  cpfCnpj: '',
  endereco: '',
  telefones: [{ nome: 'Principal', numero: '' }],
  email: '',
};

export interface SelectedContactDetails {
  name: string[];
  email: string[];
  tel: string[];
  address: any[];
}

export type OrcamentoStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Vencido';

export interface BudgetCounts {
    Pendente: number;
    Aceito: number;
    Recusado: number;
    Vencido: number;
    Total: number;
}

export default function ClientesPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClient, setNewClient] = useState(initialNewClientState);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClienteData | null>(null);

  const [isContactSelectionModalOpen, setIsContactSelectionModalOpen] = useState(false);
  const [selectedContactDetails, setSelectedContactDetails] = useState<SelectedContactDetails | null>(null);

  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  
  const [isApiNotSupportedAlertOpen, setIsApiNotSupportedAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  const { toast } = useToast();
  const { requestPermission } = usePermissionDialog();

  const fetchPageData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const [clientesData, orcamentosData] = await Promise.all([
        getClientes(user.uid),
        getOrcamentos(user.uid),
      ]);
      setClientes(clientesData);
      setOrcamentos(orcamentosData);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      toast({ title: 'Erro ao carregar dados da página', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchPageData();
    } else if (!loadingAuth) {
      setClientes([]);
      setOrcamentos([]);
      setIsLoadingData(false);
    }
  }, [user, loadingAuth, fetchPageData]);

  const filteredClientes = useMemo(() => {
    if (!searchTerm) {
      return clientes;
    }
    return clientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  const budgetCountsByClient = useMemo(() => {
    const counts: Record<string, BudgetCounts> = {};
    clientes.forEach(cliente => {
        if (!cliente.id) return;
        counts[cliente.id] = { Pendente: 0, Aceito: 0, Recusado: 0, Vencido: 0, Total: 0 };
    });

    orcamentos.forEach(orcamento => {
        const clienteId = orcamento.cliente.id;
        if (clienteId && counts[clienteId]) {
            counts[clienteId][orcamento.status]++;
            counts[clienteId].Total++;
        }
    });

    return counts;
  }, [clientes, orcamentos]);

  const checkForDuplicates = (): string | null => {
    let message = null;
    const newClientNameLower = newClient.nome.trim().toLowerCase();
    const newClientNumbers = newClient.telefones.map(t => t.numero).filter(Boolean);

    clientes.forEach(cliente => {
        if (newClient.nome && cliente.nome.trim().toLowerCase() === newClientNameLower) {
            message = `O nome "${newClient.nome}" já está cadastrado.`;
        } else if (newClient.cpfCnpj && cliente.cpfCnpj === newClient.cpfCnpj) {
            message = `O CPF/CNPJ "${newClient.cpfCnpj}" já está sendo usado pelo cliente "${cliente.nome}".`;
        } else if (newClient.email && cliente.email && cliente.email.toLowerCase() === newClient.email.toLowerCase()) {
            message = `O e-mail "${newClient.email}" já está sendo usado pelo cliente "${cliente.nome}".`;
        } else if (newClientNumbers.length > 0) {
            const clientNumbers = cliente.telefones.map(t => t.numero);
            const duplicateNumber = newClientNumbers.find(num => clientNumbers.includes(num));
            if (duplicateNumber) {
                message = `O telefone "${duplicateNumber}" já está sendo usado pelo cliente "${cliente.nome}".`;
            }
        }
    });
    return message;
  };


  const handleAdicionarCliente = async (clientData: Omit<ClienteData, 'id' | 'userId'>) => {
    if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
    }
    
    setNewClient(clientData); // Temporarily set for duplicate check

    const duplicateInfo = checkForDuplicates();
    if (duplicateInfo) {
        setDuplicateMessage(duplicateInfo);
        setIsDuplicateAlertOpen(true);
        return;
    }

    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...clientData,
        telefones: clientData.telefones.filter(t => t.numero.trim() !== ''),
      };
      await addCliente(user.uid, dataToSave);
      setNewClient(initialNewClientState);
      await fetchPageData(); // Refresh list
      toast({
        title: 'Sucesso!',
        description: 'Cliente adicionado.',
      });
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast({ title: 'Erro ao adicionar cliente', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoverCliente = async (id: string) => {
    if (!user) return;
    try {
        await deleteCliente(id);
        await fetchPageData(); // Refresh list
        toast({
            title: 'Cliente Removido',
            variant: 'destructive',
        });
    } catch(error) {
        toast({ title: 'Erro ao remover cliente', variant: 'destructive' });
    }
  };
  
  const handleEditClick = (client: ClienteData) => {
    const clientWithTelefones = {
        ...client,
        telefones: Array.isArray(client.telefones) && client.telefones.length > 0
            ? client.telefones
            : [{ nome: 'Principal', numero: '' }]
    };
    setEditingClient(clientWithTelefones);
    setIsEditModalOpen(true);
  };
  
  const handleSalvarEdicao = async (clientToUpdate: ClienteData) => {
    if (!clientToUpdate || !clientToUpdate.id || !user) return;
    
    setIsSubmitting(true);
    try {
        const { id, ...data } = clientToUpdate;
        const payload = {
          ...data,
          telefones: data.telefones.filter(t => t.numero.trim() !== ''),
        };
        await updateCliente(id, payload);
        setIsEditModalOpen(false);
        setEditingClient(null);
        await fetchPageData(); // Refresh list
        toast({ title: 'Sucesso!', description: 'Cliente atualizado com sucesso.' });
    } catch(error) {
        console.error("Erro ao atualizar cliente:", error);
        toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const formatAddress = (address: any): string => {
    if (!address) return '';
    const webParts = [
        address.addressLine1, address.addressLine2, address.city,
        address.region, address.postalCode, address.country
    ].filter(Boolean);
    if(webParts.length > 0) return webParts.join(', ');

    const capacitorParts = [
        address.street, address.city, address.state,
        address.postalCode, address.country
    ].filter(Boolean);
    if(capacitorParts.length > 0) return capacitorParts.join(', ');

    return '';
  };

  const normalizePhoneNumber = (tel: string) => {
    if (!tel) return '';
    let onlyDigits = tel.replace(/\D/g, '');
    if (onlyDigits.startsWith('55')) {
      onlyDigits = onlyDigits.substring(2);
    }
    return onlyDigits;
  };
  
  const processSelectedContacts = (contacts: any[]) => {
      if (!contacts || contacts.length === 0) return;

      const contact = contacts[0];
      const isNative = Capacitor.isNativePlatform();
      let adaptedContact;

      if (isNative) {
          adaptedContact = {
              name: contact.name?.display ? [contact.name.display] : [],
              email: contact.emailAddresses?.map((e: any) => e.address) || [],
              tel: contact.phoneNumbers?.map((p: any) => p.number) || [],
              address: contact.postalAddresses?.map((a: any) => ({
                  street: a.street, city: a.city, state: a.state,
                  postalCode: a.postalCode, country: a.country,
              })) || [],
          };
      } else {
          adaptedContact = {
              name: contact.name || [], email: contact.email || [],
              tel: contact.tel || [], address: contact.address || [],
          };
      }

      const hasMultipleOptions = (adaptedContact.tel?.length > 1 || adaptedContact.email?.length > 1 || adaptedContact.address?.length > 1);

      if (hasMultipleOptions) {
          setSelectedContactDetails(adaptedContact);
          setIsContactSelectionModalOpen(true);
      } else {
          const formattedAddress = adaptedContact.address?.[0] ? formatAddress(adaptedContact.address[0]) : '';
          const phoneNumber = normalizePhoneNumber(adaptedContact.tel?.[0] || '');

          setNewClient({
              nome: adaptedContact.name?.[0] || '',
              email: adaptedContact.email?.[0] || '',
              telefones: [{ nome: 'Principal', numero: phoneNumber }],
              endereco: formattedAddress,
              cpfCnpj: '',
          });

          toast({
              title: 'Contato Importado!',
              description: 'Os dados do contato foram preenchidos no formulário.',
          });
      }
  };

  const handleImportContacts = async () => {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
          try {
              let permStatus: PermissionStatus = await Contacts.checkPermissions();
              if (permStatus.contacts !== 'granted') {
                  const granted = await requestPermission({
                      title: "Acessar Contatos?",
                      description: "Para facilitar a criação de novos clientes, o app pode importar nomes e números da sua agenda. Deseja permitir?",
                  });
                  if (granted) permStatus = await Contacts.requestPermissions();
              }

              if (permStatus.contacts !== 'granted') {
                   toast({ title: "Permissão necessária", description: "Por favor, conceda acesso aos contatos nas configurações do seu celular.", variant: "destructive" });
                   return;
              }

              const result = await Contacts.getContacts({
                  projection: { name: true, phones: true, emails: true, postalAddresses: true }
              });

              processSelectedContacts(result.contacts);
          } catch (error: any) {
              console.error('Erro ao buscar contatos no Capacitor:', error);
              toast({ title: 'Erro ao importar', description: 'Não foi possível ler os contatos do dispositivo.', variant: 'destructive' });
          }
      } else {
          if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
              setIsApiNotSupportedAlertOpen(true);
              return;
          }
          try {
              const contacts = await (navigator as any).contacts.select(['name', 'email', 'tel', 'address'], { multiple: false });
              processSelectedContacts(contacts);
          } catch (error: any) {
              if (error.name !== 'AbortError') {
                  setIsApiNotSupportedAlertOpen(true);
                  console.error('Erro ao importar contato via Web API:', error);
              }
          }
      }
  };
  
  const handleConfirmContactSelection = (selectedData: Partial<ClienteData>) => {
    setNewClient(prev => ({ ...prev, ...selectedData }));
    setIsContactSelectionModalOpen(false);
    setSelectedContactDetails(null);
    toast({
      title: 'Contato Importado!',
      description: 'Os dados selecionados foram preenchidos no formulário.',
    });
  };

  const handleViewBudgets = (clienteId: string) => {
    router.push(`/dashboard/orcamento?clienteId=${clienteId}`);
  };

  const showSkeleton = loadingAuth || isLoadingData;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Cadastro de Clientes
          </CardTitle>
          <CardDescription>
            Adicione e gerencie os seus clientes. Estes dados ficarão salvos na nuvem e poderão ser usados nos orçamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full mb-6 border-b">
            <ClientForm
                key={JSON.stringify(newClient)}
                initialData={newClient}
                onSubmit={handleAdicionarCliente}
                onImportContacts={handleImportContacts}
                isSubmitting={isSubmitting}
                triggerTitle="Adicionar Novo Cliente"
            />
          </Accordion>

          {showSkeleton ? (
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="space-y-2">
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : clientes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold">Clientes Cadastrados</h2>
                <div className="flex w-full sm:w-auto items-center gap-2">
                  <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                          placeholder="Buscar cliente..."
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
                  <Button variant="ghost" size="icon" onClick={() => fetchPageData()} disabled={isLoadingData}>
                    <RefreshCw className={`h-5 w-5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
               <ClientList
                 clientes={filteredClientes}
                 budgetCounts={budgetCountsByClient}
                 onEdit={handleEditClick}
                 onDelete={handleRemoverCliente}
                 onViewBudgets={handleViewBudgets}
               />
            </div>
          ) : (
             <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado ainda. Se você já cadastrou, pode ser necessário criar um índice no Firestore. Verifique o console para erros.</p>
          )}
        </CardContent>
      </Card>

      <ClientModals
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingClient={editingClient}
        setEditingClient={setEditingClient}
        onSaveEdit={handleSalvarEdicao}
        isSubmitting={isSubmitting}
        
        isContactSelectionModalOpen={isContactSelectionModalOpen}
        setIsContactSelectionModalOpen={setIsContactSelectionModalOpen}
        selectedContactDetails={selectedContactDetails}
        onConfirmContactSelection={handleConfirmContactSelection}
        
        isDuplicateAlertOpen={isDuplicateAlertOpen}
        setIsDuplicateAlertOpen={setIsDuplicateAlertOpen}
        duplicateMessage={duplicateMessage}

        isApiNotSupportedAlertOpen={isApiNotSupportedAlertOpen}
        setIsApiNotSupportedAlertOpen={setIsApiNotSupportedAlertOpen}
      />
    </div>
  );
}
