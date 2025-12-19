
'use client';

import React from 'react';
import type { Orcamento } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge, badgeVariants } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { format, parseISO, addDays } from 'date-fns';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';
import { Capacitor } from '@capacitor/core';
import { Separator } from '@/components/ui/separator';

interface BudgetDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Orcamento;
}

const getStatusVariant = (
    status: Orcamento['status']
  ): VariantProps<typeof badgeVariants>['variant'] => {
    if (status === 'Aceito') return 'default';
    if (status === 'Recusado') return 'destructive';
    if (status === 'Vencido') return 'warning';
    return 'secondary';
  };

export function BudgetDetailsModal({
  isOpen,
  onOpenChange,
  budget,
}: BudgetDetailsModalProps) {

  const dataCriacao = parseISO(budget.dataCriacao);
  const dataValidade = addDays(dataCriacao, Number(budget.validadeDias));
  const subtotal = budget.itens.reduce((acc, item) => acc + item.precoVenda, 0);
  const totalEditado = Math.abs(subtotal - budget.totalVenda) > 0.01;
  const ajuste = budget.totalVenda - subtotal;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[95vw] h-[90vh] flex flex-col p-0"
        onPointerDownOutside={e => {
          if (Capacitor.isNativePlatform()) e.preventDefault();
        }}
      >
        <DialogHeader className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">
                Orçamento Nº {budget.numeroOrcamento}
              </DialogTitle>
              <DialogDescription>
                Detalhes do orçamento para {budget.cliente.nome}
              </DialogDescription>
            </div>
            <Badge variant={getStatusVariant(budget.status)} className="text-base">
              {budget.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Criação:</span>
              <span className="font-medium">{format(dataCriacao, 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Validade:</span>
              <span className="font-medium">{format(dataValidade, 'dd/MM/yyyy')}</span>
            </div>
            {budget.dataAceite && (
              <div className="flex justify-between text-green-600">
                <span className="font-medium">Aceito em:</span>
                <span className="font-semibold">{format(parseISO(budget.dataAceite), 'dd/MM/yyyy')}</span>
              </div>
            )}
             {budget.dataRecusa && (
              <div className="flex justify-between text-red-600">
                <span className="font-medium">Recusado em:</span>
                <span className="font-semibold">{format(parseISO(budget.dataRecusa), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Itens */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Itens e Serviços</h3>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Qtd.</TableHead>
                            <TableHead className="text-right">Vl. Unit.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {budget.itens.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.materialNome}</TableCell>
                                <TableCell className="text-right">{formatNumber(item.quantidade, 2)} {item.unidade}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.precoVenda / item.quantidade)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.precoVenda)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                         {totalEditado && (
                            <>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right">Subtotal</TableCell>
                                    <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right">{ajuste > 0 ? 'Acréscimo' : 'Desconto'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(ajuste)}</TableCell>
                                </TableRow>
                            </>
                        )}
                        <TableRow className="text-lg bg-muted/50">
                            <TableCell colSpan={3} className="text-right font-bold">TOTAL</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(budget.totalVenda)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
          </div>
          
          {/* Observações */}
          {(budget.observacoes || budget.observacoesInternas) && <Separator />}
          <div className="space-y-4 text-sm">
             {budget.observacoes && (
                <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Observações (para o cliente)</h4>
                    <p className="whitespace-pre-wrap p-3 bg-muted/50 rounded-md">{budget.observacoes}</p>
                </div>
             )}
             {budget.observacoesInternas && (
                <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Anotações Internas (confidencial)</h4>
                    <p className="whitespace-pre-wrap p-3 bg-muted/50 rounded-md">{budget.observacoesInternas}</p>
                </div>
             )}
          </div>
        </div>
        <div className="p-6 pt-0"></div>
      </DialogContent>
    </Dialog>
  );
}
