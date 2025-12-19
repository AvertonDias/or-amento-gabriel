
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

import { PwaInstallButton } from '@/components/pwa-install-button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { MobileNavbar } from '@/components/layout/mobile-navbar';

import { usePermissionDialog } from '@/hooks/use-permission-dialog';
import { requestForToken } from '@/lib/fcm';
import { useSync } from '@/hooks/useSync';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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

      /* 🔔 Notificações */
      const notifStatus = await LocalNotifications.checkPermissions();
      if (notifStatus.display === 'prompt') {
        const granted = await requestPermission({
          title: 'Permitir notificações?',
          description:
            'Deseja receber alertas importantes, como lembretes e atualizações de orçamentos?',
        });

        if (granted) {
          await LocalNotifications.requestPermissions();
        }
      }

      /* 📇 Contatos */
      const contactsStatus = await Contacts.checkPermissions();
      if (contactsStatus.contacts === 'prompt') {
        const granted = await requestPermission({
          title: 'Permitir acesso aos contatos?',
          description:
            'Isso permite adicionar clientes diretamente da sua agenda, economizando tempo.',
        });

        if (granted) {
          await Contacts.requestPermissions();
        }
      }

    } 
    /* ---------- WEB / PWA ---------- */
    else {
      if ('Notification' in window && Notification.permission === 'default') {
        const granted = await requestPermission({
          title: 'Permitir notificações?',
          description:
            'Deseja receber alertas importantes, como lembretes e atualizações de orçamentos?',
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
        await requestForToken();
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
    <TooltipProvider>
      <PwaInstallButton />

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
