-- Substitui as policies temporarias de "permitir tudo" (policies_temp.sql) por regras reais.
-- Revise antes de rodar no SQL Editor do Supabase.

-- =========================================
-- Remove as policies temporarias
-- =========================================
drop policy if exists "allow_all_temp" on compradores;
drop policy if exists "allow_all_temp" on solicitantes;
drop policy if exists "allow_all_temp" on aprovadores;
drop policy if exists "allow_all_temp" on fornecedores;
drop policy if exists "allow_all_temp" on itens;
drop policy if exists "allow_all_temp" on parametros;
drop policy if exists "allow_all_temp" on solicitacoes;
drop policy if exists "allow_all_temp" on cotacoes;
drop policy if exists "allow_all_temp" on compras;

-- =========================================
-- itens
-- select: qualquer autenticado
-- insert: qualquer autenticado
-- update: comprador ou admin
-- =========================================
create policy "itens_select" on itens
  for select to authenticated
  using (true);

create policy "itens_insert" on itens
  for insert to authenticated
  with check (true);

create policy "itens_update" on itens
  for update to authenticated
  using (is_comprador() or is_admin())
  with check (is_comprador() or is_admin());

-- =========================================
-- fornecedores
-- select: comprador, aprovador ou admin
-- insert/update: comprador ou admin
-- =========================================
create policy "fornecedores_select" on fornecedores
  for select to authenticated
  using (is_comprador() or is_aprovador() or is_admin());

create policy "fornecedores_insert" on fornecedores
  for insert to authenticated
  with check (is_comprador() or is_admin());

create policy "fornecedores_update" on fornecedores
  for update to authenticated
  using (is_comprador() or is_admin())
  with check (is_comprador() or is_admin());

-- =========================================
-- compradores / solicitantes / aprovadores
-- select: qualquer autenticado
-- insert/update/delete: só admin
-- =========================================
create policy "compradores_select" on compradores
  for select to authenticated
  using (true);
create policy "compradores_insert" on compradores
  for insert to authenticated
  with check (is_admin());
create policy "compradores_update" on compradores
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy "compradores_delete" on compradores
  for delete to authenticated
  using (is_admin());

create policy "solicitantes_select" on solicitantes
  for select to authenticated
  using (true);
create policy "solicitantes_insert" on solicitantes
  for insert to authenticated
  with check (is_admin());
create policy "solicitantes_update" on solicitantes
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy "solicitantes_delete" on solicitantes
  for delete to authenticated
  using (is_admin());

create policy "aprovadores_select" on aprovadores
  for select to authenticated
  using (true);
create policy "aprovadores_insert" on aprovadores
  for insert to authenticated
  with check (is_admin());
create policy "aprovadores_update" on aprovadores
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy "aprovadores_delete" on aprovadores
  for delete to authenticated
  using (is_admin());

-- =========================================
-- parametros
-- select: qualquer autenticado
-- update: só admin
-- =========================================
create policy "parametros_select" on parametros
  for select to authenticated
  using (true);

create policy "parametros_update" on parametros
  for update to authenticated
  using (is_admin())
  with check (is_admin());

-- =========================================
-- solicitacoes
-- select: o proprio solicitante, ou comprador/aprovador/admin
-- insert: o proprio solicitante
-- update: comprador, aprovador ou admin
-- =========================================
create policy "solicitacoes_select" on solicitacoes
  for select to authenticated
  using (
    solicitante_id = solicitante_id_atual()
    or is_comprador()
    or is_aprovador()
    or is_admin()
  );

create policy "solicitacoes_insert" on solicitacoes
  for insert to authenticated
  with check (solicitante_id = solicitante_id_atual());

create policy "solicitacoes_update" on solicitacoes
  for update to authenticated
  using (is_comprador() or is_aprovador() or is_admin())
  with check (is_comprador() or is_aprovador() or is_admin());

-- =========================================
-- cotacoes
-- select: comprador, aprovador ou admin
-- insert/update: comprador ou admin
-- =========================================
create policy "cotacoes_select" on cotacoes
  for select to authenticated
  using (is_comprador() or is_aprovador() or is_admin());

create policy "cotacoes_insert" on cotacoes
  for insert to authenticated
  with check (is_comprador() or is_admin());

create policy "cotacoes_update" on cotacoes
  for update to authenticated
  using (is_comprador() or is_admin())
  with check (is_comprador() or is_admin());

-- =========================================
-- compras
-- select: comprador, aprovador ou admin
-- insert: aprovador ou admin
-- =========================================
create policy "compras_select" on compras
  for select to authenticated
  using (is_comprador() or is_aprovador() or is_admin());

create policy "compras_insert" on compras
  for insert to authenticated
  with check (is_aprovador() or is_admin());
