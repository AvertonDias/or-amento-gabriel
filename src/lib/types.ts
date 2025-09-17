export interface EmpresaData {
  nome: string;
  endereco: string;
  telefone: string;
  cnpj: string;
  logo?: string;
}

export interface ClienteData {
  id?: string;
  nome: string;
  endereco: string;
  telefone:string;
  email?: string;
  cpfCnpj?: string;
}

// Tipo generalizado para itens e serviços
export interface MaterialItem {
  id: string;
  descricao: string; // O nome/descrição específica do item. Ex: "Troca de tomada", "Pintura (m²)"
  unidade: string;     // Unidade de medida (un, h, m, m², serv, etc.)
  precoUnitario: number | null; // R$ por unidade
}

export interface OrcamentoItem {
  id: string;
  materialId: string;
  materialNome: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  total: number; // Custo do item (quantidade * precoUnitario)
  margemLucro: number; // Acréscimo em %
  precoVenda: number; // Preço final para o cliente
}

export interface Orcamento {
  id: string;
  numeroOrcamento: string;
  cliente: ClienteData;
  itens: OrcamentoItem[];
  totalVenda: number;
  dataCriacao: string; // ISO Date String
  status: 'Pendente' | 'Aceito' | 'Recusado';
  validadeDias: string;
}
