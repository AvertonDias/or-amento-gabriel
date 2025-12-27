
'use client';

import React from 'react';
import type { ClienteData } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ClientForm from './client-form';
import type { ClientFormValues } from './client-form';
import { clienteToFormValues } from '../page';

interface EditClientDialogProps {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (isOpen: boolean) => void;
  editingClient: ClienteData | null;
  onSaveEdit: (values: ClientFormValues) => void;
  isSubmitting: boolean;
}

export function EditClientDialog({
  isEditModalOpen,
  setIsEditModalOpen,
  editingClient,
  onSaveEdit,
  isSubmitting,
}: EditClientDialogProps) {
  
  if (!editingClient) return null;

  // Converte ClienteData para ClientFormValues ANTES de passar para o formulário
  const formInitialData = clienteToFormValues(editingClient);

  return (
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias e clique em salvar.
          </DialogDescription>
        </DialogHeader>
        
        <ClientForm
          key={editingClient.id} // Força a remontagem para garantir estado limpo
          initialData={formInitialData}
          onSubmit={onSaveEdit}
          isSubmitting={isSubmitting}
          isEditMode={true}
        />
        
      </DialogContent>
    </Dialog>
  );
}
