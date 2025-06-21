

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

// Definição de um tipo genérico para materiais
export interface MaterialItem {
  id: string;
  tipo: 'Bobina' | 'Condutor' | 'Outros'; // Tipos fixos
  descricao: string; // O nome/descrição específica do item. Ex: "Bobina Galvalume 0.43mm", "Condutor Retangular 28cm"
  unidade: 'kg' | 'm' | 'un';        // Unidade de medida principal
  quantidade: number | null;         // Peso em kg ou comprimento em m
  espessura: number | null;          // em mm (apenas para Bobina)
  largura: number | null;            // em cm (apenas para Bobina)
  precoUnitario: number | null;      // R$/kg ou R$/m ou R$/un
}

export interface OrcamentoItem {
  id: string;
  materialId: string;
  materialNome: string; // Para "Outros", guarda a descrição customizada
  materialTipo: 'Bobina' | 'Condutor' | 'Outros'; // Ajuda a UI e os cálculos
  corteCm: number;
  metros: number;
  total: number; // Custo da peça
  margemLucro: number; // Margem de lucro em %
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
