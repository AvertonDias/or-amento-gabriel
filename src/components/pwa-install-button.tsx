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
import { Download } from 'lucide-react';

// Define the shape of the event object for better type safety
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallButton() {
  const { toast } = useToast();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useLocalStorage<boolean>('pwa-installed', false);
  const [isReadyForInstall, setIsReadyForInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(promptEvent);
      setIsReadyForInstall(true);
      if (!isAppInstalled) {
        setShowDialog(true);
      }
    };
    
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setShowDialog(false);
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Fallback for browsers that don't fire 'beforeinstallprompt' but support PWA
    const fallbackTimeout = setTimeout(() => {
        // If the event hasn't fired but the app isn't installed, we might be in a browser like Samsung Internet.
        if (!installPromptEvent && !isAppInstalled) {
            // Check if the app is running in standalone mode (already installed)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            if (!isStandalone) {
                setIsReadyForInstall(true); // Mark as ready to show the instructive dialog
                setShowDialog(true);
            } else {
                setIsAppInstalled(true); // Correct the state if it's already installed
            }
        }
    }, 3000); // Wait 3 seconds for the event

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimeout);
    };
  }, [isAppInstalled, setIsAppInstalled, installPromptEvent]);


  const handleInstallClick = async () => {
    setShowDialog(false); // Hide dialog immediately on click

    // If the native prompt is available, use it. This is the case for Chrome.
    if (installPromptEvent) {
        try {
            await installPromptEvent.prompt();
            const { outcome } = await installPromptEvent.userChoice;
            if (outcome === 'accepted') {
                toast({ title: 'Aplicativo instalado com sucesso!' });
                setIsAppInstalled(true);
            } else {
                toast({ title: 'Instalação cancelada.' });
            }
        } catch(error) {
            toast({ title: 'Ocorreu um erro durante a instalação.', variant: 'destructive' });
        }
    } else {
        // If no prompt, it's a browser like Samsung Internet. Show instructions via a toast.
        toast({ 
            title: "Como instalar",
            description: "Procure pelo ícone de download na barra de endereço ou use a opção 'Adicionar à tela inicial' no menu do seu navegador.",
            duration: 8000, // Show for longer
        });
    }
  };
  
  if (!isReadyForInstall || isAppInstalled || !showDialog) {
    return null;
  }

  return (
     <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent 
            className="sm:max-w-md"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Download className="h-6 w-6 text-primary"/>
                    Instalar o Aplicativo
                </DialogTitle>
                <DialogDescription>
                    {installPromptEvent
                        ? "Instale o aplicativo em seu dispositivo para uma experiência mais rápida e para usá-lo como um app nativo, inclusive com acesso offline. É rápido e seguro!"
                        : "Para uma experiência completa e acesso offline, instale nosso aplicativo. Clique em 'Instalar' e siga as instruções do seu navegador."
                    }
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center pt-4">
                 <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Agora não
                </Button>
                <Button onClick={handleInstallClick}>
                    Instalar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}