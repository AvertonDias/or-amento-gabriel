
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
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

// Define the shape of the event object for better type safety
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallButton({ isCollapsed }: { isCollapsed?: boolean }) {
  const { toast } = useToast();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useLocalStorage<boolean>('pwa-installed', false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(promptEvent);
      // If the app is not marked as installed, show the dialog
      if (!isAppInstalled) {
        setShowDialog(true);
      }
    };
    
    // Check if the app is already installed
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setShowDialog(false);
    });

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
       window.removeEventListener('appinstalled', () => {
          setIsAppInstalled(true);
          setShowDialog(false);
       });
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
  
  // Render nothing if there is no prompt event or the app is installed
  if (!installPromptEvent || isAppInstalled) {
    return null;
  }

  return (
     <Dialog open={showDialog} onOpenChange={(open) => {
        // Prevent closing the dialog by interaction
        if (!open) return;
        setShowDialog(open);
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
