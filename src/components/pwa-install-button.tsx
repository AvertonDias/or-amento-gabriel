'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BellOff, Settings2, X } from 'lucide-react';

export function PwaManager() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  // Modais
  const [showNotifyInstructions, setShowNotifyInstructions] = useState(false);
  
  // Persistência (LocalStorage)
  const [dontShowNotifyAgain, setDontShowNotifyAgain] = useLocalStorage<boolean>('pwa-dont-show-notify-instructions', false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  
  // Estado temporário do checkbox no modal
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission);
      
      // Lógica de exibição automática (apenas se não estiver bloqueado no localStorage)
      if (Notification.permission === 'denied' && !dontShowNotifyAgain) {
        // Mostra o modal após 3 segundos para não assustar o usuário logo de cara
        const timer = setTimeout(() => setShowNotifyInstructions(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [dontShowNotifyAgain]);

  const handleCloseInstructions = () => {
    if (checkboxChecked) {
      setDontShowNotifyAgain(true);
      toast({
        title: "Preferência salva",
        description: "Não mostraremos mais as instruções de notificação.",
      });
    }
    setShowNotifyInstructions(false);
  };

  if (!mounted) return null;

  return (
    <Dialog open={showNotifyInstructions} onOpenChange={(open) => !open && handleCloseInstructions()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <BellOff className="h-5 w-5" /> Notificações Bloqueadas
          </DialogTitle>
          <DialogDescription className="pt-2">
            Percebemos que as notificações estão desativadas no seu navegador. 
            Para receber atualizações importantes, você precisa habilitá-las manualmente:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted p-3 rounded-lg text-xs space-y-2">
            <p className="font-semibold flex items-center gap-1 text-primary">
              <Settings2 className="h-3 w-3" /> Como habilitar:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Clique no ícone de <strong>cadeado</strong> na barra de endereços (URL).</li>
              <li>Ative a opção <strong>Notificações</strong>.</li>
              <li>Recarregue a página se solicitado.</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="dont-show-notify" 
              checked={checkboxChecked} 
              onCheckedChange={(checked) => setCheckboxChecked(!!checked)} 
            />
            <Label htmlFor="dont-show-notify" className="text-sm font-medium cursor-pointer">
              Não mostrar estas instruções novamente
            </Label>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button onClick={handleCloseInstructions}>
            Entendi, fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}