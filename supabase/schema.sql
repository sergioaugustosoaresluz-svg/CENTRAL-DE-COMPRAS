-- =========================================
-- PARAMETRIZAÇÃO (chave/valor, flexível para o futuro)
-- =========================================
create table parametros (
  chave text primary key,
  valor text not null,
  descricao text,
  updated_at timestamptz not null default now()
);

insert into parametros (chave, valor, descricao) values
  ('taxa_desconto_mensal', '0.01', 'Taxa de desconto mensal usada no cálculo de valor presente das cotações (ex: 0.01 = 1% ao mês)');

-- =========================================
-- CADASTROS
-- =========================================
create table compradores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome_completo text not null,
  nome_abreviado text,
  telefone text,
  email text unique,
  funcao text,
  created_at timestamptz not null default now()
);

create table solicitantes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome_completo text not null,
  nome_abreviado text,
  telefone text,
  email text unique,
  funcao text,
  created_at timestamptz not null default now()
);

create table aprovadores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome_completo text not null,
  nome_abreviado text,
  telefone text,
  email text unique,
  funcao text,
  created_at timestamptz not null default now()
);

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  fornecedor text not null,
  contato text,
  telefone text,
  email text,
  uf text,
  created_at timestamptz not null default now()
);

-- Itens: com especificações estruturadas e status próprio
create table itens (
  id uuid primary key default gen_random_uuid(),
  codigo text unique, -- opcional até o item ser aprovado pelo comprador
  item text not null,
  unidade_medida text,
  custo_ideal numeric(12,2),
  marca text,
  modelo text,
  dimensoes text,
  status text not null default 'pendente_especificacao'
    check (status in ('pendente_especificacao', 'aprovado')),
  created_at timestamptz not null default now()
);

-- =========================================
-- SOLICITAÇÃO
-- =========================================
create table solicitacoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  solicitante_id uuid not null references solicitantes(id),
  item_id uuid not null references itens(id),
  comprador_id uuid references compradores(id),
  quantidade numeric(12,2) not null,
  status text not null default 'aguardando_especificacao'
    check (status in (
      'aguardando_especificacao',
      'aguardando_cotacao',
      'em_cotacao',
      'aguardando_aprovacao',
      'aprovada',
      'rejeitada',
      'concluida'
    )),
  observacoes text,
  cotacao_vencedora_id uuid,
  aprovador_id uuid references aprovadores(id),
  data_aprovacao timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================
-- COTAÇÃO
-- =========================================
create table cotacoes (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references solicitacoes(id),
  fornecedor_id uuid not null references fornecedores(id),
  preco numeric(12,2) not null,
  prazo_entrega_dias integer,
  prazo_pagamento_dias integer not null default 0,
  taxa_utilizada numeric(8,6),
  valor_presente numeric(12,2),
  data_cotacao date not null default current_date,
  created_at timestamptz not null default now()
);

-- Liga a FK de cotacao_vencedora_id agora que cotacoes já existe
alter table solicitacoes
  add constraint fk_cotacao_vencedora
  foreign key (cotacao_vencedora_id) references cotacoes(id);

-- Trigger: calcula o valor presente automaticamente ao inserir/editar uma cotação
create or replace function calcular_valor_presente()
returns trigger as $$
declare
  taxa numeric;
begin
  select valor::numeric into taxa
  from parametros
  where chave = 'taxa_desconto_mensal';

  new.taxa_utilizada := taxa;
  new.valor_presente := round(
    new.preco / power(1 + taxa, new.prazo_pagamento_dias / 30.0),
    2
  );

  return new;
end;
$$ language plpgsql;

create trigger trg_calcular_valor_presente
before insert or update of preco, prazo_pagamento_dias
on cotacoes
for each row
execute function calcular_valor_presente();

-- View: aponta a melhor cotação (menor valor presente) de cada solicitação
create view cotacoes_melhor_opcao as
select distinct on (solicitacao_id)
  solicitacao_id,
  id as cotacao_vencedora_id,
  fornecedor_id,
  preco,
  prazo_pagamento_dias,
  valor_presente
from cotacoes
order by solicitacao_id, valor_presente asc;

-- =========================================
-- COMPRA (nasce depois da aprovação)
-- =========================================
create table compras (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references solicitacoes(id),
  cotacao_id uuid not null references cotacoes(id),
  comprador_id uuid references compradores(id),
  aprovador_id uuid references aprovadores(id),
  preco_final numeric(12,2) not null,
  data_compra date not null default current_date,
  created_at timestamptz not null default now()
);

-- =========================================
-- RLS (ativado em tudo, sem policy ainda)
-- =========================================
alter table compradores enable row level security;
alter table solicitantes enable row level security;
alter table aprovadores enable row level security;
alter table fornecedores enable row level security;
alter table itens enable row level security;
alter table parametros enable row level security;
alter table solicitacoes enable row level security;
alter table cotacoes enable row level security;
alter table compras enable row level security;
