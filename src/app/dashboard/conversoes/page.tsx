
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler, Weight, BetweenHorizonalStart, Bot, ArrowRightLeft } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  // Estado para a calculadora de calhas
  const [peso, setPeso] = useState('');
  const [largura, setLargura] = useState('');
  const [espessura, setEspessura] = useState('');
  const [material, setMaterial] = useState('aluminio');

  // Estado para o conversor de unidades
  const [convType, setConvType] = useState('length');
  const [unitValue, setUnitValue] = useState('');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('cm');


  const resultadoCalha = useMemo(() => {
    const P = parseFloat(peso.replace(',', '.'));
    const L_mm = parseFloat(largura.replace(',', '.'));
    const E_mm = parseFloat(espessura.replace(',', '.'));
    const D = DENSIDADES[material];

    if (isNaN(P) || isNaN(L_mm) || isNaN(E_mm) || !D || L_mm === 0 || E_mm === 0 || D === 0) {
      return null;
    }
    const L_m = L_mm / 1000;
    const E_m = E_mm / 1000;
    return P / (L_m * E_m * D);
  }, [peso, largura, espessura, material]);
  
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
            Calcule o rendimento de uma bobina de calha a partir do peso e dimensões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="peso" className="flex items-center gap-1"><Weight className="w-4 h-4"/> Peso da Bobina (kg)</Label>
              <Input id="peso" type="text" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="largura" className="flex items-center gap-1"><BetweenHorizonalStart className="w-4 h-4" /> Largura da Bobina (mm)</Label>
              <Input id="largura" type="text" inputMode="decimal" value={largura} onChange={(e) => setLargura(e.target.value)} placeholder="Ex: 300" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="espessura" className="flex items-center gap-1"><Ruler className="w-4 h-4" /> Espessura da Chapa (mm)</Label>
              <Input id="espessura" type="text" inputMode="decimal" value={espessura} onChange={(e) => setEspessura(e.target.value)} placeholder="Ex: 0,50" />
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
        {resultadoCalha !== null && (
          <CardFooter>
            <Alert className="w-full bg-primary/10 border-primary/30">
                <Bot className="h-5 w-5 text-primary" />
                <AlertTitle className="text-primary font-bold">Resultado do Cálculo</AlertTitle>
                <AlertDescription className="text-lg text-foreground">
                    Essa bobina rende aproximadamente <strong className="text-2xl">{formatNumber(resultadoCalha, 2)}</strong> metros lineares.
                </AlertDescription>
                 <p className="text-xs text-muted-foreground mt-2">
                    Fórmula: Metros = Peso / (Largura × Espessura × Densidade). Recomendamos arredondar para baixo para compensar perdas de corte.
                </p>
            </Alert>
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
