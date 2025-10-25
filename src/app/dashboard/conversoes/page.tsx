
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler, Weight, BetweenHorizonalStart, Bot } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DENSIDADES: Record<string, number> = {
  aluminio: 2700,
  galvanizado: 7850,
};

export default function ConversoesPage() {
  const [peso, setPeso] = useState('');
  const [largura, setLargura] = useState('');
  const [espessura, setEspessura] = useState('');
  const [material, setMaterial] = useState('aluminio');

  const resultado = useMemo(() => {
    const P = parseFloat(peso.replace(',', '.')); // Peso da bobina (kg)
    const L_mm = parseFloat(largura.replace(',', '.')); // Largura da bobina (mm)
    const E_mm = parseFloat(espessura.replace(',', '.')); // Espessura da chapa (mm)
    const D = DENSIDADES[material]; // Densidade do material (kg/m³)

    if (isNaN(P) || isNaN(L_mm) || isNaN(E_mm) || !D) {
      return null;
    }

    const L_m = L_mm / 1000; // Largura em metros
    const E_m = E_mm / 1000; // Espessura em metros

    if (L_m === 0 || E_m === 0 || D === 0) {
      return null;
    }

    const metrosLineares = P / (L_m * E_m * D);
    return metrosLineares;
  }, [peso, largura, espessura, material]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-6 w-6 text-primary" />
            Conversão de Medidas para Calhas
          </CardTitle>
          <CardDescription>
            Calcule o rendimento em metros lineares de uma bobina de calha a partir do peso e dimensões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="peso" className="flex items-center gap-1"><Weight className="w-4 h-4"/> Peso da Bobina (kg)</Label>
              <Input
                id="peso"
                type="text"
                inputMode="decimal"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Ex: 50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="largura" className="flex items-center gap-1"><BetweenHorizonalStart className="w-4 h-4" /> Largura da Bobina (mm)</Label>
              <Input
                id="largura"
                type="text"
                inputMode="decimal"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                placeholder="Ex: 300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="espessura" className="flex items-center gap-1"><Ruler className="w-4 h-4" /> Espessura da Chapa (mm)</Label>
              <Input
                id="espessura"
                type="text"
                inputMode="decimal"
                value={espessura}
                onChange={(e) => setEspessura(e.target.value)}
                placeholder="Ex: 0,50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger id="material">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluminio">Alumínio (D: 2.700 kg/m³)</SelectItem>
                  <SelectItem value="galvanizado">Aço Galvanizado (D: 7.850 kg/m³)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        {resultado !== null && (
          <CardFooter>
            <Alert className="w-full bg-primary/10 border-primary/30">
                <Bot className="h-5 w-5 text-primary" />
                <AlertTitle className="text-primary font-bold">Resultado do Cálculo</AlertTitle>
                <AlertDescription className="text-lg text-foreground">
                    Essa bobina rende aproximadamente <strong className="text-2xl">{formatNumber(resultado, 2)}</strong> metros lineares.
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
          <CardTitle>Outras Conversões (em breve)</CardTitle>
          <CardDescription>
            Mais ferramentas de conversão serão adicionadas aqui em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Exemplos: cm ↔ m, kg ↔ g, etc.</p>
        </CardContent>
      </Card>
    </div>
  );
}
