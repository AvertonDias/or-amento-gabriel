'use client';

import React from 'react';
import type { ClienteData } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteClientDialogProps {
  clientToDelete: ClienteData | null;
  setClientToDelete: (client: ClienteData | null) => void;
  onConfirmDelete: () => void;
  deleteErrorAlert: { isOpen: boolean; message: string };
  setDeleteErrorAlert: (alert: { isOpen: boolean; message: string }) => void;
}

export function DeleteClientDialog({
  clientToDelete,
  setClientToDelete,
  onConfirmDelete,
  deleteErrorAlert,
  setDeleteErrorAlert,
}: DeleteClientDialogProps) {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={() => setClientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              cliente &quot;{clientToDelete?.nome}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete}>
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Error Alert */}
      <AlertDialog
        open={deleteErrorAlert.isOpen}
        onOpenChange={isOpen => setDeleteErrorAlert({ isOpen, message: '' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erro ao Excluir</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteErrorAlert.message}
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
