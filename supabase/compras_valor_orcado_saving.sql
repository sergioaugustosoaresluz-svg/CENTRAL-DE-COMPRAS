-- Preenche valor_orcado automaticamente com o preco da cotacao vencedora
-- (cotacoes.preco, via compras.cotacao_id) no momento em que a compra e criada,
-- caso o valor nao seja informado explicitamente no insert.
create or replace function definir_valor_orcado_compra()
returns trigger as $$
begin
  if new.valor_orcado is null then
    select preco into new.valor_orcado
    from cotacoes
    where id = new.cotacao_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_definir_valor_orcado_compra on compras;
create trigger trg_definir_valor_orcado_compra
before insert on compras
for each row
execute function definir_valor_orcado_compra();

-- View: saving por compra (valor_orcado - valor_pago), usada futuramente na
-- apuracao de saving por comprador/item no Dashboard.
create or replace view compras_saving as
select
  c.comprador_id,
  s.item_id,
  c.valor_orcado,
  c.valor_pago,
  case when c.valor_pago is not null then c.valor_orcado - c.valor_pago else null end as saving
from compras c
join solicitacoes s on s.id = c.solicitacao_id;
