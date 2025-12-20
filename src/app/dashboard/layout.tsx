
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Contacts } from '@capacitor-community/contacts';

import { PwaManager } from '@/components/pwa-install-button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { MobileNavbar } from '@/components/layout/mobile-navbar';

import { usePermissionDialog } from '@/hooks/use-permission-dialog';
import { requestForToken } from '@/lib/fcm';
import { useSync } from '@/hooks/useSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { requestPermission } = usePermissionDialog();
  const [showInstructions, setShowInstructions] = useState(false);

  // Estados para o novo diálogo de notificação
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [dontShowNotifyAgain, setDontShowNotifyAgain] = useLocalStorage<boolean>('hide-notif-alert', false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  // Inicializa sincronização offline/online
  useSync();

  /* =====================================================
     ANDROID – BOTÃO VOLTAR
  ====================================================== */
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const handler = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const modalOpen = document.querySelector(
        '[data-radix-collection-item][data-state="open"]'
      );

      if (modalOpen) return;

      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      handler.remove();
    };
  }, []);

  /* =====================================================
     PERMISSÕES DO APP
  ====================================================== */
  const requestAppPermissions = async () => {
    /* ---------- NATIVE (APK) ---------- */
    if (Capacitor.isNativePlatform()) {
      // 🔔 Notificações (Android)
      let notifStatus = await LocalNotifications.checkPermissions();
      if (notifStatus.display !== 'granted') {
        const rationale = notifStatus.display === 'denied' 
          ? 'Para receber alertas importantes sobre orçamentos, você precisa ativar as notificações nas configurações do aplicativo.'
          : 'Deseja receber notificações sobre orçamentos, como lembretes de vencimento e alertas de estoque?';
        
        const granted = await requestPermission({
          title: 'Receber Alertas Importantes?',
          description: rationale,
        });

        if (granted) {
          if (notifStatus.display === 'denied') {
            if ('openAppSettings' in CapacitorApp && typeof CapacitorApp.openAppSettings === 'function') {
              await CapacitorApp.openAppSettings();
            } else {
              toast({ title: 'Ação necessária', description: 'Por favor, abra as configurações do aplicativo e ative as notificações manualmente.', duration: 5000 });
            }
          } else {
            await LocalNotifications.requestPermissions();
          }
        }
      }

      // 📇 Contatos (Android)
      let contactsStatus = await Contacts.checkPermissions();
      if (contactsStatus.contacts !== 'granted') {
         const rationale = contactsStatus.contacts === 'denied'
          ? 'Para importar clientes da agenda, o aplicativo precisa de acesso aos seus contatos. Ative a permissão nas configurações.'
          : 'Para adicionar clientes rapidamente, o aplicativo pode acessar sua agenda de contatos. Deseja permitir?';
        
        const granted = await requestPermission({
          title: 'Importar Clientes da Agenda?',
          description: rationale,
        });

        if (granted) {
          if (contactsStatus.contacts === 'denied') {
            if ('openAppSettings' in CapacitorApp && typeof CapacitorApp.openAppSettings === 'function') {
               await CapacitorApp.openAppSettings();
            } else {
               toast({ title: 'Ação necessária', description: 'Por favor, abra as configurações do aplicativo e ative a permissão de contatos.', duration: 5000 });
            }
          } else {
            await Contacts.requestPermissions();
          }
        }
      }

    } 
    /* ---------- WEB / PWA ---------- */
    else {
      if ('Notification' in window && Notification.permission !== 'granted') {
         if (Notification.permission === 'denied' && !dontShowNotifyAgain) {
            setShowNotifyDialog(true);
         } else if (Notification.permission === 'default') {
            const granted = await requestPermission({
              title: 'Receber Alertas Importantes?',
              description: 'Deseja receber notificações sobre orçamentos, como lembretes de vencimento e alertas de estoque?',
            });

            if (granted) {
              await Notification.requestPermission();
            }
         }
      }
    }
  };


  /* =====================================================
     AUTH
  ====================================================== */
  useEffect(() => {
    // onIdTokenChanged é mais rápido para obter o usuário do cache local
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        // Apenas redireciona se a verificação inicial terminou e não há usuário
        if (!isCheckingAuth) {
           router.push('/login');
        } else {
           // Se for a primeira verificação e não houver usuário,
           // encerra o loading e deixa o usuário na tela de login (que será a próxima renderização)
           setIsCheckingAuth(false);
           router.push('/login');
        }
        return;
      }
      
      // Se houver um usuário, podemos parar de verificar a autenticação
      if (isCheckingAuth) {
        setIsCheckingAuth(false);
        // Solicita permissões e token FCM após a primeira autenticação bem-sucedida
        await requestAppPermissions();
        await requestForToken();
      }
    });

    return () => unsubscribe();
  }, [router, isCheckingAuth]);

  // Função para fechar o modal
  const handleCloseModal = () => {
    if (checkboxChecked) {
      setDontShowNotifyAgain(true); // Salva no navegador para nunca mais abrir
    }
    setShowNotifyDialog(false);
  };


  /* =====================================================
     LOADING
  ====================================================== */
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* =====================================================
     LAYOUT
  ====================================================== */
  return (
    <TooltipProvider>
      <PwaManager />

      {/* Diálogo para quando as notificações estão bloqueadas */}
      <Dialog open={showNotifyDialog} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              Receber Alertas Importantes?
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Você bloqueou as notificações. Para reativá-las, siga as instruções para o seu navegador.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center space-x-2 py-4">
            <Checkbox 
              id="dont-show-again" 
              checked={checkboxChecked} 
              onCheckedChange={(checked) => setCheckboxChecked(!!checked)} 
            />
            <Label 
              htmlFor="dont-show-again" 
              className="text-sm font-medium text-muted-foreground cursor-pointer"
            >
              Não mostrar esta mensagem novamente
            </Label>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              className="w-full h-12 text-lg"
              onClick={() => {
                  setShowInstructions(true);
                  setShowNotifyDialog(false);
              }}
            >
              Ver Instruções
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-12 text-lg"
              onClick={handleCloseModal}
            >
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo com as instruções detalhadas */}
      <AlertDialog open={showInstructions} onOpenChange={setShowInstructions}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como Ativar as Notificações</AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>Para reativar as notificações, você precisa acessar as configurações do seu navegador.</p>
              
              {isMobile ? (
                  <div className="text-sm space-y-2 pt-2">
                     <p>1. Toque no ícone de <strong>cadeado (🔒)</strong> ou no menu de opções (<strong>⋮</strong>) na barra de endereço.</p>
                     <p>2. Procure por <strong>&quot;Permissões&quot;</strong> ou <strong>&quot;Configurações do site&quot;</strong>.</p>
                     <p>3. Encontre <strong>&quot;Notificações&quot;</strong> e mude a opção de &quot;Bloqueado&quot; para &quot;Permitido&quot;.</p>
                     <p>4. Recarregue a página.</p>
                  </div>
              ) : (
                <>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong>Chrome:</strong> Copie e cole <code className="bg-muted px-1 rounded">chrome://settings/content/notifications</code> na barra de endereço.</li>
                    <li><strong>Firefox:</strong> Vá em &quot;Configurações&quot; &gt; &quot;Privacidade e Segurança&quot; &gt; &quot;Permissões&quot; &gt; &quot;Notificações&quot;.</li>
                    <li><strong>Safari (Mac):</strong> Vá em &quot;Safari&quot; &gt; &quot;Ajustes...&quot; &gt; &quot;Sites&quot; &gt; &quot;Notificações&quot;.</li>
                  </ul>
                  <p>Depois, encontre este site na lista e altere a permissão de &quot;Bloqueado&quot; para &quot;Permitido&quot;.</p>
                </>
              )}

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex min-h-screen w-full">

        <DesktopSidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        <div
          className={cn(
            'flex flex-col flex-1 transition-all duration-300 ease-in-out',
            isSidebarCollapsed
              ? 'md:pl-[60px]'
              : 'md:pl-[220px] lg:pl-[280px]'
          )}
        >
          <MobileNavbar />

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
