
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
  MoreVertical, FileSignature
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
    <Badge
      variant={diff < 0 ? 'destructive' : 'default'}
      className="text-xs ml-2"
    >
      {diff < 0 ? 'Desconto' : 'Acréscimo'}: {Math.abs(percent).toFixed(1)}%
    </Badge>
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
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  /* ---------------- EMPTY ---------------- */
  if (!budgets.length) {
    return (
      <p className="text-center text-muted-foreground py-6">
        {clienteFiltrado
          ? `Nenhum orçamento encontrado para ${clienteFiltrado.nome}.`
          : 'Nenhum orçamento encontrado.'}
      </p>
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
      <div className="md:hidden">
        <Accordion type="multiple" className="w-full">
          {budgets.map(o => {
            const hasNotes = !!(o.observacoes || o.observacoesInternas);
            return (
              <AccordionItem value={o.id} key={o.id}>
                <div className="flex items-start w-full group">
                  <AccordionTrigger className="flex-1 text-left py-3 px-2 rounded-t-lg data-[state=open]:bg-muted/50 hover:no-underline hover:bg-muted/30 transition-colors [&>svg]:mt-1">
                    <div className="flex flex-col gap-2 w-full">
                      {/* Cabeçalho */}
                      <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                              <span className="font-medium text-base text-primary">{o.cliente.nome}</span>
                              <span className="text-xs text-muted-foreground">Nº {o.numeroOrcamento}</span>
                          </div>
                      </div>
                      {/* Infos Principais */}
                      <div className="flex flex-col gap-2 text-sm pt-2 border-t">
                           <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Data:</span>
                              <span>{format(parseISO(o.dataCriacao), 'dd/MM/yyyy')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Status:</span>
                              <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                          </div>
                          <div className="flex justify-between items-center text-lg font-bold text-primary pt-2 mt-2 border-t">
                              <span>Total:</span>
                              <div className="flex items-center">
                                {formatCurrency(o.totalVenda)}
                                <AdjustmentBadge orcamento={o} />
                              </div>
                          </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <div className="flex flex-col items-center gap-2 pr-2 py-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações do orçamento" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
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
                </div>

                {hasNotes && (
                  <AccordionContent className="p-4 pt-0 text-sm space-y-2">
                    {o.observacoes && (<div><strong className="text-muted-foreground">Obs. Cliente:</strong> {o.observacoes}</div>)}
                    {o.observacoesInternas && (<div><strong className="text-muted-foreground">Obs. Interna:</strong> {o.observacoesInternas}</div>)}
                  </AccordionContent>
                )}
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      {/* Desktop */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <Accordion type="multiple" asChild>
            <TableBody>
              {budgets.map(o => {
                const hasNotes = !!(o.observacoes || o.observacoesInternas);
                return (
                  <React.Fragment key={o.id}>
                    <TableRow className={cn(hasNotes && 'cursor-pointer border-b-0', 'align-top')}>
                      <TableCell className="font-medium">
                        {hasNotes ? (
                           <AccordionTrigger className="p-0 hover:no-underline [&>svg]:ml-2">{o.numeroOrcamento}</AccordionTrigger>
                        ) : (
                          o.numeroOrcamento
                        )}
                      </TableCell>
                      <TableCell>{o.cliente.nome}</TableCell>
                      <TableCell>{format(parseISO(o.dataCriacao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <div className="flex justify-end items-center">
                          {formatCurrency(o.totalVenda)}
                          <AdjustmentBadge orcamento={o} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Ações do orçamento" className="h-8 w-8">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                      </TableCell>
                    </TableRow>
                    {hasNotes && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                           <AccordionContent>
                            <div className="px-4 py-2 text-sm space-y-2 bg-muted/50">
                              {o.observacoes && (<p><strong className="text-muted-foreground">Obs. Cliente:</strong> {o.observacoes}</p>)}
                              {o.observacoesInternas && (<p><strong className="text-muted-foreground">Obs. Interna:</strong> {o.observacoesInternas}</p>)}
                            </div>
                           </AccordionContent>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Accordion>
        </Table>
      </div>

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
