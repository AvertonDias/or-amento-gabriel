
'use client';

import React from 'react';
import type { ClienteData } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import ClientForm from './client-form';
import type { SelectedContactDetails } from './client-list';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';


interface ClientModalsProps {
    isEditModalOpen: boolean;
    setIsEditModalOpen: (isOpen: boolean) => void;
    editingClient: ClienteData | null;
    onSaveEdit: (client: ClienteData) => void;
    isSubmitting: boolean;
    
    isContactSelectionModalOpen: boolean;
    setIsContactSelectionModalOpen: (isOpen: boolean) => void;
    selectedContactDetails: SelectedContactDetails | null;
    onConfirmContactSelection: (selectedData: Partial<ClienteData>) => void;
    
    isDuplicateAlertOpen: boolean;
    setIsDuplicateAlertOpen: (isOpen: boolean) => void;
    duplicateMessage: string;

    isApiNotSupportedAlertOpen: boolean;
    setIsApiNotSupportedAlertOpen: (isOpen: boolean) => void;

    deleteErrorAlert: { isOpen: boolean, message: string };
    setDeleteErrorAlert: (alert: { isOpen: boolean, message: string }) => void;
}


export default function ClientModals({
    isEditModalOpen,
    setIsEditModalOpen,
    editingClient,
    onSaveEdit,
    isSubmitting,
    isContactSelectionModalOpen,
    setIsContactSelectionModalOpen,
    selectedContactDetails,
    onConfirmContactSelection,
    isDuplicateAlertOpen,
    setIsDuplicateAlertOpen,
    duplicateMessage,
    isApiNotSupportedAlertOpen,
    setIsApiNotSupportedAlertOpen,
    deleteErrorAlert,
    setDeleteErrorAlert,
}: ClientModalsProps) {
    const [selectedPhones, setSelectedPhones] = React.useState<Record<string, string>>({});

    const handleInternalSave = (formData: any) => {
        if (editingClient) {
            onSaveEdit({
                ...editingClient,
                ...formData
            });
        }
    };

     const handleSelectionChange = (type: 'tel' | 'email' | 'address', value: string) => {
        setSelectedPhones(prev => ({...prev, [type]: value}));
    };

    const handleConfirm = () => {
        if (!selectedContactDetails) return;
        const finalData: Partial<ClienteData> = {
            nome: selectedContactDetails.name?.[0] || '',
        };
        if (selectedPhones.tel) {
            finalData.telefones = [{ nome: 'Principal', numero: selectedPhones.tel }];
        }
        if (selectedPhones.email) {
            finalData.email = selectedPhones.email;
        }
        if (selectedPhones.address) {
            finalData.endereco = selectedPhones.address;
        }
        onConfirmContactSelection(finalData);
    };


    return (
        <>
            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                        <DialogDescription>
                            Faça as alterações necessárias e clique em salvar.
                        </DialogDescription>
                    </DialogHeader>
                    {editingClient && (
                         <ClientForm
                            key={editingClient.id} 
                            initialData={editingClient}
                            onSubmit={handleInternalSave}
                            isSubmitting={isSubmitting}
                            isEditMode={true}
                         />
                    )}
                </DialogContent>
            </Dialog>
            
            {/* Contact Selection Modal */}
            <Dialog open={isContactSelectionModalOpen} onOpenChange={setIsContactSelectionModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Selecione os Dados</DialogTitle><DialogDescription>O contato importado tem múltiplas opções. Escolha quais usar.</DialogDescription></DialogHeader>
                        <div className="space-y-4">
                            {selectedContactDetails?.tel?.length > 1 && (
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <RadioGroup onValueChange={(v) => handleSelectionChange('tel', v)} defaultValue={selectedContactDetails.tel[0]}>
                                        {selectedContactDetails.tel.map(t => <div key={t} className="flex items-center space-x-2"><RadioGroupItem value={t} id={`tel-${t}`}/><Label htmlFor={`tel-${t}`}>{t}</Label></div>)}
                                    </RadioGroup>
                                </div>
                            )}
                             {selectedContactDetails?.email?.length > 1 && (
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <RadioGroup onValueChange={(v) => handleSelectionChange('email', v)} defaultValue={selectedContactDetails.email[0]}>
                                        {selectedContactDetails.email.map(e => <div key={e} className="flex items-center space-x-2"><RadioGroupItem value={e} id={`email-${e}`}/><Label htmlFor={`email-${e}`}>{e}</Label></div>)}
                                    </RadioGroup>
                                </div>
                            )}
                             {selectedContactDetails?.address?.length > 1 && (
                                <div className="space-y-2">
                                    <Label>Endereço</Label>
                                    <RadioGroup onValueChange={(v) => handleSelectionChange('address', v)} defaultValue={selectedContactDetails.address[0]}>
                                        {selectedContactDetails.address.map((a: any) => <div key={a} className="flex items-center space-x-2"><RadioGroupItem value={a} id={`addr-${a}`}/><Label htmlFor={`addr-${a}`}>{a}</Label></div>)}
                                    </RadioGroup>
                                </div>
                            )}
                        </div>
                    <DialogFooter><DialogClose asChild><Button onClick={handleConfirm}>Confirmar</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate Alert */}
            <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><DialogTitle>Cliente Duplicado</AlertDialogTitle><AlertDialogDescription>{duplicateMessage}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogAction>OK</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* API Not Supported Alert */}
            <AlertDialog open={isApiNotSupportedAlertOpen} onOpenChange={setIsApiNotSupportedAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><DialogTitle>Função não suportada</AlertDialogTitle><AlertDialogDescription>Seu navegador não suporta a importação de contatos. Por favor, use um navegador moderno como o Chrome em um dispositivo móvel ou preencha os dados manualmente.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogAction>OK</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Error Alert */}
             <AlertDialog open={deleteErrorAlert.isOpen} onOpenChange={(isOpen) => setDeleteErrorAlert({ isOpen, message: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader><DialogTitle>Erro ao Excluir</AlertDialogTitle><AlertDialogDescription>{deleteErrorAlert.message}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogAction>OK</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
