
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
      if (!isAppInstalled) {
        setShowDialog(true);
      }
    };
    
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setShowDialog(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            toast({ title: 'Aplicativo instalado com sucesso!' });
            setIsAppInstalled(true); 
            setInstallPromptEvent(null);
            setShowDialog(false);
        } else {
            toast({ title: 'Instalação cancelada.' });
        }
    } catch(error) {
        toast({ title: 'Ocorreu um erro durante a instalação.', variant: 'destructive' });
    }
  };
  
  if (!installPromptEvent || isAppInstalled || !showDialog) {
    return null;
  }

  return (
     <Dialog open={showDialog} onOpenChange={(open) => {
        // This will be controlled by state, preventing accidental closure
        if(open) setShowDialog(true);
     }}>
        <DialogContent 
            className="sm:max-w-md"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            showCloseButton={false}
        >
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Download className="h-6 w-6 text-primary" />
                    Instalar Meu Orçamento
                </DialogTitle>
                <DialogDescription>
                    Instale o aplicativo em seu dispositivo para uma experiência mais rápida, acesso offline e para usá-lo como um app nativo. É rápido e seguro!
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
                <Button onClick={handleInstallClick}>
                    Instalar Agora
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
