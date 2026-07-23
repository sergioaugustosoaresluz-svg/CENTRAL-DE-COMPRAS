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
  categoria_id: string | null;
  especificacoes: Record<string, string> | null;
  created_at: string;
}

export interface Categoria {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface CategoriaCampoEspecificacao {
  id: string;
  categoria_id: string;
  campo_chave: string;
  campo_label: string;
  obrigatorio: boolean;
  ordem: number;
}

export interface Solicitacao {
  id: string;
  codigo: string;
  solicitante_id: string;
  item_id: string;
  unidade_id: string | null;
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

export type SituacaoCompra = "aguardando_entrega" | "recebido" | "cancelado";

export interface Compra {
  id: string;
  solicitacao_id: string;
  cotacao_id: string;
  comprador_id: string | null;
  aprovador_id: string | null;
  preco_final: number;
  data_compra: string;
  created_at: string;
  numero_pedido: number;
  valor_orcado: number | null;
  valor_contraproposta: number | null;
  valor_pago: number | null;
  nota_fiscal: string | null;
  data_recebimento: string | null;
  situacao: SituacaoCompra;
}

export interface Unidade {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface CompraSaving {
  compra_id: string;
  comprador_id: string | null;
  item_id: string;
  data_recebimento: string | null;
  valor_orcado: number | null;
  valor_pago: number | null;
  saving: number | null;
}

export interface DashboardSavingComprador {
  codigo: string;
  nome_completo: string;
  comprador_id: string;
  mes: string;
  saving_total: number;
  saving_medio: number;
  qtd_compras: number;
}

export interface DashboardSavingItem {
  codigo: string;
  item: string;
  item_id: string;
  mes: string;
  saving_total: number;
  saving_medio: number;
  qtd_compras: number;
}

export interface DashboardGastoFornecedor {
  codigo: string;
  fornecedor: string;
  mes: string;
  total_gasto: number;
  qtd_compras: number;
}

export interface DashboardGastoUnidade {
  codigo: string;
  nome: string;
  mes: string;
  total_gasto: number;
  qtd_compras: number;
}

export interface DashboardClassificacaoPreco {
  mes: string;
  classificacao: Classificacao;
  quantidade: number;
}

export interface VariacaoMensalItem {
  item_id: string;
  ano: number;
  mes: number;
  volume_compras: number;
  quantidade_itens: number;
  gasto_total: number;
  orcado_total: number;
  custo_unitario_pago: number;
  custo_unitario_orcado: number;
}

export interface TipoNotificacao {
  chave: string;
  descricao: string;
}

export interface Notificacao {
  id: string;
  user_id: string;
  tipo_chave: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export interface PreferenciaNotificacao {
  user_id: string;
  tipo_chave: string;
  canal_sistema: boolean;
  canal_email: boolean;
}

export type AcaoAuditoria = "INSERT" | "UPDATE" | "DELETE";

export interface LogAuditoriaDetalhado {
  id: string;
  tabela: string;
  registro_id: string | null;
  acao: AcaoAuditoria;
  usuario_id: string | null;
  dados_antigos: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
  nome_usuario: string;
}
