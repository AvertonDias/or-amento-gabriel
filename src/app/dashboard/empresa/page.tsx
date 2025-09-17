'use client';

import React, { FormEvent, useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
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

export default function EmpresaPage() {
  const [empresa, setEmpresa] = useLocalStorage<EmpresaData>('dadosEmpresa', {
    nome: '',
    endereco: '',
    telefone: '',
    cnpj: '',
    logo: ''
  });
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === 'cnpj') {
      maskedValue = maskCnpj(value);
    } else if (name === 'telefone') {
      maskedValue = maskTelefone(value);
    }
    setEmpresa(prev => ({ ...prev, [name]: maskedValue }));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if(file.size > 2 * 1024 * 1024) { // Limite de 2MB
        toast({
          title: 'Arquivo muito grande',
          description: 'Por favor, selecione uma imagem com menos de 2MB.',
          variant: 'destructive',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmpresa(prev => ({ ...prev, logo: reader.result as string }));
        toast({
          title: 'Logo carregado!',
          description: 'O novo logo da empresa foi salvo.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setEmpresa(prev => ({ ...prev, logo: '' }));
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    toast({
      title: 'Logo removido',
      variant: 'destructive'
    });
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // The useLocalStorage hook already saves on change, but we can show a toast here
    toast({
      title: 'Sucesso!',
      description: 'Os dados da empresa foram salvos com sucesso.',
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Insira as informações e o logo da sua empresa. Estes dados serão usados nos orçamentos e salvos localmente no seu navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isClient ? (
            <div className="space-y-6">
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
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
                       <Button type="button" onClick={() => fileInputRef.current?.click()}>
                         <Upload className="mr-2 h-4 w-4" />
                         Carregar Logo
                       </Button>
                       <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                       {empresa.logo && (
                          <Button type="button" variant="outline" size="sm" onClick={removeLogo}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                          </Button>
                       )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Recomendado: PNG ou JPG com no máximo 2MB.</p>
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
                    <Button type="submit" className="w-full sm:w-auto">
                        <Save className="mr-2 h-4 w-4" />
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
