'use client';

import React from 'react';
import type { ClienteData, Telefone } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export interface SelectedContactDetails {
  name: string[];
  email: string[];
  tel: string[];
  address: any[];
}

interface ContactImportModalsProps {
  isContactSelectionModalOpen: boolean;
  setIsContactSelectionModalOpen: (isOpen: boolean) => void;
  selectedContactDetails: SelectedContactDetails | null;
  onConfirmContactSelection: (selectedData: Partial<ClienteData>) => void;

  isDuplicateAlertOpen: boolean;
  setIsDuplicateAlertOpen: (isOpen: boolean) => void;
  duplicateMessage: string;

  isApiNotSupportedAlertOpen: boolean;
  setIsApiNotSupportedAlertOpen: (isOpen: boolean) => void;
}

export function ContactImportModals({
  isContactSelectionModalOpen,
  setIsContactSelectionModalOpen,
  selectedContactDetails,
  onConfirmContactSelection,
  isDuplicateAlertOpen,
  setIsDuplicateAlertOpen,
  duplicateMessage,
  isApiNotSupportedAlertOpen,
  setIsApiNotSupportedAlertOpen,
}: ContactImportModalsProps) {
  const [selectedPhones, setSelectedPhones] = React.useState<
    Record<string, string>
  >({});

  const handleSelectionChange = (
    type: 'tel' | 'email' | 'address',
    value: string
  ) => {
    setSelectedPhones(prev => ({ ...prev, [type]: value }));
  };

  const handleConfirm = () => {
    if (!selectedContactDetails) return;
    const finalData: Partial<ClienteData> = {
      nome: selectedContactDetails.name?.[0] || '',
    };
    if (selectedPhones.tel) {
      finalData.telefones = [{ nome: 'Principal', numero: selectedPhones.tel }];
    } else if (selectedContactDetails.tel?.[0]) {
      finalData.telefones = [
        { nome: 'Principal', numero: selectedContactDetails.tel[0] },
      ];
    }

    if (selectedPhones.email) {
      finalData.email = selectedPhones.email;
    } else if (selectedContactDetails.email?.[0]) {
      finalData.email = selectedContactDetails.email[0];
    }

    if (selectedPhones.address) {
      finalData.endereco = selectedPhones.address;
    } else if (selectedContactDetails.address?.[0]) {
      finalData.endereco = selectedContactDetails.address[0];
    }

    onConfirmContactSelection(finalData);
  };

  return (
    <>
      {/* Contact Selection Modal */}
      <Dialog
        open={isContactSelectionModalOpen}
        onOpenChange={setIsContactSelectionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione os Dados</DialogTitle>
            <DialogDescription>
              O contato importado tem múltiplas opções. Escolha quais usar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(selectedContactDetails?.tel?.length ?? 0) > 1 && (
              <div className="space-y-2">
                <Label>Telefone</Label>
                <RadioGroup
                  onValueChange={v => handleSelectionChange('tel', v)}
                  defaultValue={selectedContactDetails!.tel![0]}
                >
                  {selectedContactDetails!.tel!.map(t => (
                    <div key={t} className="flex items-center space-x-2">
                      <RadioGroupItem value={t} id={`tel-${t}`} />
                      <Label htmlFor={`tel-${t}`}>{t}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            {(selectedContactDetails?.email?.length ?? 0) > 1 && (
              <div className="space-y-2">
                <Label>Email</Label>
                <RadioGroup
                  onValueChange={v => handleSelectionChange('email', v)}
                  defaultValue={selectedContactDetails!.email![0]}
                >
                  {selectedContactDetails!.email!.map(e => (
                    <div key={e} className="flex items-center space-x-2">
                      <RadioGroupItem value={e} id={`email-${e}`} />
                      <Label htmlFor={`email-${e}`}>{e}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            {(selectedContactDetails?.address?.length ?? 0) > 1 && (
              <div className="space-y-2">
                <Label>Endereço</Label>
                <RadioGroup
                  onValueChange={v => handleSelectionChange('address', v)}
                  defaultValue={selectedContactDetails!.address![0]}
                >
                  {selectedContactDetails!.address!.map((a: any) => (
                    <div key={a} className="flex items-center space-x-2">
                      <RadioGroupItem value={a} id={`addr-${a}`} />
                      <Label htmlFor={`addr-${a}`}>{a}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={handleConfirm}>Confirmar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Alert */}
      <AlertDialog
        open={isDuplicateAlertOpen}
        onOpenChange={setIsDuplicateAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cliente Duplicado</AlertDialogTitle>
            <AlertDialogDescription>{duplicateMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Not Supported Alert */}
      <AlertDialog
        open={isApiNotSupportedAlertOpen}
        onOpenChange={setIsApiNotSupportedAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Função não suportada</AlertDialogTitle>
            <AlertDialogDescription>
              Seu navegador não suporta a importação de contatos. Por favor,
              use um navegador moderno como o Chrome em um dispositivo móvel ou
              preencha os dados manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
