
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler, Weight, BetweenHorizonalStart, Bot, ArrowRightLeft, DollarSign, PackagePlus, Loader2 } from 'lucide-react';
import { formatNumber, formatCurrency, maskCurrency, maskDecimal } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addMaterial, getMateriais, updateMaterial } from '@/services/materiaisService';
import type { MaterialItem } from '@/lib/types';


const DENSIDADES: Record<string, number> = {
  aluminio: 2700,
  galvanizado: 7850,
};

const CONVERSION_FACTORS: Record<string, Record<string, number>> = {
  length: {
    m: 1,
    cm: 100,
    mm: 1000,
    in: 39.3701,
    ft: 3.28084,
    yd: 1.09361
  },
  mass: {
    kg: 1,
    g: 1000,
    mg: 1000000,
    lb: 2.20462,
    oz: 35.274
  },
};

const UNIT_LABELS: Record<string, Record<string, string>> = {
    length: {
        m: 'Metro (m)',
        cm: 'Centímetro (cm)',
        mm: 'Milímetro (mm)',
        in: 'Polegada (in)',
        ft: 'Pé (ft)',
        yd: 'Jarda (yd)',
    },
    mass: {
        kg: 'Quilograma (kg)',
        g: 'Grama (g)',
        mg: 'Miligrama (mg)',
        lb: 'Libra (lb)',
        oz: 'Onça (oz)',
    },
}

type PriceInputMode = 'kg' | 'total';

// Helper function to normalize strings for comparison
const normalizeString = (str: string) => {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ');
};

