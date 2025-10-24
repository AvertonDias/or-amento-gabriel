
'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import logo from "@/components/ui/logo";

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
        toast({
            title: "Campos obrigatórios",
            description: "Por favor, preencha todos os campos.",
            variant: "destructive",
        });
        return;
    }
    if (password !== confirmPassword) {
        toast({
            title: "Senhas não conferem",
            description: "As senhas não coincidem. Por favor, tente novamente.",
            variant: "destructive",
        });
        return;
    }
    if (password.length < 6) {
        toast({
            title: "Senha muito curta",
            description: "A senha deve ter no mínimo 6 caracteres.",
            variant: "destructive",
        });
        return;
    }
    setIsLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Conta criada com sucesso!",
        description: "Você será redirecionado para a página de orçamentos.",
      });
      router.push('/dashboard/orcamento');
    } catch (error: any) {
      let errorMessage = "Ocorreu um erro desconhecido.";
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este e-mail já está em uso por outra conta.';
          break;
        case 'auth/invalid-email':
            errorMessage = 'O formato do e-mail é inválido.';
            break;
        case 'auth/weak-password':
          errorMessage = 'A senha é muito fraca.';
          break;
        default:
          errorMessage = 'Erro ao criar a conta. Tente novamente.';
          break;
      }
      toast({
        title: "Erro no Cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center flex-col gap-2 mb-4">
            <Image
              src={logo}
              alt="Logo do Site"
              width={80}
              height={80}
              className="rounded-lg"
            />
            <h1 className="text-2xl font-bold">Meu orçamento</h1>
          </div>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Crie sua conta para começar a gerar orçamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seuemail@exemplo.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <div className="relative">
                <Input 
                  id="confirm-password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                 <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="underline text-primary">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
