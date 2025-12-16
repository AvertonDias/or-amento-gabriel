
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, History, MoreVertical } from 'lucide-react';
import type { ClienteData } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { OrcamentoStatus, BudgetCounts } from '../page';


interface ClientListProps {
    clientes: ClienteData[];
    budgetCounts: Record<string, BudgetCounts>;
    onEdit: (client: ClienteData) => void;
    onDelete: (id: string) => void;
    onViewBudgets: (id: string) => void;
}

const getStatusBadgeVariant = (status: OrcamentoStatus): "default" | "destructive" | "secondary" | "warning" => {
    switch (status) {
        case 'Aceito': return 'default';
        case 'Recusado': return 'destructive';
        case 'Vencido': return 'warning';
        case 'Pendente': return 'secondary';
        default: return 'secondary';
    }
}

const BudgetBadges = ({ counts }: { counts: BudgetCounts | undefined }) => {
    if (!counts || counts.Total === 0) {
        return <p className="text-xs text-muted-foreground mt-1">Nenhum orçamento</p>;
    }

    const statusOrder: OrcamentoStatus[] = ['Pendente', 'Aceito', 'Recusado', 'Vencido'];

    return (
        <div className="flex flex-wrap items-center gap-2 mt-2">
            {statusOrder.map(status => {
                if (counts[status] > 0) {
                    return (
                        <Badge key={status} variant={getStatusBadgeVariant(status)} className="text-xs">
                            {counts[status]} {status}
                        </Badge>
                    );
                }
                return null;
            })}
        </div>
    );
};

export function ClientList({ clientes, budgetCounts, onEdit, onDelete, onViewBudgets }: ClientListProps) {
    return (
        <Accordion type="multiple" className="w-full">
            {clientes.map(item => (
                <AccordionItem value={item.id!} key={item.id} className="border-b">
                     <div className="flex items-center w-full group">
                        <AccordionTrigger className="flex-1 py-3 px-2 rounded-t-lg data-[state=open]:bg-muted/50">
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-lg text-primary text-left">{item.nome}</span>
                            </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-2 pr-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(item)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar Cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onViewBudgets(item.id!)}>
                                        <History className="mr-2 h-4 w-4" />
                                        Ver Orçamentos
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <div className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-destructive focus:bg-destructive/10 focus:text-destructive")} onSelect={(e) => e.preventDefault()}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir Cliente
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(item.id!)}>Sim, Excluir</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {budgetCounts[item.id!]?.Total > 0 && (
                                <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                                    {budgetCounts[item.id!].Total}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <AccordionContent className="p-4 space-y-3">
                        {item.cpfCnpj && <p className="text-sm"><span className="font-medium text-muted-foreground">CPF/CNPJ:</span> {item.cpfCnpj}</p>}
                        {item.telefones?.map((tel, index) => (
                            <p key={index} className="text-sm">
                                <span className="font-medium text-muted-foreground">{tel.nome || `Telefone ${index + 1}`}:</span> {tel.numero}
                            </p>
                        ))}
                        {item.email && <p className="text-sm"><span className="font-medium text-muted-foreground">Email:</span> {item.email}</p>}
                        {item.endereco && <p className="text-sm"><span className="font-medium text-muted-foreground">Endereço:</span> {item.endereco}</p>}
                        <div className="pt-2">
                            <p className="text-sm font-medium text-muted-foreground mb-2 cursor-pointer hover:text-primary transition-colors" onClick={() => onViewBudgets(item.id!)}>
                                Histórico de Orçamentos
                            </p>
                            <BudgetBadges counts={budgetCounts[item.id!]} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
