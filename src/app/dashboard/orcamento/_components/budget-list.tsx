
'use client';

import React, { useState } from 'react';
import type { Orcamento, EmpresaData, ClienteData, Telefone } from '@/lib/types';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Pencil, MessageCircle,
  CheckCircle2, XCircle, Trash2,
  MoreVertical, FileSignature, Info
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

interface BudgetListProps {
  isLoading: boolean;
  budgets: Orcamento[];
  empresa: EmpresaData | null;
  onUpdateStatus: (
    budgetId: string,
    status: 'Aceito' | 'Recusado'
  ) => Promise<void>;
  onDelete: (budgetId: string) => void;
  onEdit: (budget: Orcamento) => void;
  clienteFiltrado: ClienteData | null;
  onGeneratePDF: (budget: Orcamento, type: 'client' | 'internal') => void;
}

/* ---------------- BADGE DE AJUSTE ---------------- */
const AdjustmentBadge = ({ orcamento }: { orcamento: Orcamento }) => {
  const calculated = orcamento.itens.reduce((s, i) => s + i.precoVenda, 0);
  if (Math.abs(calculated - orcamento.totalVenda) < 0.01) return null;

  const diff = orcamento.totalVenda - calculated;
  const percent = calculated ? (diff / calculated) * 100 : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={diff < 0 ? 'destructive' : 'default'}
          className="text-xs ml-2"
        >
          {diff < 0 ? 'Desconto' : 'Acréscimo'}: {Math.abs(percent).toFixed(1)}%
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Total calculado: {formatCurrency(calculated)}</p>
        <p>Ajuste manual: {formatCurrency(diff)}</p>
      </TooltipContent>
    </Tooltip>
  );
};

