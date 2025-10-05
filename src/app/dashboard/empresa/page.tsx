'use client';

import React, { FormEvent, useState, useEffect, useRef, useCallback } from 'react';
import type { EmpresaData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building, Save, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { maskCnpj, maskTelefone } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getEmpresaData, saveEmpresaData } from '@/services/empresaService';
import { Loader2 } from 'lucide-react';

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmpresaData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const data = await getEmpresaData(user.uid);
      setEmpresa(data || { ...initialEmpresaState, userId: user.uid });
    } catch(error) {
       toast({ title: "Erro ao buscar dados", description: "Não foi possível carregar os dados da empresa.", variant: "destructive"})
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchEmpresaData();
    }
  }, [user, fetchEmpresaData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!empresa) return;
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === 'cnpj') {
      maskedValue = maskCnpj(value);
    } else if (name === 'telefone') {
      maskedValue = maskTelefone(value);
    }
    setEmpresa(prev => (prev ? { ...prev, [name]: maskedValue } : null));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!empresa) return;
    const file = e.target.files?.[0];
    if (file) {
      if(file.size > 5 * 1024 * 1024) { // Limite de 5MB
        toast({
          title: 'Arquivo muito grande',
          description: 'Por favor, selecione uma imagem com menos de 5MB.',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file); // Salva o objeto File
      
      const reader = new FileReader();
      reader.onloadend = () => {
        // Apenas para preview local
        setEmpresa(prev => (prev ? { ...prev, logo: reader.result as string } : null)); 
        toast({
          title: 'Logo pronto para salvar!',
          description: 'A nova imagem do logo foi carregada. Clique em "Salvar Dados" para confirmar.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
     if (!empresa) return;
    setLogoFile(null);
    setEmpresa(prev => (prev ? { ...prev, logo: '' } : null));
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    toast({
      title: 'Logo removido',
      description: 'Clique em "Salvar Dados" para confirmar a remoção.',
      variant: 'destructive'
    });
  }

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
    
    setIsSaving(true);
    try {
      const savedData = await saveEmpresaData(user.uid, empresa, logoFile);
      // Atualiza o estado local com a URL do logo retornada pelo serviço
      setEmpresa(savedData);
      setLogoFile(null); // Limpa o arquivo após o upload
      toast({
        title: 'Sucesso!',
        description: 'Os dados da empresa foram salvos com sucesso.',
      });
    } catch(error: any) {
       toast({
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível salvar os dados. Tente novamente.',
        variant: 'destructive',
      });
      console.error("Erro ao salvar dados da empresa:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const showSkeleton = loadingAuth || isLoadingData;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Insira as informações e o logo da sua empresa. Estes dados serão usados nos orçamentos e salvos na nuvem.
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
          ) : empresa && (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>Logo da Empresa</Label>
                  <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-24 h-24 rounded-lg border border-dashed flex items-center justify-center bg-muted/50">
                      {empresa.logo ? (
                        <Image src={empresa.logo} alt="Logo da Empresa" width={96} height={96} className="object-contain rounded-md" />
                      ) : (
                        <span className="text-xs text-muted-foreground text-center p-2">Sem logo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                       <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                         <Upload className="mr-2 h-4 w-4" />
                         Carregar Logo
                       </Button>
                       <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                       {empresa.logo && (
                          <Button type="button" variant="outline" size="sm" onClick={removeLogo} disabled={isSaving}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                          </Button>
                       )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Recomendado: PNG ou JPG com no máximo 5MB.</p>
                </div>
                
                <div className='border-t pt-6 space-y-6'>
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
                        <Input
                        id="cnpj"
                        name="cnpj"
                        value={empresa.cnpj}
                        onChange={handleChange}
                        placeholder="XX.XXX.XXX/XXXX-XX"
                        />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Salvar Dados
                    </Button>
                </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
