export type ItemStatus = "pendente_especificacao" | "aprovado";

export interface Parametro {
  chave: string;
  valor: string;
  descricao: string | null;
  updated_at: string;
}

export type SolicitacaoStatus =
  | "aguardando_especificacao"
  | "aguardando_cotacao"
  | "em_cotacao"
  | "aguardando_aprovacao"
  | "aprovada"
  | "rejeitada"
  | "concluida";

export interface Pessoa {
  id: string;
  codigo: string;
  nome_completo: string;
  nome_abreviado: string | null;
  telefone: string | null;
  email: string | null;
  funcao: string | null;
  created_at: string;
}

export interface Fornecedor {
  id: string;
  codigo: string;
  fornecedor: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  uf: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  codigo: string | null;
  codigo_sugerido: string | null;
  item: string;
  unidade_medida: string | null;
  custo_ideal: number | null;
  marca: string | null;
  modelo: string | null;
  dimensoes: string | null;
  status: ItemStatus;
  created_at: string;
}

export interface Solicitacao {
  id: string;
  codigo: string;
  solicitante_id: string;
  item_id: string;
  comprador_id: string | null;
  quantidade: number;
  status: SolicitacaoStatus;
  observacoes: string | null;
  cotacao_vencedora_id: string | null;
  aprovador_id: string | null;
  data_aprovacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cotacao {
  id: string;
  solicitacao_id: string;
  fornecedor_id: string;
  preco: number;
  prazo_entrega_dias: number | null;
  prazo_pagamento_dias: number;
  taxa_utilizada: number | null;
  valor_presente: number | null;
  data_cotacao: string;
  created_at: string;
}

export interface CotacaoMelhorOpcao {
  solicitacao_id: string;
  cotacao_vencedora_id: string;
  fornecedor_id: string;
  preco: number;
  prazo_pagamento_dias: number;
  valor_presente: number;
}

export type OrigemReferencia = "custo_ideal" | "ultima_compra";
export type Classificacao = "bom_preco" | "preco_justo" | "preco_caro";

export interface CotacaoClassificacao {
  solicitacao_id: string;
  cotacao_vencedora_id: string;
  menor_preco_cotado: number;
  preco_referencia: number | null;
  origem_referencia: OrigemReferencia | null;
  classificacao: Classificacao | null;
}

export interface Compra {
  id: string;
  solicitacao_id: string;
  cotacao_id: string;
  comprador_id: string | null;
  aprovador_id: string | null;
  preco_final: number;
  data_compra: string;
  created_at: string;
}
