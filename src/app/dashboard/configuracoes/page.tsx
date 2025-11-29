
'use client';

import React, { FormEvent, useState, useEffect, useCallback, useMemo } from 'react';
import type { EmpresaData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building, Save, CheckCircle, XCircle, Upload, Trash2, KeyRound, Mail, Settings, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { maskCpfCnpj, maskTelefone, validateCpfCnpj } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getEmpresaData, saveEmpresaData } from '@/services/empresaService';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { User as FirebaseUser, sendPasswordResetEmail } from 'firebase/auth';
import { ThemePicker } from '@/components/theme-picker';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';

const initialEmpresaState: Omit<EmpresaData, 'id' | 'userId'> = {
  nome: '',
  endereco: '',
  telefone: '',
  cnpj: '',
  logo: ''
};

export default function ConfiguracoesPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const fetchEmpresaData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const data = await getEmpresaData(user.uid);
      setEmpresa(data || { ...initialEmpresaState, userId: user.uid });
    } catch(error) {
       toast({ title: "Erro ao buscar dados", description: "Não foi possível carregar os dados da empresa.", variant: "destructive"})
       setEmpresa({ ...initialEmpresaState, userId: user.uid });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchEmpresaData();
    }
  }, [user, fetchEmpresaData]);

  const cpfCnpjStatus = useMemo(() => {
    if (!empresa?.cnpj) return 'incomplete';
    return validateCpfCnpj(empresa.cnpj);
  }, [empresa?.cnpj]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!empresa) return;
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === 'cnpj') {
      maskedValue = maskCpfCnpj(value);
    } else if (name === 'telefone') {
      maskedValue = maskTelefone(value);
    }
    setEmpresa(prev => (prev ? { ...prev, [name]: maskedValue } : null));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (loadEvent) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Converte para JPEG com qualidade de 80% para compressão
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          setEmpresa(prev => (prev ? { ...prev, logo: dataUrl } : null));
        };
        img.src = loadEvent.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = async () => {
    if (!empresa) return;
    setEmpresa(prev => (prev ? { ...prev, logo: '' } : null));
    toast({ title: "Logo removido" });
  };


  const handleEmpresaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!empresa || !user) {
      toast({ title: "Erro", description: "Dados da empresa ou usuário não encontrado.", variant: 'destructive' });
      return;
    };
    if (!empresa.nome || !empresa.endereco) {
      toast({ title: "Campos obrigatórios", description: "Nome da empresa e endereço são obrigatórios.", variant: 'destructive' });
      return;
    }
    if (empresa.cnpj && cpfCnpjStatus === 'invalid') {
      toast({ title: "Documento inválido", description: "O CPF/CNPJ inserido não é válido.", variant: "destructive" });
      return;
    }

    if (empresa.logo && empresa.logo.length > 900 * 1024) { // Aproximadamente 900KB
        toast({
            title: "Imagem muito grande",
            description: "A imagem da logo, mesmo comprimida, é muito grande para salvar. Por favor, escolha uma imagem com menor resolução.",
            variant: "destructive",
            duration: 8000
        });
        return;
    }
    
    setIsSaving(true);
    
    try {
      const dataToSave = { ...empresa };
      if (!dataToSave.userId) {
          dataToSave.userId = user.uid;
      }
      
      const savedData = await saveEmpresaData(user.uid, dataToSave);
      setEmpresa(savedData);
      toast({
        title: 'Sucesso!',
        description: 'Os dados da empresa foram salvos com sucesso.',
      });
    } catch(error: any) {
       let description = 'Não foi possível salvar os dados no Firestore.';
       if (error.code === 'permission-denied') {
          description = 'Você não tem permissão para salvar estes dados. Verifique as regras de segurança do Firestore.';
       } else if (error.code === 'resource-exhausted' || (error.message && error.message.includes('too large'))) {
          description = 'A imagem da logo é muito grande. Escolha uma imagem menor.';
       } else if (error.message) {
          description = error.message;
       }

       toast({
        title: 'Erro ao Salvar',
        description: description,
        variant: 'destructive',
      });
      console.error("Erro ao salvar dados da empresa:", error);
    } finally {
      setIsSaving(false);
    }
  };

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
        description: 'Verifique sua caixa de entrada e a de SPAM para redefinir sua senha.',
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

  const showSkeleton = loadingAuth || isLoadingData;
  const isCpfCnpjInvalid = empresa?.cnpj ? cpfCnpjStatus === 'invalid' : false;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
        <header className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary"/>
                Configurações
            </h1>
            <p className="text-muted-foreground">Gerencie as informações da sua empresa, conta e aparência do aplicativo.</p>
        </header>
        
        {/* DADOS DA EMPRESA */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building className="h-6 w-6" />
                    Dados da Empresa
                </CardTitle>
                <CardDescription>
                    Insira as informações e o logo da sua empresa. Estes dados serão usados nos orçamentos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {showSkeleton ? (
                    <div className="space-y-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <Skeleton className="h-10 w-32" />
                    </div>
                ) : empresa ? (
                    <form onSubmit={handleEmpresaSubmit} className="space-y-6">
                        <div>
                        <Label>Logo da Empresa</Label>
                        <div className="mt-2 flex items-center gap-4">
                            {empresa.logo ? (
                            <div className="relative">
                                <Image src={empresa.logo} alt="Logo" width={80} height={80} className="rounded-lg object-contain border bg-muted" unoptimized />
                                <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={removeLogo}>
                                <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                            ) : (
                            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                                <Building className="h-10 w-10 text-muted-foreground" />
                            </div>
                            )}
                            <div className="flex-1">
                            <Button asChild variant="outline" className="cursor-pointer">
                                <Label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Carregar Imagem
                                </Label>
                            </Button>
                            <Input id="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleLogoChange}/>
                            <p className="text-xs text-muted-foreground mt-2">A imagem será comprimida para caber no banco de dados.</p>
                            </div>
                        </div>
                        </div>

                        <div>
                            <Label htmlFor="nome">Nome da Empresa / Seu Nome</Label>
                            <Input id="nome" name="nome" value={empresa.nome} onChange={handleChange} placeholder="Ex: João da Silva - Reparos Residenciais" required />
                        </div>
                        <div>
                            <Label htmlFor="endereco">Endereço</Label>
                            <Input id="endereco" name="endereco" value={empresa.endereco} onChange={handleChange} placeholder="Rua, 123, Bairro, Cidade - UF" required />
                        </div>
                        <div>
                            <Label htmlFor="telefone">Telefone</Label>
                            <Input id="telefone" name="telefone" value={empresa.telefone} onChange={handleChange} placeholder="(DD) XXXXX-XXXX" />
                        </div>
                        <div>
                        <Label htmlFor="cnpj">CNPJ / CPF</Label>
                            <div className="relative">
                            <Input id="cnpj" name="cnpj" value={empresa.cnpj} onChange={handleChange} placeholder="XX.XXX.XXX/XXXX-XX"
                                className={cn('pr-10', cpfCnpjStatus === 'valid' && 'border-green-500 focus-visible:ring-green-500', cpfCnpjStatus === 'invalid' && 'border-destructive focus-visible:ring-destructive')} />
                                {empresa.cnpj && (
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    {cpfCnpjStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                    {cpfCnpjStatus === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                                    </div>
                                )}
                            </div>
                            {empresa.cnpj && (
                            <p className={cn("text-xs mt-1", cpfCnpjStatus === 'invalid' ? 'text-destructive' : 'text-muted-foreground')}>
                                {cpfCnpjStatus === 'invalid' ? 'Documento inválido.' : cpfCnpjStatus === 'incomplete' ? 'Documento incompleto.' : 'Documento válido.'}
                            </p>
                            )}
                        </div>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isSaving || isCpfCnpjInvalid}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isSaving ? "Salvando..." : "Salvar Dados da Empresa"}
                        </Button>
                    </form>
                ) : (
                    <p className="py-4 text-center text-muted-foreground">Não foi possível carregar os dados da empresa. Tente recarregar a página.</p>
                )}
            </CardContent>
        </Card>

        {/* MINHA CONTA & APARÊNCIA */}
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-6 w-6" />
                        Minha Conta
                    </CardTitle>
                    <CardDescription>
                        Informações da sua conta e gerenciamento de senha.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                {showSkeleton ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                ) : user ? (
                    <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <Label className="text-xs">Seu E-mail de Login</Label>
                            <p className="font-semibold text-foreground">{user.email}</p>
                        </div>
                    </div>
                    <div>
                        <Button onClick={handlePasswordReset}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Alterar Senha
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                            Um e-mail será enviado para você com as instruções.
                        </p>
                    </div>
                    </div>
                ) : (
                    <p>Não foi possível carregar as informações do usuário.</p>
                )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Aparência</CardTitle>
                    <CardDescription>Personalize o visual do aplicativo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-2">
                        <h4 className="font-medium">Modo de Exibição</h4>
                        <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <span className="text-sm text-muted-foreground">Claro / Escuro</span>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <h4 className="font-medium">Paleta de Cores</h4>
                        <ThemePicker />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
