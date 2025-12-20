
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
import { Download, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


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
  const [dontShowInstallDialog, setDontShowInstallDialog] = useLocalStorage<boolean>('pwa-dont-show-install', false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(promptEvent);
      // Only show the dialog if the app isn't installed and user hasn't dismissed it
      if (!isAppInstalled && !dontShowInstallDialog) {
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isAppInstalled, dontShowInstallDialog, setIsAppInstalled]);


  const handleInstallClick = async () => {
    setShowDialog(false); // Hide dialog immediately on click

    // If the native prompt is available (Chrome, Edge), use it.
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
            toast({ title: 'Ocorreu um erro durante a instalação.', description: 'Tente novamente mais tarde.', variant: 'destructive' });
        }
    } else {
        // If no prompt event, it's a browser like Samsung Internet or Safari.
        // We can only show instructions.
        toast({ 
            title: "Como instalar",
            description: "Procure pelo ícone de download na barra de endereço ou use a opção 'Adicionar à tela inicial' no menu do seu navegador.",
            duration: 8000,
        });
    }
  };

  const handleDialogClose = () => {
    if (checkboxChecked) {
      setDontShowInstallDialog(true);
      toast({
        title: 'Aviso oculto.',
        description: 'Você pode reinstalar o app pelo menu do navegador.',
      });
    }
    setShowDialog(false);
  }
  
  if (isAppInstalled || !showDialog) {
    return null;
  }

  return (
     <Dialog open={showDialog} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent 
            className="sm:max-w-md"
            onEscapeKeyDown={handleDialogClose}
        >
          <button onClick={handleDialogClose} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Download className="h-6 w-6 text-primary"/>
                    Instalar o Aplicativo
                </DialogTitle>
                <DialogDescription>
                    Para uma experiência completa e acesso offline, instale nosso aplicativo. Clique em 'Instalar' e siga as instruções do seu navegador.
                </DialogDescription>
            </DialogHeader>
            
            <div className="flex items-center space-x-2 my-4">
              <Checkbox id="dont-show-again" checked={checkboxChecked} onCheckedChange={(checked) => setCheckboxChecked(Boolean(checked))} />
              <Label htmlFor="dont-show-again" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Não mostrar novamente
              </Label>
            </div>

            <DialogFooter className="sm:justify-end pt-4">
                <Button onClick={handleInstallClick}>
                    Instalar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
