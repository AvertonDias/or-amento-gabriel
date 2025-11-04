'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, KeyRound, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ThemePicker } from '@/components/theme-picker';
import { ThemeToggle } from '@/components/theme-toggle';


export default function MinhasInformacoesPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: 'Erro',
        description: 'Não foi possível identificar o seu e-mail para enviar o link de recuperação.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'E-mail enviado!',
        description: 'Verifique sua caixa de entrada e a de spam para redefinir sua senha.',
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de redefinição de senha:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail de redefinição. Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Minhas Informações
          </CardTitle>
          <CardDescription>
            Veja os dados da sua conta, gerencie sua senha e personalize a aparência do aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          ) : user ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Seu E-mail de Login</Label>
                    <p className="font-semibold text-lg text-foreground">{user.email}</p>
                  </div>
                </div>
                <div>
                  <Button onClick={handlePasswordReset}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Um e-mail será enviado para você com as instruções para criar uma nova senha.
                  </p>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Personalizar Aparência</h3>
                 <div className="grid gap-2">
                    <h4 className="font-medium">Modo de Componentes</h4>
                    <p className="text-xs text-muted-foreground">
                        Alternar modo claro/escuro para os componentes internos.
                    </p>
                    <div className="flex items-center gap-2">
                       <ThemeToggle />
                       <span className="text-sm text-muted-foreground">Claro / Escuro</span>
                    </div>
                  </div>
                 <div className="grid gap-2">
                    <h4 className="font-medium">Paleta de Cores</h4>
                     <p className="text-xs text-muted-foreground">
                      Escolha um tema visual para a aplicação.
                    </p>
                    <ThemePicker />
                  </div>
              </div>
            </div>
          ) : (
            <p>Não foi possível carregar as informações do usuário. Tente recarregar a página.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
