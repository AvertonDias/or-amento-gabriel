
'use client';

import React, { useState } from 'react';
import type { Orcamento, EmpresaData, ClienteData } from '@/lib/types';
import {
  Card, CardContent, CardHeader, CardTitle,
  CardDescription, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuPortal, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Pencil, MessageCircle,
  CheckCircle2, XCircle, Trash2, MoreVertical
} from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { type VariantProps } from 'class-variance-authority';

interface BudgetListProps {
  isLoading: boolean;
  budgets: Orcamento[];
  empresa: EmpresaData | null;
  onUpdateStatus: (
    budgetId: string,
    status: 'Aceito' | 'Recusado'
  ) => Promise<Orcamento | null | undefined>;
  onDelete: (budgetId: string) => void;
  onEdit: (budget: Orcamento) => void;
  clienteFiltrado: ClienteData | null;
}

export function BudgetList({
  isLoading,
  budgets,
  empresa,
  onUpdateStatus,
  onDelete,
  onEdit,
  clienteFiltrado
}: BudgetListProps) {

  const { toast } = useToast();
  const [selectedPhone, setSelectedPhone] = useState('');

  const [phoneSelectionConfig, setPhoneSelectionConfig] = useState<{
    isOpen: boolean;
    phones: { nome: string; numero: string; principal?: boolean }[];
    title: string;
    description: string;
    onConfirm: (phone: string) => void;
  }>({
    isOpen: false,
    phones: [],
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const getStatusBadgeVariant = (
    status: Orcamento['status']
  ): VariantProps<typeof badgeVariants>['variant'] => {
    switch (status) {
      case 'Aceito': return 'default';
      case 'Recusado': return 'destructive';
      case 'Vencido': return 'warning';
      default: return 'secondary';
    }
  };

  const confirmPhoneSelection = () => {
    if (selectedPhone) {
      phoneSelectionConfig.onConfirm(selectedPhone);
      setPhoneSelectionConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  /* ---------- LOADING ---------- */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  /* ---------- EMPTY ---------- */
  if (budgets.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        {clienteFiltrado
          ? `Nenhum orçamento encontrado para ${clienteFiltrado.nome}.`
          : 'Nenhum orçamento encontrado.'}
      </p>
    );
  }

  return (
    <>
      {/* DIALOG DE SELEÇÃO DE TELEFONE */}
      <Dialog open={phoneSelectionConfig.isOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{phoneSelectionConfig.title}</DialogTitle>
            <DialogDescription>
              {phoneSelectionConfig.description}
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={selectedPhone}
            onValueChange={setSelectedPhone}
            className="space-y-3"
          >
            {phoneSelectionConfig.phones.map((phone, index) => (
              <div
                key={`${phone.numero}-${index}`}
                className="flex items-center space-x-2"
              >
                <RadioGroupItem
                  value={phone.numero}
                  id={`phone-${index}`}
                />
                <Label htmlFor={`phone-${index}`}>
                  {phone.nome} — {phone.numero}
                  {phone.principal && ' (Principal)'}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button onClick={confirmPhoneSelection}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LISTA DE ORÇAMENTOS */}
      {budgets.map((orcamento) => (
        <Card key={orcamento.id} className="overflow-hidden">
          <CardHeader className="flex flex-row justify-between">
            <div>
              <CardTitle>{orcamento.cliente.nome}</CardTitle>
              <CardDescription>
                #{orcamento.numeroOrcamento} —{' '}
                {formatCurrency(orcamento.totalVenda)}
              </CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(orcamento.status)}>
              {orcamento.status}
            </Badge>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamento.itens.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.materialNome}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.quantidade)} {item.unidade}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.precoVenda)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button size="sm" onClick={() => onEdit(orcamento)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá
                    permanentemente o orçamento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(orcamento.id)}>
                    Sim, Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </>
  );
}