export default function ConversoesPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  // Estado para a calculadora de calhas
  const [peso, setPeso] = useState('');
  const [largura, setLargura] = useState('');
  const [espessura, setEspessura] = useState('');
  const [material, setMaterial] = useState('galvanizado');
  const [priceInputMode, setPriceInputMode] = useState<PriceInputMode>('kg');
  const [valorInput, setValorInput] = useState('');
  const [quantidadeMinimaStr, setQuantidadeMinimaStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para o conversor de unidades
  const [convType, setConvType] = useState('length');
  const [unitValue, setUnitValue] = useState('');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('cm');
  
  // Estado para materiais e confirmação de atualização
  const [materiais, setMateriais] = useState<MaterialItem[]>([]);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [conflictingItem, setConflictingItem] = useState<MaterialItem | null>(null);

  const fetchMateriais = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMateriais(user.uid);
      setMateriais(data);
    } catch (error) {
      console.error("Erro ao buscar materiais:", error);
      toast({ title: 'Erro ao carregar lista de materiais', variant: 'destructive' });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchMateriais();
  }, [fetchMateriais]);


  const resultadoCalha = useMemo(() => {
    const P = parseFloat(peso.replace(',', '.'));
    const L_mm = parseFloat(largura.replace(',', '.'));
    const E_mm = parseFloat(espessura.replace(',', '.'));
    const V = parseFloat(valorInput.replace(/\D/g, '')) / 100;
    const D = DENSIDADES[material];

    if (isNaN(P) || isNaN(L_mm) || isNaN(E_mm) || !D || L_mm === 0 || E_mm === 0 || D === 0) {
      return null;
    }
    const L_m = L_mm / 1000;
    const E_m = E_mm / 1000;
    const metros = P / (L_m * E_m * D);
    
    let precoPorMetro = null;
    let custoTotal = null;

    if (!isNaN(V) && V > 0 && P > 0) {
      if (priceInputMode === 'kg') {
        custoTotal = V * P;
      } else { // priceInputMode === 'total'
        custoTotal = V;
      }
      
      if (metros > 0) {
         precoPorMetro = custoTotal / metros;
      }
    }

    return { metros, precoPorMetro, custoTotal };
  }, [peso, largura, espessura, material, valorInput, priceInputMode]);
  
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

  const handleValorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValorInput(maskCurrency(e.target.value));
  };

  const handlePriceModeChange = (mode: PriceInputMode) => {
    setPriceInputMode(mode);
    setValorInput(''); // Reseta o campo de valor ao trocar o modo
  };

  const resetForm = () => {
    setPeso('');
    setLargura('');
    setEspessura('');
    setValorInput('');
    setQuantidadeMinimaStr('');
  };
  
  const performAdd = async () => {
    if (!user || !resultadoCalha || !resultadoCalha.metros || resultadoCalha.precoPorMetro === null) return;
     try {
      const numLargura = parseFloat(largura.replace(',', '.'));
      const numEspessura = parseFloat(espessura.replace(',', '.'));
      const materialDescricao = `Calha ${material === 'aluminio' ? 'Alumínio' : 'Aço Galvanizado'} ${formatNumber(numLargura,0)}mm ${formatNumber(numEspessura,2)}mm`;
      
      const numQuantidadeMinima = parseFloat(quantidadeMinimaStr.replace(',', '.')) || null;

      const novoItem: Omit<MaterialItem, 'id' | 'userId'> = {
        descricao: materialDescricao,
        unidade: 'm',
        precoUnitario: resultadoCalha.precoPorMetro,
        quantidade: Math.floor(resultadoCalha.metros),
        quantidadeMinima: numQuantidadeMinima,
        tipo: 'item' as const,
      };

      await addMaterial(user.uid, novoItem);
      
      toast({
        title: "Sucesso!",
        description: `${materialDescricao} foi adicionado ao seu estoque.`,
      });

      await fetchMateriais();
      resetForm();
      
    } catch (error) {
       toast({ title: 'Erro ao adicionar item', variant: 'destructive' });
       console.error("Erro ao adicionar ao estoque:", error);
    }
  };

  const performUpdate = async () => {
    if (!conflictingItem || !user || !resultadoCalha || !resultadoCalha.metros || resultadoCalha.precoPorMetro === null) return;
    try {
      const { id, ...materialToUpdate } = conflictingItem;
      const numQuantidadeMinima = parseFloat(quantidadeMinimaStr.replace(',', '.')) || materialToUpdate.quantidadeMinima || null;

      const newQuantity = (materialToUpdate.quantidade || 0) + Math.floor(resultadoCalha.metros);

      const updatedPayload: Partial<Omit<MaterialItem, 'id' | 'userId'>> = {
        precoUnitario: resultadoCalha.precoPorMetro,
        quantidade: newQuantity,
        quantidadeMinima: numQuantidadeMinima,
      };

      await updateMaterial(user.uid, id, updatedPayload);
      toast({
        title: "Sucesso!",
        description: "Estoque do item atualizado com sucesso.",
      });

      await fetchMateriais();
      resetForm();

    } catch (error) {
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    } finally {
      setConflictingItem(null);
    }
};

  const handleAdicionarAoEstoque = async () => {
    if (!user || !resultadoCalha || !resultadoCalha.metros || resultadoCalha.precoPorMetro === null) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos, incluindo o valor, para adicionar ao estoque.",
        variant: "destructive"
      });
      return;
    }
    
    const numLargura = parseFloat(largura.replace(',', '.'));
    const numEspessura = parseFloat(espessura.replace(',', '.'));

    if (isNaN(numLargura) || isNaN(numEspessura) || numEspessura <= 0) {
        toast({ title: "Largura ou espessura inválida", variant: "destructive" });
        return;
    }
    
    const materialDescricao = `Calha ${material === 'aluminio' ? 'Alumínio' : 'Aço Galvanizado'} ${formatNumber(numLargura,0)}mm ${formatNumber(numEspessura,2)}mm`;
    const normalizedDescricao = normalizeString(materialDescricao);

    const existingItem = materiais.find(m => normalizeString(m.descricao) === normalizedDescricao && m.tipo === 'item');

    if (existingItem) {
      setConflictingItem(existingItem);
      setIsUpdateConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    await performAdd();
    setIsSubmitting(false);
  };
  
  const handleConfirmUpdate = async () => {
    setIsUpdateConfirmOpen(false);
    if (!conflictingItem) return;
    
    setIsSubmitting(true);
    await performUpdate();
    setIsSubmitting(false);
  };
  
  const handleDecimalInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, decimals: number = 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(maskDecimal(e.target.value, decimals));
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="peso" className="flex items-center gap-1"><Weight className="w-4 h-4"/> Peso da Bobina (kg)</Label>
              <Input id="peso" type="text" inputMode="decimal" value={peso} onChange={handleDecimalInputChange(setPeso)} placeholder="Ex: 50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="largura" className="flex items-center gap-1"><BetweenHorizonalStart className="w-4 h-4" /> Largura (mm)</Label>
              <Input id="largura" type="text" inputMode="numeric" value={largura} onChange={(e) => setLargura(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Ex: 300" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="espessura" className="flex items-center gap-1"><Ruler className="w-4 h-4" /> Espessura (mm)</Label>
              <Input id="espessura" type="text" inputMode="decimal" value={espessura} onChange={(e) => setEspessura(maskDecimal(e.target.value, 2))} placeholder="Ex: 0,50" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="price-mode">Tipo de Valor</Label>
              <Select value={priceInputMode} onValueChange={(v) => handlePriceModeChange(v as PriceInputMode)}>
                <SelectTrigger id="price-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Valor por Kg (R$)</SelectItem>
                  <SelectItem value="total">Valor Total Pago (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor-input" className="flex items-center gap-1"><DollarSign className="w-4 h-4"/> {priceInputMode === 'kg' ? 'Valor por Kg (R$)' : 'Valor Total Pago (R$)'}</Label>
              <Input id="valor-input" type="text" inputMode="decimal" value={valorInput} onChange={handleValorInputChange} placeholder={priceInputMode === 'kg' ? "R$ 13,00" : "R$ 650,00"} />
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
            <div className="space-y-2">
              <Label htmlFor="quantidadeMinima">Estoque Mínimo (opcional)</Label>
              <Input id="quantidadeMinima" type="text" inputMode="decimal" value={quantidadeMinimaStr} onChange={handleDecimalInputChange(setQuantidadeMinimaStr)} placeholder="Ex: 10" />
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
                    {resultadoCalha.custoTotal !== null && (
                        <p className="text-lg">Custo total da bobina: <strong className="text-xl">{formatCurrency(resultadoCalha.custoTotal)}</strong>.</p>
                    )}
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
                    <Input id="from-value" type="text" inputMode="decimal" value={unitValue} onChange={handleDecimalInputChange(setUnitValue, 3)} placeholder="Digite o valor" />
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
      
       <AlertDialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Item Duplicado Encontrado</AlertDialogTitle>
               <AlertDialogDescription>
                 Este item já existe. Deseja somar a nova quantidade (~{formatNumber(resultadoCalha?.metros, 0)}m) ao estoque, usar o novo preço de custo ({formatCurrency(resultadoCalha?.precoPorMetro)}) e o novo estoque mínimo?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConflictingItem(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmUpdate}>Sim, Adicionar e Atualizar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
