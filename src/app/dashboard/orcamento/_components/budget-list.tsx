
'use client';

import React, { useState } from 'react';
import type { Orcamento, EmpresaData, ClienteData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Pencil, MessageCircle, CheckCircle2, XCircle, Trash2, MoreVertical } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BudgetListProps {
    isLoading: boolean;
    budgets: Orcamento[];
    empresa: EmpresaData | null;
    onUpdateStatus: (budgetId: string, status: 'Aceito' | 'Recusado') => Promise<Orcamento | null | undefined>;
    onDelete: (budgetId: string) => void;
    onEdit: (budget: Orcamento) => void;
    clienteFiltrado: ClienteData | null;
}

export function BudgetList({ isLoading, budgets, empresa, onUpdateStatus, onDelete, onEdit, clienteFiltrado }: BudgetListProps) {
    const { toast } = useToast();
    const [pdfBudget, setPdfBudget] = useState<Orcamento | null>(null);

    const [phoneSelectionConfig, setPhoneSelectionConfig] = useState<{
        isOpen: boolean;
        type: 'company' | 'client' | null;
        phones: { nome: string; numero: string; principal?: boolean }[];
        title: string;
        description: string;
        onConfirm: (selectedPhone: string) => void;
      }>({
        isOpen: false,
        type: null,
        phones: [],
        title: '',
        description: '',
        onConfirm: () => {},
    });
    const [selectedPhone, setSelectedPhone] = useState('');

    const getStatusBadgeVariant = (status: Orcamento['status']): "default" | "destructive" | "secondary" | "outline" => {
        switch (status) {
            case 'Aceito': return 'default';
            case 'Recusado': return 'destructive';
            case 'Vencido': return 'warning';
            case 'Pendente': return 'secondary';
            default: return 'secondary';
        }
    };

    const handleConfirmPhoneSelection = () => {
        if (selectedPhone && phoneSelectionConfig.onConfirm) {
            phoneSelectionConfig.onConfirm(selectedPhone);
        }
        setPhoneSelectionConfig({ ...phoneSelectionConfig, isOpen: false });
    };

    const handlePrepareCompanyWhatsApp = (orcamento: Orcamento) => {
        if (!empresa || !empresa.telefones || empresa.telefones.length === 0) {
            toast({ title: "Telefone da empresa não configurado.", description: "Vá para 'Configurações' para adicionar.", variant: "destructive" });
            return;
        }
        
        const validPhones = empresa.telefones.filter(t => t.numero);

        if (validPhones.length === 1) {
            sendCompanyWhatsAppMessage(orcamento, validPhones[0].numero);
        } else {
            const principalPhone = validPhones.find(t => t.principal) || validPhones[0];
            setSelectedPhone(principalPhone.numero);
            setPhoneSelectionConfig({
                isOpen: true,
                type: 'company',
                phones: validPhones,
                title: "Enviar Notificação Para",
                description: "Sua empresa tem múltiplos telefones. Para qual número devemos enviar a notificação de aceite?",
                onConfirm: (selectedPhone) => sendCompanyWhatsAppMessage(orcamento, selectedPhone)
            });
        }
    };
    
    const sendCompanyWhatsAppMessage = (orcamento: Orcamento, companyPhone: string) => {
        const cleanCompanyPhone = companyPhone.replace(/\D/g, '');
        const telefonePrincipalCliente = orcamento.cliente.telefones?.find(t => t.principal) || orcamento.cliente.telefones?.[0];
        let mensagem = `✅ *Orçamento Aceito!*\n\n*Nº do Orçamento:* ${orcamento.numeroOrcamento}\n*Cliente:* ${orcamento.cliente.nome}\n`;
        if (telefonePrincipalCliente?.numero) mensagem += `*Tel. Cliente:* ${telefonePrincipalCliente.numero}\n`;
        if (orcamento.cliente.endereco) mensagem += `*Endereço:* ${orcamento.cliente.endereco}\n`;
        mensagem += `*Valor Total:* ${formatCurrency(orcamento.totalVenda)}\n\n*Itens do Serviço:*\n`;
        orcamento.itens.forEach(item => {
            let linha = `- ${item.materialNome} (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade})`;
            mensagem += `${linha}\n`;
        });
        const urlWhatsApp = `https://wa.me/55${cleanCompanyPhone}?text=${encodeURIComponent(mensagem)}`;
        window.open(urlWhatsApp, '_blank');
    };

    const handlePrepareClientWhatsApp = (orcamento: Orcamento) => {
        if (!orcamento.cliente.telefones || !orcamento.cliente.telefones.some(t => !!t.numero)) {
            toast({ title: 'Telefone do cliente não cadastrado.', variant: 'destructive' });
            return;
        }

        const validPhones = orcamento.cliente.telefones.filter(t => t.numero);

        if (validPhones.length === 1) {
            sendClientWhatsAppMessage(orcamento, validPhones[0].numero);
        } else {
            const principalPhone = validPhones.find(p => p.principal) || validPhones[0];
            setSelectedPhone(principalPhone.numero);
            setPhoneSelectionConfig({
                isOpen: true,
                type: 'client',
                phones: validPhones,
                title: "Enviar Orçamento Para",
                description: "Este cliente tem múltiplos telefones. Para qual número devemos enviar a proposta?",
                onConfirm: (selectedPhone) => sendClientWhatsAppMessage(orcamento, selectedPhone)
            });
        }
    };

    const sendClientWhatsAppMessage = (orcamento: Orcamento, clientPhone: string) => {
        const cleanClientPhone = clientPhone.replace(/\D/g, '');
        if (!cleanClientPhone) { toast({ title: 'Telefone do Cliente inválido.', variant: 'destructive' }); return; }

        let mensagem = `*Orçamento de ${empresa?.nome || 'Serviços'}*\n\n*Nº do Orçamento:* ${orcamento.numeroOrcamento}\n\nOlá, *${orcamento.cliente.nome}*!\nSegue o seu orçamento:\n\n`;
        orcamento.itens.forEach(item => {
            let linha = `*- ${item.materialNome}* (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade}) - *${formatCurrency(item.precoVenda)}*\n`;
            mensagem += linha;
        });
        mensagem += `\n*VALOR TOTAL: ${formatCurrency(orcamento.totalVenda)}*\n\n`;
        if (orcamento.validadeDias) {
            const dataCriacao = parseISO(orcamento.dataCriacao);
            const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
            if (!isNaN(validadeDiasNum)) {
                const dataValidade = addDays(dataCriacao, validadeDiasNum);
                mensagem += `_Proposta válida até ${format(dataValidade, 'dd/MM/yyyy')}._\n\n`;
            }
        }
        const urlWhatsApp = `https://wa.me/55${cleanClientPhone}?text=${encodeURIComponent(mensagem)}`;
        window.open(urlWhatsApp, '_blank');
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (budgets.length === 0) {
        return (
            <p className="text-center text-muted-foreground py-4">
                {clienteFiltrado ? `Nenhum orçamento encontrado para ${clienteFiltrado.nome}.` : "Nenhum orçamento encontrado para sua busca."}
            </p>
        );
    }
    
    return (
        <>
            {budgets.map(orcamento => (
                <Card key={orcamento.id} className="overflow-hidden">
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                        <div>
                            <CardTitle className="text-xl">{orcamento.cliente.nome}</CardTitle>
                            <CardDescription>
                                <span className="font-semibold">#{orcamento.numeroOrcamento}</span> - {new Date(orcamento.dataCriacao).toLocaleDateString('pt-BR')} - <span className="font-bold text-primary">{formatCurrency(orcamento.totalVenda)}</span>
                                {orcamento.status === 'Pendente' && orcamento.validadeDias && !isNaN(parseInt(orcamento.validadeDias, 10)) && (
                                    <span className="block text-xs text-muted-foreground">Vence em: {format(addDays(parseISO(orcamento.dataCriacao), parseInt(orcamento.validadeDias, 10)), 'dd/MM/yyyy')}</span>
                                )}
                            </CardDescription>
                        </div>
                        <Badge variant={getStatusBadgeVariant(orcamento.status)} className="text-sm">{orcamento.status}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qtd.</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orcamento.itens.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.materialNome}</TableCell>
                                        <TableCell className="text-right">{formatNumber(item.quantidade)} {item.unidade}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.precoVenda)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-end gap-2 bg-muted/50 p-4">
                        <div className="hidden md:flex flex-wrap justify-end gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setPdfBudget(orcamento)}><FileText className="mr-2 h-4 w-4" />Gerar PDF</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Para o Cliente</DropdownMenuItem>
                                    <DropdownMenuItem>Uso Interno</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="outline" size="sm" onClick={() => handlePrepareClientWhatsApp(orcamento)} disabled={!orcamento.cliente.telefones?.some(t => !!t.numero)}><MessageCircle className="mr-2 h-4 w-4" />Enviar</Button>
                            <Button variant="outline" size="sm" onClick={() => onEdit(orcamento)} disabled={orcamento.status !== 'Pendente'}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                            {orcamento.status === 'Pendente' && (
                                <>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><XCircle className="mr-2"/>Recusar</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar Recusa</AlertDialogTitle>
                                                <AlertDialogDescription>Tem certeza de que deseja recusar este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onUpdateStatus(orcamento.id, 'Recusado')}>Sim, Recusar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm"><CheckCircle2 className="mr-2"/>Aceitar</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar Aceite</AlertDialogTitle>
                                                <AlertDialogDescription>Ao aceitar, o status será atualizado e uma notificação será preparada para envio via WhatsApp para sua empresa.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={async () => {
                                                    const updatedBudget = await onUpdateStatus(orcamento.id, 'Aceito');
                                                    if (updatedBudget) {
                                                        handlePrepareCompanyWhatsApp(updatedBudget);
                                                    }
                                                }}>Sim, Aceitar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>Tem certeza que deseja excluir este orçamento permanentemente? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(orcamento.id)}>Sim, Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="flex w-full items-center justify-end gap-2 md:hidden">
                            {orcamento.status === 'Pendente' ? (
                                <>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="flex-1"><XCircle className="mr-2 h-4 w-4"/>Recusar</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Confirmar Recusa</AlertDialogTitle><AlertDialogDescription>Tem certeza de que deseja recusar este orçamento? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onUpdateStatus(orcamento.id, 'Recusado')}>Sim, Recusar</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" className="flex-1"><CheckCircle2 className="mr-2 h-4 w-4"/>Aceitar</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Confirmar Aceite</AlertDialogTitle><AlertDialogDescription>Ao aceitar, o status será atualizado e uma notificação será preparada para envio via WhatsApp para sua empresa.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={async () => {
                                                    const updatedBudget = await onUpdateStatus(orcamento.id, 'Aceito');
                                                    if (updatedBudget) {
                                                        handlePrepareCompanyWhatsApp(updatedBudget);
                                                    }
                                                }}>Sim, Aceitar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            ) : (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrepareClientWhatsApp(orcamento)} disabled={!orcamento.cliente.telefones?.some(t => !!t.numero)}><MessageCircle className="mr-2 h-4 w-4" />Enviar</Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(orcamento)} disabled={orcamento.status !== 'Pendente'}>
                                <Pencil className="mr-2 h-4 w-4" />Editar
                                </DropdownMenuItem>
                                {orcamento.status === 'Pendente' &&
                                <DropdownMenuItem onClick={() => handlePrepareClientWhatsApp(orcamento)} disabled={!orcamento.cliente.telefones?.some(t => !!t.numero)}>
                                    <MessageCircle className="mr-2 h-4 w-4" />Enviar Proposta
                                </DropdownMenuItem>
                                }
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Gerar PDF
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => {}}>Para o Cliente</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {}}>Uso Interno</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />Excluir
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este orçamento permanentemente? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(orcamento.id)}>Sim, Excluir</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardFooter>
                </Card>
            ))}
             <Dialog open={phoneSelectionConfig.isOpen} onOpenChange={(open) => setPhoneSelectionConfig(prev => ({...prev, isOpen: open}))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{phoneSelectionConfig.title}</DialogTitle>
                        <DialogDescription>
                            {phoneSelectionConfig.description}
                        </DialogDescription>
                    </DialogHeader>
                    <RadioGroup value={selectedPhone} onValueChange={setSelectedPhone} className="my-4 space-y-2">
                        {phoneSelectionConfig.phones.map((tel, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={tel.numero} id={`tel-${index}`} />
                                <Label htmlFor={`tel-${index}`} className="flex-1 cursor-pointer">
                                    <span className="font-semibold">{tel.nome || `Telefone ${index + 1}`}</span>
                                    <span className="text-muted-foreground ml-2">{tel.numero}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPhoneSelectionConfig(prev => ({...prev, isOpen: false}))}>Cancelar</Button>
                        <Button onClick={handleConfirmPhoneSelection}>Confirmar e Enviar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
