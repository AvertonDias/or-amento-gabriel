
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>('pwa-install-dismissed', false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(promptEvent);
      
      // If not dismissed before, show the dialog automatically
      if (!isDismissed) {
        setShowDialog(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isDismissed]);


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
            setInstallPromptEvent(null);
            setIsDismissed(true); // Don't show again after successful install
        } else {
            toast({ title: 'Instalação cancelada.' });
        }
    } catch(error) {
        toast({ title: 'Ocorreu um erro durante a instalação.', variant: 'destructive' });
    }
    setShowDialog(false);
  };
  
  const handleDismiss = () => {
    setIsDismissed(true);
    setShowDialog(false);
    toast({ title: 'Lembrete de instalação dispensado.'});
  }

  // Se o evento de instalação não existe, não há nada para renderizar.
  // O modal será acionado pelo estado `showDialog`.
  if (!installPromptEvent) {
    return null;
  }

  return (
     <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        {/* O gatilho (AlertDialogTrigger) pode permanecer no menu se desejado */}
        <AlertDialogTrigger asChild>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            'flex items-center gap-3 rounded-lg w-full text-muted-foreground transition-all hover:text-primary',
                             isCollapsed ? 'h-9 w-9 justify-center px-0' : 'px-3 justify-start py-2'
                        )}
                        onClick={() => setShowDialog(true)}
                    >
                        <Download className="h-5 w-5" />
                        <span className={cn('overflow-hidden transition-all', isCollapsed ? 'w-0' : 'w-auto')}>
                            Instalar App
                        </span>
                        <span className="sr-only">Instalar Aplicativo</span>
                    </Button>
                </TooltipTrigger>
                {isCollapsed && (
                <TooltipContent side="right" align="center" sideOffset={5}>
                    Instalar App
                </TooltipContent>
                )}
            </Tooltip>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Download className="h-6 w-6 text-primary" />
                Instalar Meu Orçamento
            </AlertDialogTitle>
            <AlertDialogDescription>
                Instale o aplicativo em seu dispositivo para uma experiência mais rápida, acesso offline e para usá-lo como um app nativo. É rápido e seguro!
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={handleDismiss}>Dispensar</AlertDialogCancel>
                <AlertDialogAction onClick={handleInstallClick}>
                    Instalar Agora
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
}