/* ---------------- COMPONENTE PRINCIPAL ---------------- */
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
  const [budgetToDelete, setBudgetToDelete] = useState<Orcamento | null>(null);


  const [phoneDialog, setPhoneDialog] = useState<{
    open: boolean;
    phones: Telefone[];
    onConfirm: (phone: string) => void;
  }>({ open: false, phones: [], onConfirm: () => {} });

  const getStatusVariant = (
    status: Orcamento['status']
  ): VariantProps<typeof badgeVariants>['variant'] => {
    if (status === 'Aceito') return 'default';
    if (status === 'Recusado') return 'destructive';
    if (status === 'Vencido') return 'warning';
    return 'secondary';
  };

  /* ---------------- WHATSAPP ---------------- */
  const sendWhatsApp = (orcamento: Orcamento) => {
    const phones = orcamento.cliente.telefones ?? [];

    if (phones.length === 0) {
      toast({ title: 'Cliente sem telefone.', variant: 'destructive' });
      return;
    }

    if (phones.length > 1) {
      setSelectedPhone(phones.find(p => p.principal)?.numero ?? phones[0].numero);
      setPhoneDialog({
        open: true,
        phones,
        onConfirm: (phone) => openWhatsApp(orcamento, phone),
      });
    } else {
      openWhatsApp(orcamento, phones[0].numero);
    }
  };

  const openWhatsApp = (orcamento: Orcamento, phone: string) => {
    const cleanPhone = `55${phone.replace(/\D/g, '')}`;

    const subtotal = orcamento.itens.reduce((s, i) => s + i.precoVenda, 0);
    const total = orcamento.totalVenda;
    const diff = total - subtotal;

    const items = orcamento.itens
      .map(i => `- ${i.materialNome} (${formatNumber(i.quantidade, 2)} ${i.unidade}): ${formatCurrency(i.precoVenda)}`)
      .join('\n');

    let text = `Olá, ${orcamento.cliente.nome}!\n\nOrçamento Nº ${orcamento.numeroOrcamento}\n\nItens:\n${items}\n\n`;

    if (Math.abs(diff) > 0.01) {
      text += `Subtotal: ${formatCurrency(subtotal)}\n`;
      text += `${diff < 0 ? 'Desconto' : 'Acréscimo'}: ${formatCurrency(diff)}\n`;
    }

    text += `Total: ${formatCurrency(total)}\n\n`;
    if (orcamento.observacoes) text += `Obs:\n${orcamento.observacoes}\n\n`;

    text += `Válido até ${format(addDays(parseISO(orcamento.dataCriacao), Number(orcamento.validadeDias)), 'dd/MM/yyyy')}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDeleteConfirm = () => {
    if (budgetToDelete) {
      onDelete(budgetToDelete.id);
      setBudgetToDelete(null);
    }
  };


  /* ---------------- LOADING ---------------- */
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ---------------- EMPTY ---------------- */
  if (!budgets.length) {
    return (
      <Card>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            {clienteFiltrado
              ? `Nenhum orçamento encontrado para ${clienteFiltrado.nome}.`
              : 'Nenhum orçamento encontrado.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <>
      {/* Dialog telefone */}
      <Dialog open={phoneDialog.open} onOpenChange={(o) => setPhoneDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha o telefone</DialogTitle>
            <DialogDescription>Selecione o número para envio</DialogDescription>
          </DialogHeader>

          <RadioGroup value={selectedPhone} onValueChange={setSelectedPhone} className="space-y-3">
            {phoneDialog.phones.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={p.numero} id={`phone-${i}`} />
                <Label htmlFor={`phone-${i}`}>{p.nome} — {p.numero}</Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button onClick={() => phoneDialog.onConfirm(selectedPhone)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Mobile - Accordion */}
      <div className="md:hidden space-y-4">
        {budgets.map(o => {
            const hasNotes = !!(o.observacoes || o.observacoesInternas);
            const dataVencimento = addDays(parseISO(o.dataCriacao), Number(o.validadeDias));

            return (
              <Card key={o.id} className="overflow-hidden">
                <Accordion type="single" collapsible={hasNotes} className="w-full">
                  <AccordionItem value={o.id} className="border-b-0">
                    <div className="p-4 flex flex-col">
                      <div className="flex flex-row items-start justify-between space-y-0 mb-4">
                        <div className="space-y-1">
                            <CardTitle>{o.cliente.nome}</CardTitle>
                            <CardDescription>Nº {o.numeroOrcamento}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Ações do orçamento" className="-mr-2 -mt-2 h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => onEdit(o)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sendWhatsApp(o)}>
                                  <MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                  <DropdownMenuSubTrigger><FileText className="mr-2 h-4 w-4" /> Gerar PDF</DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                      <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => onGeneratePDF(o, 'client')}>PDF do Cliente</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => onGeneratePDF(o, 'internal')}>PDF Interno (custos)</DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger disabled={o.status !== 'Pendente'}><FileSignature className="mr-2 h-4 w-4" /> Alterar Status</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                      <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Aceito')}>
                                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Marcar como Aceito
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Recusado')}>
                                          <XCircle className="mr-2 h-4 w-4 text-red-500" /> Marcar como Recusado
                                      </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setBudgetToDelete(o)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      </div>

                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Data:</span>
                              <span>{format(parseISO(o.dataCriacao), 'dd/MM/yyyy')}</span>
                          </div>
                           <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Vencimento:</span>
                              <span>{format(dataVencimento, 'dd/MM/yyyy')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Status:</span>
                              <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                          </div>
                      </div>

                      <div className="flex justify-between items-center text-lg font-bold text-primary pt-2 mt-2 border-t">
                          <div className="flex items-center">
                              Total:
                              {hasNotes && <AccordionTrigger className="p-0 pl-2 hover:no-underline [&>svg]:h-4 [&>svg]:w-4"/>}
                          </div>
                          <div className="flex items-center">
                            {formatCurrency(o.totalVenda)}
                            <AdjustmentBadge orcamento={o} />
                          </div>
                      </div>
                    </div>

                    {hasNotes && (
                      <AccordionContent className="px-4 pb-4 text-sm space-y-2">
                        {o.observacoes && (<div><strong className="text-muted-foreground">Obs. Cliente:</strong> {o.observacoes}</div>)}
                        {o.observacoesInternas && (<div><strong className="text-muted-foreground">Obs. Interna:</strong> {o.observacoesInternas}</div>)}
                      </AccordionContent>
                    )}
                  </AccordionItem>
                </Accordion>
              </Card>
            )
          })}
      </div>

      {/* Desktop */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {budgets.map(o => {
                  const hasNotes = !!(o.observacoes || o.observacoesInternas);
                  const dataVencimento = addDays(parseISO(o.dataCriacao), Number(o.validadeDias));
                  return (
                      <TableRow key={o.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{o.numeroOrcamento}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{o.cliente.nome}</span>
                            {hasNotes && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info size={14} className="text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="p-1 max-w-xs space-y-2">
                                    {o.observacoes && <div><strong className="font-medium">Obs. Cliente:</strong><p className="text-xs">{o.observacoes}</p></div>}
                                    {o.observacoesInternas && <div><strong className="font-medium">Anotações Internas:</strong><p className="text-xs">{o.observacoesInternas}</p></div>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{format(parseISO(o.dataCriacao), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{format(dataVencimento, 'dd/MM/yyyy')}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(o.status)}>{o.status}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">
                          <div className="flex justify-end items-center">{formatCurrency(o.totalVenda)}<AdjustmentBadge orcamento={o} /></div>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(o)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sendWhatsApp(o)}><MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp</DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger><FileText className="mr-2 h-4 w-4" /> Gerar PDF</DropdownMenuSubTrigger>
                                <DropdownMenuPortal><DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={() => onGeneratePDF(o, 'client')}>PDF do Cliente</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onGeneratePDF(o, 'internal')}>PDF Interno</DropdownMenuItem>
                                </DropdownMenuSubContent></DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger disabled={o.status !== 'Pendente'}><FileSignature className="mr-2 h-4 w-4" /> Alterar Status</DropdownMenuSubTrigger>
                                <DropdownMenuPortal><DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Aceito')}><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Aceito</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Recusado')}><XCircle className="mr-2 h-4 w-4 text-red-500" /> Recusado</DropdownMenuItem>
                                </DropdownMenuSubContent></DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setBudgetToDelete(o)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                  )
              })}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita e irá remover o orçamento nº {budgetToDelete?.numeroOrcamento} permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
