"use client";

import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AcaoAuditoria, LogAuditoriaDetalhado } from "@/lib/supabase/types";
import { inputClass, secondaryButtonClass, tableClass, theadRowClass, tbodyRowClass } from "@/components/ui";
import { Badge, type BadgeTone } from "@/components/Badge";
import { PageContainer } from "@/components/PageContainer";
import { Pagination } from "@/components/Pagination";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";

const TABELA_LABEL: Record<string, string> = {
  solicitacoes: "Solicitações",
  cotacoes: "Cotações",
  compras: "Compras",
  itens: "Itens",
  compradores: "Compradores",
  solicitantes: "Solicitantes",
  aprovadores: "Aprovadores",
  fornecedores: "Fornecedores",
  unidades: "Unidades",
  categorias: "Categorias",
  parametros: "Parâmetros",
};

const TABELAS = Object.keys(TABELA_LABEL);

const ACAO_LABEL: Record<AcaoAuditoria, string> = {
  INSERT: "Inclusão",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
};

const ACAO_TOM: Record<AcaoAuditoria, BadgeTone> = {
  INSERT: "green",
  UPDATE: "blue",
  DELETE: "red",
};

function AcaoBadge({ acao }: { acao: AcaoAuditoria }) {
  return <Badge tone={ACAO_TOM[acao]}>{ACAO_LABEL[acao]}</Badge>;
}

function humanizarCampo(campo: string) {
  const comEspacos = campo.replace(/_/g, " ");
  return comEspacos.charAt(0).toUpperCase() + comEspacos.slice(1);
}

