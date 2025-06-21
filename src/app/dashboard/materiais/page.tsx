
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { MaterialItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Wrench, PlusCircle, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

const initialNewItemState: Omit<MaterialItem, 'id'> = {
  tipo: 'Bobina',
  descricao: '',
  unidade: 'kg',
  quantidade: null,
  espessura: null,
  largura: null,
  precoUnitario: null,
};

export default function MateriaisPage() {
  const [materiais, setMateriais] = useLocalStorage<MaterialItem[]>('materiaisList', []);
  const [newItem, setNewItem] = useState<Omit<MaterialItem, 'id'>>(initialNewItemState);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();

  const getDescricaoLabel = (type: string) => {
    switch (type) {
      case 'Condutor':
        return 'Tipo / Descrição do Condutor';
      case 'Bobina':
        return 'Descrição / Nome da Bobina';
      case 'Outros':
        return 'Descrição do Item';
      default:
        return 'Descrição / Nome Específico';
    }
  };

  const getDescricaoPlaceholder = (type: string) => {
    switch (type) {
      case 'Condutor':
        return 'Ex: Cano Redondo 100mm, Suporte de Canto';
      case 'Bobina':
        return 'Ex: Bobina Galvalume 0.43mm Corte 28';
      case 'Outros':
        return 'Ex: Mão de Obra, Aluguel de Andaime';
      default:
        return 'Selecione um tipo de material primeiro';
    }
  };

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? null : parseFloat(value);
    setNewItem(prev => ({ ...prev, [name]: ['tipo', 'unidade', 'descricao'].includes(name) ? value : numValue }));
  };
  
  const handleNewItemSelectChange = (name: keyof Omit<MaterialItem, 'id'>, value: string) => {
    const updates: Partial<Omit<MaterialItem, 'id'>> = { [name]: value };
    
    if (name === 'tipo') {
      const tipo = value as MaterialItem['tipo'];
      if (tipo === 'Bobina') {
        updates.unidade = 'kg';
      } else if (tipo === 'Condutor') {
        updates.unidade = 'm';
        updates.espessura = null;
        updates.largura = null;
      } else { // Outros
         updates.unidade = 'un';
         updates.espessura = null;
         updates.largura = null;
      }
    }
    
    setNewItem(prev => ({ ...prev, ...updates }));
  };

  const adicionarMaterial = (e: FormEvent) => {
    e.preventDefault();
    if (!newItem.tipo || !newItem.descricao || newItem.quantidade === null || newItem.precoUnitario === null) {
        toast({
            title: "Campos Obrigatórios",
            description: "Por favor, preencha Tipo, Descrição, Quantidade e Preço Unitário.",
            variant: "destructive"
        });
        return;
    }

    if(newItem.tipo === 'Bobina' && newItem.espessura === null) {
        toast({
            title: "Campos Obrigatórios",
            description: "Para Bobinas, o campo Espessura é obrigatório.",
            variant: "destructive"
        });
        return;
    }

    setMateriais(prev => [...prev, { ...newItem, id: crypto.randomUUID() }]);
    setNewItem(initialNewItemState);
    toast({
      title: "Sucesso!",
      description: "Material adicionado à lista.",
    });
  };

  const removerMaterial = (id: string) => {
    setMateriais(materiais.filter(item => item.id !== id));
    toast({
      title: "Material Removido",
      description: "O item foi removido da sua lista.",
      variant: "destructive"
    });
  };
  
  const handleEditClick = (material: MaterialItem) => {
    setEditingMaterial({ ...material });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingMaterial) return;
    const { name, value } = e.target;
    const numValue = value === '' ? null : parseFloat(value);
    setEditingMaterial(prev => prev ? { ...prev, [name]: ['tipo', 'unidade', 'descricao'].includes(name) ? value : numValue } : null);
  };
  
  const handleEditSelectChange = (name: keyof MaterialItem, value: string) => {
    if (!editingMaterial) return;
    const updates: Partial<MaterialItem> = { [name]: value };

    if (name === 'tipo') {
        const tipo = value as MaterialItem['tipo'];
        if (tipo === 'Bobina') {
            updates.unidade = 'kg';
        } else if (tipo === 'Condutor') {
            updates.unidade = 'm';
            updates.espessura = null;
            updates.largura = null;
        } else {
           updates.unidade = 'un';
           updates.espessura = null;
           updates.largura = null;
        }
    }

    setEditingMaterial(prev => prev ? { ...prev, ...updates } : null);
  };

  const salvarEdicao = (e: FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    if(!editingMaterial.tipo || !editingMaterial.descricao || editingMaterial.quantidade === null || editingMaterial.precoUnitario === null) {
      toast({
          title: "Campos Obrigatórios",
          description: "Por favor, preencha Tipo, Descrição, Quantidade e Preço Unitário.",
          variant: "destructive"
      });
      return;
    }

    if(editingMaterial.tipo === 'Bobina' && editingMaterial.espessura === null) {
        toast({
            title: "Campos Obrigatórios",
            description: "Para Bobinas, o campo Espessura é obrigatório.",
            variant: "destructive"
        });
        return;
    }

    setMateriais(materiais.map(m => m.id === editingMaterial.id ? editingMaterial : m));
    setIsEditModalOpen(false);
    setEditingMaterial(null);
    toast({
      title: "Sucesso!",
      description: "Material atualizado com sucesso.",
    });
  };


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Cadastro de Materiais
          </CardTitle>
          <CardDescription>
            Adicione e gerencie os materiais que serão usados nos orçamentos.
            Estes dados ficarão salvos no seu navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={adicionarMaterial} className="space-y-6 border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold">Adicionar Novo Material</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tipo">Tipo de Material</Label>
                 <Select name="tipo" onValueChange={(val) => handleNewItemSelectChange('tipo', val)} value={newItem.tipo}>
                  <SelectTrigger id="tipo" required>
                    <SelectValue placeholder="Selecione"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bobina">Bobina</SelectItem>
                    <SelectItem value="Condutor">Condutor</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="descricao">{getDescricaoLabel(newItem.tipo)}</Label>
                <Input id="descricao" name="descricao" value={newItem.descricao} onChange={handleNewItemChange} placeholder={getDescricaoPlaceholder(newItem.tipo)} required/>
              </div>

              <div>
                <Label htmlFor="unidade">Unidade</Label>
                <Select 
                  name="unidade" 
                  onValueChange={(val) => handleNewItemSelectChange('unidade', val as 'kg' | 'm' | 'un')} 
                  value={newItem.unidade}
                >
                  <SelectTrigger id="unidade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="un">un</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantidade">Quantidade ({newItem.unidade})</Label>
                <Input id="quantidade" name="quantidade" type="number" step="0.01" value={newItem.quantidade ?? ''} onChange={handleNewItemChange} required/>
              </div>

              {newItem.tipo === 'Bobina' && (
                <>
                  <div>
                    <Label htmlFor="espessura">Espessura (mm)</Label>
                    <Input id="espessura" name="espessura" type="number" step="0.01" value={newItem.espessura ?? ''} onChange={handleNewItemChange} required/>
                  </div>
                  
                  <div>
                    <Label htmlFor="largura">Largura (cm)</Label>
                    <Input id="largura" name="largura" type="number" step="0.1" value={newItem.largura ?? ''} onChange={handleNewItemChange}/>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="precoUnitario">Preço Unit. (R$/{newItem.unidade})</Label>
                <Input id="precoUnitario" name="precoUnitario" type="number" step="0.01" value={newItem.precoUnitario ?? ''} onChange={handleNewItemChange} required/>
              </div>

            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Material
            </Button>
          </form>

          {!isClient ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : materiais.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Materiais Cadastrados</h2>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Unid.</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Espessura</TableHead>
                      <TableHead>Largura</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materiais.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell>{item.tipo}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>{item.espessura ?? '-'}</TableCell>
                        <TableCell>{item.largura ?? '-'}</TableCell>
                        <TableCell>{formatCurrency(item.precoUnitario)}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removerMaterial(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {materiais.map(item => (
                  <Card key={item.id} className="p-0">
                      <CardHeader className="flex flex-row items-start justify-between p-4">
                          <div>
                              <CardTitle className="text-base">{item.descricao}</CardTitle>
                              <CardDescription>{item.tipo}</CardDescription>
                          </div>
                          <div className="flex gap-1 -mr-2 -mt-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}><Pencil className="h-4 w-4 text-primary" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => removerMaterial(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div><p className="text-muted-foreground">Unidade</p><p>{item.unidade}</p></div>
                          <div><p className="text-muted-foreground">Qtd.</p><p>{item.quantidade}</p></div>
                          {item.espessura !== null && (<div><p className="text-muted-foreground">Espessura</p><p>{item.espessura} mm</p></div>)}
                          {item.largura !== null && (<div><p className="text-muted-foreground">Largura</p><p>{item.largura} cm</p></div>)}
                      </CardContent>
                      <CardFooter className="p-4 pt-2 mt-2 bg-muted/50 flex justify-between items-center">
                          <p className="font-bold">Preço Unitário</p>
                          <p className="font-bold text-primary text-base">{formatCurrency(item.precoUnitario)}/{item.unidade}</p>
                      </CardFooter>
                  </Card>
                ))}
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias no material selecionado.
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <form onSubmit={salvarEdicao} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-tipo">Tipo de Material</Label>
                  <Select name="tipo" onValueChange={(val) => handleEditSelectChange('tipo', val)} value={editingMaterial.tipo} required>
                    <SelectTrigger id="edit-tipo"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bobina">Bobina</SelectItem>
                      <SelectItem value="Condutor">Condutor</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div className="md:col-span-2">
                  <Label htmlFor="edit-descricao">{getDescricaoLabel(editingMaterial.tipo)}</Label>
                  <Input id="edit-descricao" name="descricao" value={editingMaterial.descricao} onChange={handleEditFormChange} required/>
                </div>
                <div>
                  <Label htmlFor="edit-unidade">Unidade</Label>
                  <Select 
                    name="unidade" 
                    onValueChange={(val) => handleEditSelectChange('unidade', val as 'kg' | 'm' | 'un')} 
                    value={editingMaterial.unidade} 
                    required
                  >
                    <SelectTrigger id="edit-unidade"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="un">un</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-quantidade">Quantidade ({editingMaterial.unidade})</Label>
                  <Input id="edit-quantidade" name="quantidade" type="number" step="0.01" value={editingMaterial.quantidade ?? ''} onChange={handleEditFormChange} required/>
                </div>

                {editingMaterial.tipo === 'Bobina' && (
                  <>
                    <div>
                      <Label htmlFor="edit-espessura">Espessura (mm)</Label>
                      <Input id="edit-espessura" name="espessura" type="number" step="0.01" value={editingMaterial.espessura ?? ''} onChange={handleEditFormChange} required/>
                    </div>
                    <div>
                      <Label htmlFor="edit-largura">Largura (cm)</Label>
                      <Input id="edit-largura" name="largura" type="number" step="0.1" value={editingMaterial.largura ?? ''} onChange={handleEditFormChange}/>
                    </div>
                  </>
                )}
                
                <div>
                  <Label htmlFor="edit-precoUnitario">Preço Unit. (R$/{editingMaterial.unidade})</Label>
                  <Input id="edit-precoUnitario" name="precoUnitario" type="number" step="0.01" value={editingMaterial.precoUnitario ?? ''} onChange={handleEditFormChange} required/>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
