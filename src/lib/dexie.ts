
import Dexie, { type EntityTable } from 'dexie';
import type { ClienteData, EmpresaData, MaterialItem, Orcamento } from './types';

// Interface para o wrapper de dados no Dexie
interface DexieWrapper<T> {
  id: string; // Chave primária
  userId: string;
  data: T;
  syncStatus: 'pending' | 'synced';
}

interface DeletionEntity {
    id: string;
    collection: 'clientes' | 'materiais' | 'orcamentos';
    deletedAt: Date;
}

class MeuOrcamentoDB extends Dexie {
  clientes!: EntityTable<DexieWrapper<ClienteData>, 'id'>;
  materiais!: EntityTable<DexieWrapper<MaterialItem>, 'id'>;
  orcamentos!: EntityTable<DexieWrapper<Orcamento>, 'id'>;
  empresa!: EntityTable<DexieWrapper<EmpresaData>, 'id'>;
  deletions!: EntityTable<DeletionEntity, 'id'>;

  constructor() {
    super('MeuOrcamentoDB');
    this.version(1).stores({
      clientes: 'id, userId, *data.nome, syncStatus',
      materiais: 'id, userId, *data.descricao, syncStatus',
      orcamentos: 'id, userId, *data.numeroOrcamento, *data.cliente.nome, data.dataCriacao, syncStatus',
      empresa: 'id, userId, syncStatus',
      deletions: 'id, collection',
    });
  }
}

export const db = new MeuOrcamentoDB();