function formatarValorCampo(valor: unknown): string {
  if (valor === null || valor === undefined) return "-";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function camposAlterados(
  antigos: Record<string, unknown> | null,
  novos: Record<string, unknown> | null
): string[] {
  const chaves = new Set([...Object.keys(antigos ?? {}), ...Object.keys(novos ?? {})]);
  return Array.from(chaves)
    .filter((chave) => JSON.stringify(antigos?.[chave]) !== JSON.stringify(novos?.[chave]))
    .sort();
}

function DetalheEvento({ log }: { log: LogAuditoriaDetalhado }) {
  if (log.acao === "UPDATE") {
    const campos = camposAlterados(log.dados_antigos, log.dados_novos);
    if (campos.length === 0) {
      return <p className="text-sm text-muted">Nenhum campo com valor alterado.</p>;
    }
    return (
      <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-1 [&_th]:pr-4 [&_td]:py-1 [&_td]:pr-4">
        <thead>
          <tr className="text-muted">
            <th>Campo</th>
            <th>Antes</th>
            <th>Depois</th>
          </tr>
        </thead>
        <tbody>
          {campos.map((campo) => (
            <tr key={campo}>
              <td className="font-medium">{humanizarCampo(campo)}</td>
              <td className="text-red-600 dark:text-red-400">
                {formatarValorCampo(log.dados_antigos?.[campo])}
              </td>
              <td className="text-green-600 dark:text-green-400">
                {formatarValorCampo(log.dados_novos?.[campo])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const dados = log.acao === "INSERT" ? log.dados_novos : log.dados_antigos;
  const chaves = Object.keys(dados ?? {}).sort();

  if (chaves.length === 0) {
    return <p className="text-sm text-muted">Sem dados registrados.</p>;
  }

  return (
    <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-1 [&_th]:pr-4 [&_td]:py-1 [&_td]:pr-4">
      <thead>
        <tr className="text-muted">
          <th>Campo</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        {chaves.map((campo) => (
          <tr key={campo}>
            <td className="font-medium">{humanizarCampo(campo)}</td>
            <td>{formatarValorCampo(dados?.[campo])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AuditoriaPage() {
  const { loading, isAdmin } = useAuth();

  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<string[]>([]);

  const [filtroTabela, setFiltroTabela] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  const {
    dados: lista,
    total,
    totalPaginas,
    pagina,
    itensPorPagina,
    carregando,
    irParaPagina,
    resetarPagina,
    mudarItensPorPagina,
  } = usePaginatedQuery<LogAuditoriaDetalhado>({
    habilitado: isAdmin,
    ordenarPor: "created_at",
    ascendente: false,
    dependencias: [filtroTabela, filtroUsuario, dataInicial, dataFinal],
    montarConsulta: () => {
      let query = supabase.from("log_auditoria_detalhado").select("*", { count: "exact" });
      if (filtroTabela) query = query.eq("tabela", filtroTabela);
      if (filtroUsuario) query = query.eq("nome_usuario", filtroUsuario);
      if (dataInicial) query = query.gte("created_at", `${dataInicial}T00:00:00`);
      if (dataFinal) query = query.lte("created_at", `${dataFinal}T23:59:59.999`);
      return query;
    },
  });

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("log_auditoria_detalhado")
      .select("nome_usuario")
      .then(({ data }) => {
        const nomes = ((data as { nome_usuario: string }[] | null) ?? []).map((d) => d.nome_usuario);
        setUsuarios(Array.from(new Set(nomes)).sort());
      });
  }, [isAdmin]);

  function alterarFiltro(atualizar: () => void) {
    atualizar();
    resetarPagina();
  }

  function limparFiltros() {
    setFiltroTabela("");
    setFiltroUsuario("");
    setDataInicial("");
    setDataFinal("");
    resetarPagina();
  }

  function alternarExpandido(id: string) {
    setExpandidoId((atual) => (atual === id ? null : id));
  }

  if (loading) return null;

  if (!isAdmin) {
    return (
      <PageContainer>
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Auditoria</h1>

      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm space-y-1">
          <span>Tabela</span>
          <select
            value={filtroTabela}
            onChange={(e) => alterarFiltro(() => setFiltroTabela(e.target.value))}
            className={inputClass}
          >
            <option value="">Todas</option>
            {TABELAS.map((t) => (
              <option key={t} value={t}>
                {TABELA_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm space-y-1">
          <span>Usuário</span>
          <select
            value={filtroUsuario}
            onChange={(e) => alterarFiltro(() => setFiltroUsuario(e.target.value))}
            className={inputClass}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm space-y-1">
          <span>De</span>
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => alterarFiltro(() => setDataInicial(e.target.value))}
            className={inputClass}
          />
        </label>

        <label className="block text-sm space-y-1">
          <span>Até</span>
          <input
            type="date"
            value={dataFinal}
            onChange={(e) => alterarFiltro(() => setDataFinal(e.target.value))}
            className={inputClass}
          />
        </label>

        <button onClick={limparFiltros} className={secondaryButtonClass}>
          Limpar filtros
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum evento encontrado.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr className={theadRowClass}>
              <th></th>
              <th>Data/hora</th>
              <th>Usuário</th>
              <th>Tabela</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((log) => {
              const expandido = expandidoId === log.id;
              return (
                <Fragment key={log.id}>
                  <tr
                    onClick={() => alternarExpandido(log.id)}
                    className={`${tbodyRowClass} cursor-pointer`}
                  >
                    <td className="w-6 text-muted">{expandido ? "▾" : "▸"}</td>
                    <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                    <td>{log.nome_usuario}</td>
                    <td>{TABELA_LABEL[log.tabela] ?? log.tabela}</td>
                    <td>
                      <AcaoBadge acao={log.acao} />
                    </td>
                  </tr>
                  {expandido && (
                    <tr className="border-b border-hairline">
                      <td colSpan={5} className="bg-surface-muted p-4">
                        <DetalheEvento log={log} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        itensPorPagina={itensPorPagina}
        onMudarPagina={irParaPagina}
        onMudarItensPorPagina={mudarItensPorPagina}
      />
    </PageContainer>
  );
}
