
'use client';

import React, { useState } from 'react';
import type { Orcamento, EmpresaData, ClienteData, Telefone } from '@/lib/types';
import {
  Card, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle
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
  const isAdjusted = Math.abs(calculated - orcamento.totalVenda) > 0.01;

  if (!isAdjusted) {
    return (
      <div className="flex flex-col items-center">
        <span className="font-bold">{formatCurrency(orcamento.totalVenda)}</span>
      </div>
    );
  }

  const diff = orcamento.totalVenda - calculated;
  const percentage = calculated !== 0 ? (diff / calculated) * 100 : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center">
          <span className="font-bold">{formatCurrency(orcamento.totalVenda)}</span>
          <span
            className={cn(
              'text-xs',
              diff < 0 ? 'text-destructive' : 'text-green-600'
            )}
          >
            {diff > 0 ? 'Acréscimo' : 'Desconto'} ({percentage.toFixed(1)}%)
          </span>
        </div>
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
    orcamento: Orcamento | null;
  }>({ open: false, phones: [], orcamento: null });

  const getStatusVariant = (
    status: Orcamento['status']
  ): VariantProps<typeof badgeVariants>['variant'] => {
    if (status === 'Aceito') return 'default';
    if (status === 'Recusado') return 'destructive';
    if (status === 'Vencido') return 'warning';
    return 'secondary';
  };

  /* ---------------- WHATSAPP ---------------- */
  const openWhatsApp = (orcamento: Orcamento, phone: string) => {
    const cleanPhone = `55${phone.replace(/\D/g, '')}`;

    const subtotal = orcamento.itens.reduce((s, i) => s + i.precoVenda, 0);
    const total = orcamento.totalVenda;
    const diff = total - subtotal;
    
    const empresaPrincipalPhone = empresa?.telefones?.find(t => t.principal)?.numero;

    let text = `*${empresa?.nome || 'Orçamento'}*\n`;
    if(empresaPrincipalPhone) {
        text += `(${empresaPrincipalPhone})\n\n`;
    }
    
    text += `*ORÇAMENTO Nº ${orcamento.numeroOrcamento}*\n\n`;

    text += "*DADOS DO CLIENTE:*\n";
    text += `*- Nome:* ${orcamento.cliente.nome}\n`;
    if (orcamento.cliente.cpfCnpj) text += `*- CPF/CNPJ:* ${orcamento.cliente.cpfCnpj}\n`;
    if (orcamento.cliente.endereco) text += `*- Endereço:* ${orcamento.cliente.endereco}\n`;
    orcamento.cliente.telefones.forEach(tel => {
        if(tel.numero) text += `*- ${tel.nome || 'Telefone'}:* ${tel.numero}\n`;
    });
    if (orcamento.cliente.email) text += `*- Email:* ${orcamento.cliente.email}\n`;
    text += "\n";

    text += "*ITENS:*\n";
    orcamento.itens.forEach(i => {
      text += `- ${i.materialNome} (${formatNumber(i.quantidade, 2)} ${i.unidade}): ${formatCurrency(i.precoVenda)}\n`;
    });
    text += "\n";

    if (Math.abs(diff) > 0.01) {
      text += `*Subtotal:* ${formatCurrency(subtotal)}\n`;
      text += `*${diff < 0 ? 'Desconto' : 'Acréscimo'}:* ${formatCurrency(diff)}\n`;
    }

    text += `*TOTAL:* ${formatCurrency(total)}\n\n`;
    if (orcamento.observacoes) text += `*Observações:*\n${orcamento.observacoes}\n\n`;

    text += `*Validade:* ${format(addDays(parseISO(orcamento.dataCriacao), Number(orcamento.validadeDias)), 'dd/MM/yyyy')}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };
  
  const sendWhatsApp = (orcamento: Orcamento) => {
    const phones = orcamento.cliente.telefones?.filter(t => t.numero) ?? [];

    if (phones.length === 0) {
      toast({ title: 'Cliente sem telefone cadastrado.', variant: 'destructive' });
      return;
    }

    if (phones.length > 1) {
      setSelectedPhone(phones.find(p => p.principal)?.numero ?? phones[0].numero);
      setPhoneDialog({
        open: true,
        phones,
        orcamento: orcamento,
      });
    } else {
      openWhatsApp(orcamento, phones[0].numero);
    }
  };

  const handleConfirmPhone = () => {
      if (phoneDialog.orcamento && selectedPhone) {
          openWhatsApp(phoneDialog.orcamento, selectedPhone);
          setPhoneDialog({ open: false, phones: [], orcamento: null });
      }
  }


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
            <DialogDescription>O cliente possui múltiplos números. Selecione para qual deseja enviar.</DialogDescription>
          </DialogHeader>

          <RadioGroup value={selectedPhone} onValueChange={setSelectedPhone} className="space-y-3 my-4">
            {phoneDialog.phones.map((p, i) => (
              <div key={i} className="flex items-center gap-3 border p-3 rounded-md">
                <RadioGroupItem value={p.numero} id={`phone-${i}`} />
                <Label htmlFor={`phone-${i}`} className="flex flex-col cursor-pointer">
                  <span className="font-semibold">{p.nome || `Telefone ${i + 1}`}</span>
                  <span className="text-muted-foreground">{p.numero}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneDialog({ open: false, phones: [], orcamento: null })}>Cancelar</Button>
            <Button onClick={handleConfirmPhone}>Confirmar Envio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Mobile - Accordion */}
      <div className="md:hidden space-y-4">
        {budgets.map(o => {
            const hasNotes = !!(o.observacoes || o.observacoesInternas);
            return (
              <Card key={o.id} className="overflow-hidden">
                <Accordion type="single" collapsible={hasNotes} className="w-full">
                  <AccordionItem value={o.id} className="border-b-0">
                    <div className="flex flex-col">
                      <div className="p-4 flex items-start justify-between space-y-0">
                         <div>
                            <p className="text-sm text-muted-foreground">Nº {o.numeroOrcamento}</p>
                            <h3 className="text-lg font-semibold">{o.cliente.nome}</h3>
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

                      <div className="px-4 space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Criação:</span>
                              <span>{format(parseISO(o.dataCriacao), 'dd/MM/yyyy')}</span>
                          </div>
                           <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Vencimento:</span>
                              <span>{format(addDays(parseISO(o.dataCriacao), Number(o.validadeDias)), 'dd/MM/yyyy')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="font-medium text-muted-foreground">Status:</span>
                              <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                          </div>
                      </div>

                      <div className="px-4 flex justify-between items-center text-lg font-bold text-primary pt-2 mt-2 border-t">
                          Total:
                          <div className="flex justify-end items-center">
                            <AdjustmentBadge orcamento={o} />
                          </div>
                      </div>

                       {hasNotes && (
                         <div className="pb-2">
                           <AccordionTrigger className="px-4 text-sm text-muted-foreground hover:no-underline flex items-center gap-1">
                              Observações
                           </AccordionTrigger>
                           <AccordionContent className="px-4 pb-2 text-sm space-y-2">
                             {o.observacoes && (<div><strong className="text-muted-foreground">Obs. Cliente:</strong> {o.observacoes}</div>)}
                             {o.observacoesInternas && (<div><strong className="text-muted-foreground">Obs. Interna:</strong> {o.observacoesInternas}</div>)}
                           </AccordionContent>
                         </div>
                       )}
                    </div>
                  </AccordionItem>
                </Accordion>
              </Card>
            )
          })}
      </div>

      {/* Desktop */}
      <div className="hidden md:block border rounded-md">
        <div className="bg-muted/50">
          <div className="grid grid-cols-[80px_1fr_100px_100px_110px_1fr_100px] items-center px-4 py-2 font-medium text-muted-foreground text-sm">
              <div className="shrink-0 text-center">Nº</div>
              <div className="flex-1">Cliente</div>
              <div className="shrink-0 text-center">Criação</div>
              <div className="shrink-0 text-center">Vencimento</div>
              <div className="shrink-0 text-center">Status</div>
              <div className="text-center">Valor</div>
              <div className="shrink-0 text-center">Ações</div>
          </div>
        </div>
         <Accordion type="multiple" className="w-full">
            {budgets.map(o => {
                const hasNotes = !!(o.observacoes || o.observacoesInternas);
                return (
                    <AccordionItem value={o.id} key={o.id} className="border-b">
                        <div
                            className={cn("grid grid-cols-[80px_1fr_100px_100px_110px_1fr_100px] items-center px-4 py-3 text-sm hover:bg-muted/50")}
                        >
                            <div className="shrink-0 font-medium text-center">{o.numeroOrcamento}</div>
                            <div className="flex items-center text-left">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="link" className="text-current p-0 h-auto font-normal text-left" onClick={() => onEdit(o)}>
                                    {o.cliente.nome}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar Orçamento</p></TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="shrink-0 text-center">{format(parseISO(o.dataCriacao), 'dd/MM/yyyy')}</div>
                            <div className="shrink-0 text-center">{format(addDays(parseISO(o.dataCriacao), Number(o.validadeDias)), 'dd/MM/yyyy')}</div>
                            <div className="shrink-0 flex justify-center"><Badge variant={getStatusVariant(o.status)}>{o.status}</Badge></div>
                            <div className="font-semibold flex justify-center items-center">
                                <AdjustmentBadge orcamento={o} />
                            </div>
                            <div className="shrink-0 text-center flex justify-center items-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
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
                                {hasNotes ? (
                                    <AccordionTrigger className="p-2 -mr-2" hideChevron>
                                      <div className="p-0 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center gap-1 text-muted-foreground hover:text-accent-foreground text-xs">
                                        Obs.
                                      </div>
                                    </AccordionTrigger>
                                ) : (
                                  <div className="p-2 -mr-2 invisible">
                                    <div className="p-0 rounded-md flex items-center gap-1 text-xs">Obs.</div>
                                  </div>
                                )}
                            </div>
                        </div>
                        {hasNotes && (
                            <AccordionContent>
                              <div className="bg-muted/30 text-sm space-y-2 p-4 col-span-7">
                                  {o.observacoes && (<div><strong className="text-muted-foreground">Obs. Cliente:</strong> {o.observacoes}</div>)}
                                  {o.observacoesInternas && (<div><strong className="text-muted-foreground">Obs. Internas:</strong> {o.observacoesInternas}</div>)}
                              </div>
                            </AccordionContent>
                        )}
                    </AccordionItem>
                )
            })}
        </Accordion>
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
