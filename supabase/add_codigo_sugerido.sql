-- Adiciona coluna para guardar o codigo sugerido na importacao de itens via CSV.
-- Nao e o codigo oficial (itens.codigo) - so aparece como sugestao pre-preenchida
-- na tela de aprovacao do comprador ate ele confirmar.

alter table itens add column if not exists codigo_sugerido text;
