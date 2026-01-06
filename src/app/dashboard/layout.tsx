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

import { usePermissionDialog, PermissionDialogProvider } from '@/hooks/use-permission-dialog';
import { requestForToken } from '@/lib/fcm';
import { useSync } from '@/hooks/useSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import { DirtyStateProvider } from '@/contexts/dirty-state-context';
import { useToast } from '@/hooks/use-toast';


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { requestPermission } = usePermissionDialog();
  
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
      if ('Notification' in window && Notification.permission === 'default') {
         const granted = await requestPermission({
            title: 'Receber Alertas Importantes?',
            description: 'Deseja receber notificações sobre orçamentos, como lembretes de vencimento e alertas de estoque?',
         });

         if (granted) {
            await Notification.requestPermission();
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
        // await requestForToken(); // Temporariamente desativado para evitar erro 401
      }
    });

    return () => unsubscribe();
  }, [router, isCheckingAuth]);


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
    <DirtyStateProvider>
      <PermissionDialogProvider>
        <TooltipProvider>
          <PwaManager />

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
      </PermissionDialogProvider>
    </DirtyStateProvider>
  );
}
