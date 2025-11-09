'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Contact } from 'lucide-react';

interface ContactPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export function ContactPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}: ContactPermissionModalProps) {
  
  const handleRequestPermission = async () => {
    if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
        onPermissionDenied();
        return;
    }
    
    try {
      await (navigator as any).contacts.select(['name'], { multiple: false });
      onPermissionGranted();
    } catch (error) {
      console.error('Erro ao solicitar permissão de contatos:', error);
      onPermissionDenied();
    }
  };

  const handleDeny = () => {
    onPermissionDenied();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center items-center mb-4">
            <div className="bg-primary/10 rounded-full p-4">
               <Contact className="h-10 w-10 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Acessar seus Contatos?</DialogTitle>
          <DialogDescription className="text-center">
            Para facilitar o cadastro de clientes, permita que o app acesse os contatos do seu dispositivo. 
            Seus dados não são compartilhados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button onClick={handleRequestPermission}>Permitir Acesso</Button>
          <Button variant="ghost" onClick={handleDeny}>Agora não</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
