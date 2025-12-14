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
  onGeneratePDF: (budget: Orcamento, type: 'client' | 'internal') => void;
}

export function BudgetList({
  isLoading,
  budgets,
  empresa,
  onUpdateStatus,
  onDelete,
  onEdit,
  clienteFiltrado,
  onGeneratePDF,
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

  const handleSendWhatsApp = (orcamento: Orcamento) => {
    const phones = orcamento.cliente.telefones;
    if (phones && phones.length > 1) {
      const principal = phones.find(p => p.principal);
      setSelectedPhone(principal?.numero || phones[0].numero);

      setPhoneSelectionConfig({
        isOpen: true,
        phones,
        title: 'Escolha um Telefone',
        description: `O cliente ${orcamento.cliente.nome} possui múltiplos telefones. Para qual número deseja enviar?`,
        onConfirm: (phone) => openWhatsApp(orcamento, phone)
      });
    } else {
      openWhatsApp(orcamento, phones?.[0]?.numero);
    }
  };

  const openWhatsApp = (orcamento: Orcamento, phone: string | undefined) => {
    if (!phone) {
      toast({ title: 'Nenhum telefone encontrado para este cliente.', variant: 'destructive' });
      return;
    }
    const cleanPhone = `55${phone.replace(/\D/g, '')}`;
    const text = `Olá, ${orcamento.cliente.nome}! Segue o orçamento Nº ${orcamento.numeroOrcamento} da empresa ${empresa?.nome || 'Nossa Empresa'}:\n\n*Itens:*${orcamento.itens.map(item => `\n- ${item.materialNome} (${formatNumber(item.quantidade, 2)} ${item.unidade}): ${formatCurrency(item.precoVenda)}`).join('')}\n\n*Total:* *${formatCurrency(orcamento.totalVenda)}*\n\nEste orçamento é válido até ${format(addDays(parseISO(orcamento.dataCriacao), parseInt(orcamento.validadeDias, 10)), 'dd/MM/yyyy')}.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
      <Dialog open={phoneSelectionConfig.isOpen} onOpenChange={(isOpen) => setPhoneSelectionConfig(prev => ({ ...prev, isOpen }))}>
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
      <div className="space-y-4">
        {budgets.map((orcamento) => (
            <Card key={orcamento.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-xl">{orcamento.cliente.nome}</CardTitle>
                        <CardDescription>
                            #{orcamento.numeroOrcamento} —{' '}
                            {formatCurrency(orcamento.totalVenda)}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(orcamento.status)}>
                        {orcamento.status}
                        </Badge>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {orcamento.status === 'Pendente' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onUpdateStatus(orcamento.id, 'Aceito')}>
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500"/>
                                            Marcar como Aceito
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onUpdateStatus(orcamento.id, 'Recusado')}>
                                            <XCircle className="mr-2 h-4 w-4 text-red-500"/>
                                            Marcar como Recusado
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator/>
                                    </>
                                )}
                                <DropdownMenuItem onClick={() => onEdit(orcamento)}>
                                    <Pencil className="mr-2 h-4 w-4"/>
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                      <FileText className="mr-2 h-4 w-4"/>
                                      Gerar PDF
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                      <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => onGeneratePDF(orcamento, 'client')}>
                                              Para Cliente
                                          </DropdownMenuItem>
                                           <DropdownMenuItem onClick={() => onGeneratePDF(orcamento, 'internal')}>
                                              Para Controle Interno
                                          </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuItem onClick={() => handleSendWhatsApp(orcamento)}>
                                    <MessageCircle className="mr-2 h-4 w-4"/>
                                    Enviar por WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                         <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Excluir Orçamento
                                        </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o orçamento.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(orcamento.id)}>Sim, Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
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
            </Card>
        ))}
      </div>
    </>
  );
}
