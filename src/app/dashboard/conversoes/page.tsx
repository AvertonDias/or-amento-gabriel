
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler, Weight, BetweenHorizonalStart, Bot, ArrowRightLeft, DollarSign, PackagePlus, Loader2 } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addMaterial } from '@/services/materiaisService';
import { useRouter } from 'next/navigation';

const DENSIDADES: Record<string, number> = {
  aluminio: 2700,
  galvanizado: 7850,
};

const CONVERSION_FACTORS: Record<string, Record<string, number>> = {
  length: { m: 1, cm: 100, mm: 1000 },
  mass: { kg: 1, g: 1000, mg: 1000000 },
};

const UNIT_LABELS: Record<string, Record<string, string>> = {
    length: { m: 'Metro (m)', cm: 'Centímetro (cm)', mm: 'Milímetro (mm)' },
    mass: { kg: 'Quilograma (kg)', g: 'Grama (g)', mg: 'Miligrama (mg)' },
}

export default function ConversoesPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  // Estado para a calculadora de calhas
  const [peso, setPeso] = useState('');
  const [largura, setLargura] = useState('');
  const [espessura, setEspessura] = useState('');
  const [material, setMaterial] = useState('aluminio');
  const [valorPago, setValorPago] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Estado para o conversor de unidades
  const [convType, setConvType] = useState('length');
  const [unitValue, setUnitValue] = useState('');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('cm');


  const resultadoCalha = useMemo(() => {
    const P = parseFloat(peso.replace(',', '.'));
    const L_mm = parseFloat(largura.replace(',', '.'));
    const E_mm = parseFloat(espessura.replace(',', '.'));
    const V = parseFloat(valorPago.replace(',', '.'));
    const D = DENSIDADES[material];

    if (isNaN(P) || isNaN(L_mm) || isNaN(E_mm) || !D || L_mm === 0 || E_mm === 0 || D === 0) {
      return null;
    }
    const L_m = L_mm / 1000;
    const E_m = E_mm / 1000;
    const metros = P / (L_m * E_m * D);
    const precoPorMetro = !isNaN(V) && metros > 0 ? V / metros : null;

    return { metros, precoPorMetro };
  }, [peso, largura, espessura, material, valorPago]);
  
  const resultadoUnidade = useMemo(() => {
    const value = parseFloat(unitValue.replace(',', '.'));
    if (isNaN(value)) return '';

    const factors = CONVERSION_FACTORS[convType];
    const baseValue = value / factors[fromUnit];
    const convertedValue = baseValue * factors[toUnit];
    
    return formatNumber(convertedValue, 3);
  }, [unitValue, fromUnit, toUnit, convType]);

  const handleConversionTypeChange = (type: string) => {
    setConvType(type);
    setUnitValue('');
    if (type === 'length') {
        setFromUnit('m');
        setToUnit('cm');
    } else if (type === 'mass') {
        setFromUnit('kg');
        setToUnit('g');
    }
  }

  const handleAdicionarAoEstoque = async () => {
    if (!user || !resultadoCalha || !resultadoCalha.metros || resultadoCalha.precoPorMetro === null) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos, incluindo o valor pago, para adicionar ao estoque.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const materialDescricao = `Bobina ${material === 'aluminio' ? 'Alumínio' : 'Aço Galvanizado'} ${largura}mm ${espessura}mm`;

      const novoItem = {
        descricao: materialDescricao,
        unidade: 'm',
        precoUnitario: resultadoCalha.precoPorMetro,
        quantidade: resultadoCalha.metros,
        tipo: 'item' as const,
      };

      await addMaterial(user.uid, novoItem);
      
      toast({
        title: "Sucesso!",
        description: `${materialDescricao} foi adicionado ao seu estoque.`,
      });
      
      // Reset form
      setPeso('');
      setLargura('');
      setEspessura('');
      setValorPago('');
      
      // Redirect to materials page
      router.push('/dashboard/materiais');

    } catch (error) {
       toast({ title: 'Erro ao adicionar item', variant: 'destructive' });
       console.error("Erro ao adicionar ao estoque:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  const currentUnitOptions = UNIT_LABELS[convType] || {};

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-6 w-6 text-primary" />
            Conversão de Bobina para Metros Lineares
          </CardTitle>
          <CardDescription>
            Calcule o rendimento e o custo por metro de uma bobina, e adicione ao seu estoque.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="peso" className="flex items-center gap-1"><Weight className="w-4 h-4"/> Peso da Bobina (kg)</Label>
              <Input id="peso" type="text" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="largura" className="flex items-center gap-1"><BetweenHorizonalStart className="w-4 h-4" /> Largura (mm)</Label>
              <Input id="largura" type="text" inputMode="decimal" value={largura} onChange={(e) => setLargura(e.target.value)} placeholder="Ex: 300" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="espessura" className="flex items-center gap-1"><Ruler className="w-4 h-4" /> Espessura (mm)</Label>
              <Input id="espessura" type="text" inputMode="decimal" value={espessura} onChange={(e) => setEspessura(e.target.value)} placeholder="Ex: 0,50" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="valor-pago" className="flex items-center gap-1"><DollarSign className="w-4 h-4"/> Valor Total Pago (R$)</Label>
              <Input id="valor-pago" type="text" inputMode="decimal" value={valorPago} onChange={(e) => setValorPago(e.target.value)} placeholder="Ex: 650,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger id="material"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluminio">Alumínio (D: 2.700 kg/m³)</SelectItem>
                  <SelectItem value="galvanizado">Aço Galvanizado (D: 7.850 kg/m³)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        {resultadoCalha?.metros !== null && resultadoCalha?.metros !== undefined && (
          <CardFooter className="flex-col items-start gap-4">
            <Alert className="w-full bg-primary/10 border-primary/30">
                <Bot className="h-5 w-5 text-primary" />
                <AlertTitle className="text-primary font-bold">Resultado do Cálculo</AlertTitle>
                <AlertDescription className="space-y-2 text-foreground">
                    <p className="text-lg">Essa bobina rende aproximadamente <strong className="text-2xl">{formatNumber(resultadoCalha.metros, 2)}</strong> metros lineares.</p>
                    {resultadoCalha.precoPorMetro !== null && (
                      <p className="text-lg">Custo de <strong className="text-2xl">{formatCurrency(resultadoCalha.precoPorMetro)}</strong> por metro.</p>
                    )}
                </AlertDescription>
                 <p className="text-xs text-muted-foreground mt-2">
                    Fórmula: Metros = Peso / (Largura × Espessura × Densidade).
                </p>
            </Alert>
            <Button onClick={handleAdicionarAoEstoque} disabled={isSubmitting || resultadoCalha.precoPorMetro === null}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PackagePlus className="mr-2 h-4 w-4" />}
              Adicionar ao Estoque de Itens
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Conversor de Unidades
          </CardTitle>
          <CardDescription>
            Converta rapidamente unidades de comprimento e massa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="conv-type">Tipo de Conversão</Label>
                 <Select value={convType} onValueChange={handleConversionTypeChange}>
                    <SelectTrigger id="conv-type" className="w-full md:w-[280px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="length">Comprimento</SelectItem>
                        <SelectItem value="mass">Massa</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="from-value">Valor</Label>
                    <Input id="from-value" type="text" inputMode="decimal" value={unitValue} onChange={e => setUnitValue(e.target.value)} placeholder="Digite o valor" />
                </div>
                 <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="from-unit">De</Label>
                    <Select value={fromUnit} onValueChange={setFromUnit}>
                        <SelectTrigger id="from-unit"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {Object.entries(currentUnitOptions).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex justify-center items-end h-full">
                    <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="to-unit">Para</Label>
                    <Select value={toUnit} onValueChange={setToUnit}>
                        <SelectTrigger id="to-unit"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {Object.entries(currentUnitOptions).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-3 space-y-2">
                    <Label>Resultado</Label>
                    <Input value={resultadoUnidade} readOnly className="font-bold text-lg bg-muted" />
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    