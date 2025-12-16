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

interface EditClientDialogProps {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (isOpen: boolean) => void;
  editingClient: ClienteData | null;
  onSaveEdit: (client: ClienteData) => void;
  isSubmitting: boolean;
}

export function EditClientDialog({
  isEditModalOpen,
  setIsEditModalOpen,
  editingClient,
  onSaveEdit,
  isSubmitting,
}: EditClientDialogProps) {
  const handleInternalSave = (formData: ClientFormValues) => {
    if (editingClient) {
      onSaveEdit({
        ...editingClient,
        ...formData,
      });
    }
  };

  return (
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
  );
}
