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
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Download, Settings2 } from 'lucide-react';

export function PwaManager() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showNotifyInstructions, setShowNotifyInstructions] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');

  // Estados de instalação
  const [isAppInstalled, setIsAppInstalled] = useLocalStorage<boolean>('pwa-installed', false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      if (!isAppInstalled) setShowInstallDialog(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isAppInstalled]);

  // Função para pedir notificação ou mostrar instrução
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast({ title: "Não suportado", description: "Seu navegador não suporta notificações." });
      return;
    }

    if (Notification.permission === 'denied') {
      // Se estiver bloqueado, abrimos o modal de instruções manuais
      setShowNotifyInstructions(true);
    } else {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === 'granted') {
        toast({ title: "Sucesso!", description: "Você receberá nossas notificações." });
      }
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1. MODAL DE INSTALAÇÃO (O que você já tinha) */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Instalar Aplicativo
            </DialogTitle>
            <DialogDescription>
              Instale para uma melhor experiência e acesso rápido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => installPromptEvent?.prompt()}>Instalar Agora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. MODAL DE INSTRUÇÕES DE NOTIFICAÇÃO (Caso esteja bloqueado) */}
      <Dialog open={showNotifyInstructions} onOpenChange={setShowNotifyInstructions}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <BellOff className="h-5 w-5" /> Notificações Bloqueadas
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3 text-left">
              <p>Você bloqueou as notificações anteriormente. Para ativar, siga os passos:</p>
              
              <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                <p className="font-bold flex items-center gap-2">
                   No Computador:
                </p>
                <p>1. Clique no ícone de <strong>cadeado</strong> ou <strong>configurações</strong> ao lado da URL (barra de endereço).</p>
                <p>2. Ative a chave de <strong>"Notificações"</strong>.</p>
              </div>

              <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                <p className="font-bold flex items-center gap-2">
                   No Celular (Android):
                </p>
                <p>1. Toque nos três pontos (menu) do navegador.</p>
                <p>2. Vá em <strong>Configurações {'>'} Configurações do Site {'>'} Notificações</strong>.</p>
                <p>3. Permita o acesso para este site.</p>
              </div>

              {/Android|iPhone|iPad/i.test(navigator.userAgent) && (
                <p className="text-xs text-orange-600 font-medium">
                  Nota: No iPhone, você precisa primeiro "Instalar" o app na tela inicial para poder ativar notificações.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowNotifyInstructions(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EXEMPLO DE BOTÃO PARA DISPARAR A LÓGICA NO SEU APP */}
      <div className="fixed bottom-4 right-4">
        <Button 
          variant={notificationStatus === 'granted' ? 'outline' : 'default'}
          onClick={handleEnableNotifications}
          className="gap-2"
        >
          {notificationStatus === 'granted' ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {notificationStatus === 'granted' ? 'Notificações Ativas' : 'Ativar Notificações'}
        </Button>
      </div>
    </>
  );
}