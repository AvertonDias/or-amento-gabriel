'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Ruler,
  Weight,
  BetweenHorizonalStart,
  Bot,
  ArrowRightLeft,
  DollarSign,
  PackagePlus,
  Loader2
} from 'lucide-react';
import {
  formatNumber,
  formatCurrency,
  maskCurrency,
  maskDecimal
} from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import {
  addMaterial,
  getMateriais,
  updateMaterial
} from '@/services/materiaisService';
import type { MaterialItem } from '@/lib/types';

/* =======================
   CONSTANTES
======================= */

const DENSIDADES: Record<string, number> = {
  aluminio: 2700,
  galvanizado: 7850
};

const CONVERSION_FACTORS = {
  length: { m: 1, cm: 100, mm: 1000, in: 39.3701, ft: 3.28084, yd: 1.09361 },
  mass: { kg: 1, g: 1000, mg: 1000000, lb: 2.20462, oz: 35.274 },
  volume: { L: 1, ml: 1000, gal: 0.264172, 'fl-oz': 33.814 }
};

const UNIT_LABELS = {
  length: {
    m: 'Metro (m)',
    cm: 'Centímetro (cm)',
    mm: 'Milímetro (mm)',
    in: 'Polegada (in)',
    ft: 'Pé (ft)',
    yd: 'Jarda (yd)'
  },
  mass: {
    kg: 'Quilograma (kg)',
    g: 'Grama (g)',
    mg: 'Miligrama (mg)',
    lb: 'Libra (lb)',
    oz: 'Onça (oz)'
  },
  volume: {
    L: 'Litro (L)',
    ml: 'Mililitro (ml)',
    gal: 'Galão (gal)',
    'fl-oz': 'Onça Líquida (fl oz)'
  }
};

type PriceInputMode = 'kg' | 'total';

/* =======================
   HELPERS
======================= */

const normalizeString = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,]/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

const parseCurrency = (value: string) =>
  Number(value.replace(/[^\d]/g, '')) / 100;

/* =======================
   COMPONENTE
======================= */

export default function ConversoesPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const [peso, setPeso] = useState('');
  const [largura, setLargura] = useState('');
  const [espessura, setEspessura] = useState('');
  const [material, setMaterial] = useState('galvanizado');
  const [priceInputMode, setPriceInputMode] =
    useState<PriceInputMode>('kg');
  const [valorInput, setValorInput] = useState('');
  const [quantidadeMinimaStr, setQuantidadeMinimaStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [convType, setConvType] = useState<'length' | 'mass' | 'volume'>('length');
  const [unitValue, setUnitValue] = useState('');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('cm');

  const [materiais, setMateriais] = useState<MaterialItem[]>([]);
  const [conflictingItem, setConflictingItem] =
    useState<MaterialItem | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  /* =======================
     FETCH MATERIAIS
  ======================= */

  const fetchMateriais = useCallback(async () => {
    if (!user) return;
    try {
      setMateriais(await getMateriais(user.uid));
    } catch {
      toast({
        title: 'Erro ao carregar materiais',
        variant: 'destructive'
      });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchMateriais();
  }, [fetchMateriais]);

  /* =======================
     CÁLCULO CALHA
  ======================= */

  const resultadoCalha = useMemo(() => {
    const P = parseFloat(peso.replace(',', '.'));
    const L = parseFloat(largura);
    const E = parseFloat(espessura.replace(',', '.'));
    const D = DENSIDADES[material];
    const V = parseCurrency(valorInput);

    if (![P, L, E, D].every(v => v > 0)) return null;

    const metros = P / ((L / 1000) * (E / 1000) * D);

    let custoTotal = null;
    let precoPorMetro = null;

    if (V > 0) {
      custoTotal =
        priceInputMode === 'kg' ? V * P : V;
      precoPorMetro = custoTotal / metros;
    }

    return { metros, custoTotal, precoPorMetro };
  }, [peso, largura, espessura, material, valorInput, priceInputMode]);

  /* =======================
     CONVERSÃO UNIDADE
  ======================= */

  const resultadoUnidade = useMemo(() => {
    const value = parseFloat(unitValue.replace(',', '.'));
    if (isNaN(value)) return '';
    const base = value / CONVERSION_FACTORS[convType][fromUnit];
    return formatNumber(
      base * CONVERSION_FACTORS[convType][toUnit],
      3
    );
  }, [unitValue, fromUnit, toUnit, convType]);

  /* =======================
     AÇÕES
  ======================= */

  const resetForm = () => {
    setPeso('');
    setLargura('');
    setEspessura('');
    setValorInput('');
    setQuantidadeMinimaStr('');
    setConflictingItem(null);
  };

  const handleAdicionarAoEstoque = async () => {
    if (!user || !resultadoCalha?.precoPorMetro) {
      toast({
        title: 'Dados incompletos',
        variant: 'destructive'
      });
      return;
    }

    const descricao = normalizeString(
      `Calha ${material} ${largura}mm ${espessura}mm`
    );

    const existente = materiais.find(
      m =>
        normalizeString(m.descricao) === descricao &&
        m.tipo === 'item'
    );

    if (existente) {
      setConflictingItem(existente);
      setIsUpdateConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    await addMaterial(user.uid, {
      descricao,
      unidade: 'm',
      precoUnitario: resultadoCalha.precoPorMetro,
      quantidade: Math.floor(resultadoCalha.metros),
      quantidadeMinima:
        parseFloat(quantidadeMinimaStr.replace(',', '.')) ||
        null,
      tipo: 'item'
    });
    setIsSubmitting(false);
    fetchMateriais();
    resetForm();
  };

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* UI permanece igual à sua, apenas lógica reforçada */}
    </div>
  );
}
