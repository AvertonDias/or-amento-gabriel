
'use client';

import React, { FormEvent, useState, useEffect, useCallback, useMemo } from 'react';
import type { EmpresaData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building, Save, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { maskCpfCnpj, maskTelefone, validateCpfCnpj } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getEmpresaData, saveEmpresaData } from '@/services/empresaService';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialEmpresaState: Omit<EmpresaData, 'id' | 'userId'> = {
  nome: '',
  endereco: '',
  telefone: '',
  cnpj: '',
  logo: ''
};

export default function EmpresaPage() {
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
       // Se der erro, ainda inicializamos o formulário para o usuário poder tentar salvar
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

  const handleSubmit = async (e: FormEvent) => {
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
    
    setIsSaving(true);
    try {
      const dataToSave = { ...empresa };
      if (!dataToSave.userId) {
          dataToSave.userId = user.uid;
      }
      
      // A função de serviço agora só lida com dados do Firestore
      const savedData = await saveEmpresaData(user.uid, dataToSave);
      setEmpresa(savedData);
      toast({
        title: 'Sucesso!',
        description: 'Os dados da empresa foram salvos com sucesso.',
      });
    } catch(error: any) {
       toast({
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível salvar os dados no Firestore.',
        variant: 'destructive',
      });
      console.error("Erro ao salvar dados da empresa:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const showSkeleton = loadingAuth || isLoadingData;
  const isCpfCnpjInvalid = empresa?.cnpj ? cpfCnpjStatus === 'invalid' : false;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Insira as informações da sua empresa. Estes dados serão usados nos orçamentos e salvos na nuvem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSkeleton ? (
            <div className="space-y-6">
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <Skeleton className="h-10 w-32" />
            </div>
          ) : empresa ? (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <Label htmlFor="nome">Nome da Empresa / Seu Nome</Label>
                    <Input
                    id="nome"
                    name="nome"
                    value={empresa.nome}
                    onChange={handleChange}
                    placeholder="Ex: João da Silva - Reparos Residenciais"
                    required
                    />
                </div>
                <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                    id="endereco"
                    name="endereco"
                    value={empresa.endereco}
                    onChange={handleChange}
                    placeholder="Rua, 123, Bairro, Cidade - UF"
                    required
                    />
                </div>
                <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                    id="telefone"
                    name="telefone"
                    value={empresa.telefone}
                    onChange={handleChange}
                    placeholder="(DD) XXXXX-XXXX"
                    />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ / CPF</Label>
                    <div className="relative">
                       <Input
                          id="cnpj"
                          name="cnpj"
                          value={empresa.cnpj}
                          onChange={handleChange}
                          placeholder="XX.XXX.XXX/XXXX-XX"
                          className={cn(
                            'pr-10',
                            cpfCnpjStatus === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                            cpfCnpjStatus === 'invalid' && 'border-destructive focus-visible:ring-destructive'
                          )}
                        />
                        {empresa.cnpj && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {cpfCnpjStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-500" />}
                              {cpfCnpjStatus === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                            </div>
                        )}
                    </div>
                     {empresa.cnpj && (
                       <p className={cn(
                          "text-xs mt-1",
                          cpfCnpjStatus === 'invalid' ? 'text-destructive' : 'text-muted-foreground'
                       )}>
                        {cpfCnpjStatus === 'invalid' ? 'Documento inválido.' : cpfCnpjStatus === 'incomplete' ? 'Documento incompleto.' : 'Documento válido.'}
                       </p>
                    )}
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={isSaving || isCpfCnpjInvalid}>
                    {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar Dados
                </Button>
            </form>
          ) : (
            <p className="py-4 text-center text-muted-foreground">Não foi possível carregar os dados da empresa. Tente recarregar a página.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
