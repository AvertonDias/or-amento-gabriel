
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePermissionDialog } from '@/hooks/use-permission-dialog';
import { requestForToken } from '@/lib/fcm';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Contacts } from '@capacitor-community/contacts';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { MobileNavbar } from '@/components/layout/mobile-navbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { requestPermission } = usePermissionDialog();

  // Android Back Button Handler
  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const anyModalOpen = !!document.querySelector('[data-radix-collection-item][data-state="open"]');
        if (anyModalOpen) {
          // A modal is open, prevent back navigation.
          // The modal's own logic (esc key, close button) will handle closing.
          return;
        }

        if (canGoBack) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });
    }
  }, []);
  
  const requestAppPermissions = async () => {
    if (Capacitor.isNativePlatform()) {
      // Solicitar permissão de Notificações
      const notifStatus = await LocalNotifications.checkPermissions();
      if (notifStatus.display === 'prompt') {
        const granted = await requestPermission({
          title: "Permitir Notificações?",
          description: "Deseja receber alertas importantes sobre seus orçamentos, como lembretes de vencimento?",
        });
        if (granted) await LocalNotifications.requestPermissions();
      }

    } else {
      // Para Web, solicitar permissão de notificação padrão
      if ('Notification' in window && Notification.permission === 'default') {
         const granted = await requestPermission({
          title: "Permitir Notificações?",
          description: "Deseja receber alertas importantes sobre seus orçamentos, como lembretes de vencimento?",
        });
        if (granted) await Notification.requestPermission();
      }
    }
  };

  // Auth State Change Handler
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        setIsCheckingAuth(false);
        // Solicita permissões e token FCM assim que o usuário for autenticado
        requestAppPermissions().then(() => {
          requestForToken();
        });
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <PwaInstallButton />
      <div className="flex min-h-screen w-full">
        
        <DesktopSidebar 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
        />

        {/* Main Content Area */}
        <div className={cn(
          "flex flex-col flex-1 transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "md:pl-[60px]" : "md:pl-[220px] lg:pl-[280px]"
        )}>
          
          <MobileNavbar />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
