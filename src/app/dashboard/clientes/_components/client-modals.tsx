'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientForm } from './client-form';
import type { ClienteData } from '@/lib/types';
import type { SelectedContactDetails } from '../page';
import { maskTelefone } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface ClientModalsProps {
    isEditModalOpen: boolean;
    setIsEditModalOpen: (isOpen: boolean) => void;
    editingClient: ClienteData | null;
    setEditingClient: (client: ClienteData | null) => void;
    onSaveEdit: (client: ClienteData) => void;
    isSubmitting: boolean;

    isContactSelectionModalOpen: boolean;
    setIsContactSelectionModalOpen: (isOpen: boolean) => void;
    selectedContactDetails: SelectedContactDetails | null;
    onConfirmContactSelection: (data: Partial<ClienteData>) => void;
    
    isDuplicateAlertOpen: boolean;
    setIsDuplicateAlertOpen: (isOpen: boolean) => void;
    duplicateMessage: string;

    isApiNotSupportedAlertOpen: boolean;
    setIsApiNotSupportedAlertOpen: (isOpen: boolean) => void;
}

const formatAddress = (address: any): string => {
    if (!address) return '';
    const webParts = [address.addressLine1, address.addressLine2, address.city, address.region, address.postalCode, address.country].filter(Boolean);
    if (webParts.length > 0) return webParts.join(', ');

    const capacitorParts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);
    if (capacitorParts.length > 0) return capacitorParts.join(', ');

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

export function ClientModals({
    isEditModalOpen, setIsEditModalOpen, editingClient, onSaveEdit, isSubmitting,
    isContactSelectionModalOpen, setIsContactSelectionModalOpen, selectedContactDetails, onConfirmContactSelection,
    isDuplicateAlertOpen, setIsDuplicateAlertOpen, duplicateMessage,
    isApiNotSupportedAlertOpen, setIsApiNotSupportedAlertOpen
}: ClientModalsProps) {

    const handleConfirmContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContactDetails) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const selectedTelRaw = formData.get('tel') as string || selectedContactDetails.tel?.[0] || '';
        const selectedEmail = formData.get('email') as string || selectedContactDetails.email?.[0] || '';
        const selectedAddressString = formData.get('address') as string || (selectedContactDetails.address?.[0] ? JSON.stringify(selectedContactDetails.address[0]) : '');
        
        let formattedAddress = '';
        if (selectedAddressString) {
          try {
            const selectedAddress = JSON.parse(selectedAddressString);
            formattedAddress = formatAddress(selectedAddress);
          } catch (error) { console.error("Error parsing selected address", error); }
        }

        const phoneNumber = normalizePhoneNumber(selectedTelRaw);

        onConfirmContactSelection({
          nome: selectedContactDetails.name?.[0] || '',
          email: selectedEmail,
          telefones: [{ nome: 'Principal', numero: phoneNumber ? maskTelefone(phoneNumber) : '' }],
          endereco: formattedAddress,
        });
    };
    
    return (
        <>
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-lg" onPointerDownOutside={(e) => { if (Capacitor.isNativePlatform()) e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                        <DialogDescription>Faça as alterações necessárias nos dados do cliente.</DialogDescription>
                    </DialogHeader>
                    {editingClient && (
                        <ClientForm
                            key={editingClient.id}
                            initialData={editingClient}
                            onSubmit={(data) => onSaveEdit({ ...data, id: editingClient.id, userId: editingClient.userId })}
                            isSubmitting={isSubmitting}
                            triggerTitle=""
                            isEdit={true}
                            onCancel={() => setIsEditModalOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
      
            <Dialog open={isContactSelectionModalOpen} onOpenChange={setIsContactSelectionModalOpen}>
                <DialogContent onPointerDownOutside={(e) => { if (Capacitor.isNativePlatform()) e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle>Escolha os Detalhes do Contato</DialogTitle>
                        <DialogDescription>O contato selecionado tem múltiplas informações. Escolha quais usar.</DialogDescription>
                    </DialogHeader>
                    {selectedContactDetails && (
                        <form onSubmit={handleConfirmContact} className="space-y-4 py-4">
                            <div className="space-y-2"><Label>Nome</Label><Input value={selectedContactDetails.name?.[0] || 'Sem nome'} disabled /></div>
                            {selectedContactDetails.tel?.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="tel-select">Telefone</Label>
                                    <Select name="tel" defaultValue={selectedContactDetails.tel?.[0]}><SelectTrigger id="tel-select"><SelectValue /></SelectTrigger>
                                        <SelectContent>{selectedContactDetails.tel.map((tel, i) => <SelectItem key={i} value={tel}>{tel}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            {selectedContactDetails.email?.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="email-select">Email</Label>
                                    <Select name="email" defaultValue={selectedContactDetails.email?.[0]}><SelectTrigger id="email-select"><SelectValue /></SelectTrigger>
                                        <SelectContent>{selectedContactDetails.email.map((email, i) => <SelectItem key={i} value={email}>{email}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            {selectedContactDetails.address?.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="address-select">Endereço</Label>
                                    <Select name="address" defaultValue={selectedContactDetails.address?.[0] ? JSON.stringify(selectedContactDetails.address[0]) : ''}><SelectTrigger id="address-select"><SelectValue /></SelectTrigger>
                                        <SelectContent>{selectedContactDetails.address.map((addr, i) => <SelectItem key={i} value={JSON.stringify(addr)}>{formatAddress(addr)}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit">Confirmar</Button></DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cliente Duplicado</AlertDialogTitle><AlertDialogDescription>{duplicateMessage}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setIsDuplicateAlertOpen(false)}>Entendido</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isApiNotSupportedAlertOpen} onOpenChange={setIsApiNotSupportedAlertOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Recurso Indisponível</AlertDialogTitle><AlertDialogDescription>A importação de contatos não é suportada pelo seu navegador atual. Recomendamos usar o Google Chrome ou Microsoft Edge.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setIsApiNotSupportedAlertOpen(false)}>Entendido</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </>
    );
}
