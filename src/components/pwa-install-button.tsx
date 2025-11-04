
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
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

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(promptEvent);
      // Only show the dialog if the app is not already marked as installed
      if (!isAppInstalled) {
        setShowDialog(true);
      }
    };
    
    const handleAppInstalled = () => {
      // This event is fired after the user accepts the installation prompt.
      setIsAppInstalled(true);
      setShowDialog(false);
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isAppInstalled, setIsAppInstalled]);


  const handleInstallClick = async () => {
    if (!installPromptEvent) {
        toast({ title: "A instalação não está disponível no momento.", variant: 'destructive'});
        return;
    };

    try {
        await installPromptEvent.prompt();
        // The 'userChoice' promise resolves when the user interacts with the prompt
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            toast({ title: 'Aplicativo instalado com sucesso!' });
            // The 'appinstalled' event will handle hiding the dialog and updating state
        } else {
            toast({ title: 'Instalação cancelada.' });
             // If the user dismisses, we can hide the dialog for this session
            setShowDialog(false);
        }
    } catch(error) {
        toast({ title: 'Ocorreu um erro durante a instalação.', variant: 'destructive' });
        setShowDialog(false);
    }
  };
  
  if (!installPromptEvent || isAppInstalled || !showDialog) {
    return null;
  }

  return (
     <Dialog open={showDialog} onOpenChange={(open) => {
        // Prevent closing the dialog by clicking outside or pressing Escape
        if (!open) {
          setShowDialog(false);
        }
     }}>
        <DialogContent 
            className="sm:max-w-md"
            showCloseButton={false} // Hide the 'X' button
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Download className="h-6 w-6 text-primary" />
                    Instalar Meu Orçamento
                </DialogTitle>
                <DialogDescription>
                    Instale o aplicativo em seu dispositivo para uma experiência mais rápida e para usá-lo como um app nativo,
                    inclusive com **acesso offline**. É rápido e seguro!
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
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
