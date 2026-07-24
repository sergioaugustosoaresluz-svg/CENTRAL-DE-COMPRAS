"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Fornecedor,
  Cotacao,
  CotacaoMelhorOpcao,
  CotacaoClassificacao,
  CategoriaCampoEspecificacao,
  FornecedorAvaliacaoResumo,
} from "@/lib/supabase/types";
import {
  inputClass,
  buttonClass,
  secondaryButtonClass,
  cardClass,
  tableClass,
  theadRowClass,
  tbodyRowClass,
  formatarMoeda,
  formatarDataBR,
  CampoMoeda,
} from "@/components/ui";
import { Badge, type BadgeTone } from "@/components/Badge";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";
import { PageContainer } from "@/components/PageContainer";
import { Pagination } from "@/components/Pagination";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { SeloAvaliacao } from "@/components/SeloAvaliacao";

function ClassificacaoBadge({ classificacao }: { classificacao: CotacaoClassificacao["classificacao"] }) {
  if (!classificacao) {
    return <Badge tone="gray">Sem histórico de referência</Badge>;
  }
  const config: Record<NonNullable<CotacaoClassificacao["classificacao"]>, { label: string; tone: BadgeTone }> = {
    bom_preco: { label: "Bom Preço", tone: "green" },
    preco_justo: { label: "Preço Justo", tone: "amber" },
    preco_caro: { label: "Preço Caro", tone: "red" },
  };
  const { label, tone } = config[classificacao];
  return <Badge tone={tone}>{label}</Badge>;
}

function origemReferenciaTexto(origem: CotacaoClassificacao["origem_referencia"]): string | null {
  if (origem === "ultima_compra") return "Referência: última compra registrada para este item.";
  if (origem === "custo_ideal") return "Referência: custo ideal cadastrado (nenhuma compra anterior deste item).";
  return null;
}

type Tab = "comprador" | "aprovador";

export default function CotacaoPage() {
  return (
    <Suspense fallback={null}>
      <CotacaoPageConteudo />
    </Suspense>
  );
}

function CotacaoPageConteudo() {
  const searchParams = useSearchParams();
  const abaParam = searchParams.get("aba");
  const codigoFoco = searchParams.get("codigo");
  const { loading, isComprador, isAprovador, aprovadorId } = useAuth();
  const abas: Tab[] = [
    ...(isComprador ? (["comprador"] as const) : []),
    ...(isAprovador ? (["aprovador"] as const) : []),
  ];
  const [tab, setTab] = useState<Tab | null>(() =>
    abaParam === "comprador" || abaParam === "aprovador" ? abaParam : null
  );
  const abaAtiva = tab && abas.includes(tab) ? tab : abas[0] ?? null;

  if (loading) return null;

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Cotação</h1>

      {abas.length === 0 ? (
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      ) : (
        <>
          {abas.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setTab("comprador")}
                className={abaAtiva === "comprador" ? buttonClass : secondaryButtonClass}
              >
                Comprador
              </button>
              <button
                onClick={() => setTab("aprovador")}
                className={abaAtiva === "aprovador" ? buttonClass : secondaryButtonClass}
              >
                Aprovador
              </button>
            </div>
          )}

          {abaAtiva === "comprador" && <VisaoComprador codigoFoco={codigoFoco} />}
          {abaAtiva === "aprovador" && aprovadorId && (
            <VisaoAprovador aprovadorId={aprovadorId} codigoFoco={codigoFoco} />
          )}
        </>
      )}
    </PageContainer>
  );
}

interface SolicitacaoResumo {
  id: string;
  codigo: string;
  quantidade: number;
  status: "aguardando_cotacao" | "em_cotacao" | "aguardando_aprovacao";
  comprador_id: string | null;
  observacoes: string | null;
  itens: {
    item: string;
    categoria_id: string | null;
    especificacoes: Record<string, string> | null;
    marca: string | null;
    modelo: string | null;
    dimensoes: string | null;
    unidade_medida: string | null;
    custo_ideal: number | null;
  } | null;
  solicitantes: { nome_completo: string } | null;
  unidades: { nome: string } | null;
}

function VisaoComprador({ codigoFoco }: { codigoFoco: string | null }) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [selecionada, setSelecionada] = useState<SolicitacaoResumo | null>(null);
  const [cotacoesDaSolicitacao, setCotacoesDaSolicitacao] = useState<
    (Cotacao & { fornecedores: { fornecedor: string } | null })[]
  >([]);
  const [resumosFornecedores, setResumosFornecedores] = useState<Record<string, FornecedorAvaliacaoResumo>>({});
  const [vencedoraId, setVencedoraId] = useState<string | null>(null);
  const [classificacao, setClassificacao] = useState<CotacaoClassificacao | null>(null);
  const [camposCategoria, setCamposCategoria] = useState<CategoriaCampoEspecificacao[]>([]);
  const [form, setForm] = useState<{
    fornecedor_id: string;
    preco: number | null;
    prazo_entrega_dias: string;
    prazo_pagamento_dias: string;
  }>({
    fornecedor_id: "",
    preco: null,
    prazo_entrega_dias: "",
    prazo_pagamento_dias: "",
  });
  const [fornecedorQuery, setFornecedorQuery] = useState("");
  const [fornecedorDropdownAberto, setFornecedorDropdownAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);
  const [codigoJaAberto, setCodigoJaAberto] = useState(false);

  const {
    dados: lista,
    total,
    totalPaginas,
    pagina,
    itensPorPagina,
    carregando,
    irParaPagina,
    mudarItensPorPagina,
    recarregar,
  } = usePaginatedQuery<SolicitacaoResumo>({
    ordenarPor: "created_at",
    ascendente: true,
    montarConsulta: () =>
      supabase
        .from("solicitacoes")
        .select(
          "id, codigo, quantidade, status, comprador_id, observacoes, itens(item, categoria_id, especificacoes, marca, modelo, dimensoes, unidade_medida, custo_ideal), solicitantes(nome_completo), unidades(nome)",
          { count: "exact" }
        )
        .in("status", ["aguardando_cotacao", "em_cotacao"]),
  });

  useEffect(() => {
    supabase
      .from("fornecedores")
      .select("*")
      .order("fornecedor")
      .then(({ data }) => setFornecedores(data ?? []));
  }, []);

  useEffect(() => {
    if (lista.length === 0) return;
    Promise.resolve().then(async () => {
      const { data: cts } = await supabase
        .from("cotacoes")
        .select("solicitacao_id")
        .in("solicitacao_id", lista.map((r) => r.id));
      const counts: Record<string, number> = {};
      (cts ?? []).forEach((c) => {
        counts[c.solicitacao_id] = (counts[c.solicitacao_id] ?? 0) + 1;
      });
      setContagens((prev) => ({ ...prev, ...counts }));
    });
  }, [lista]);

  async function selecionar(row: SolicitacaoResumo) {
    setSelecionada(row);
    setMensagem(null);
    setVencedoraId(null);
    setClassificacao(null);
    setForm({ fornecedor_id: "", preco: null, prazo_entrega_dias: "", prazo_pagamento_dias: "" });
    setFornecedorQuery("");
    setFornecedorDropdownAberto(false);
    if (row.itens?.categoria_id) {
      const { data } = await supabase
        .from("categoria_campos_especificacao")
        .select("*")
        .eq("categoria_id", row.itens.categoria_id)
        .order("ordem");
      setCamposCategoria(data ?? []);
    } else {
      setCamposCategoria([]);
    }
    await carregarCotacoesDaSolicitacao(row.id);
  }

  useEffect(() => {
    if (!codigoFoco || codigoJaAberto || lista.length === 0) return;
    const alvo = lista.find((s) => s.codigo === codigoFoco);
    if (!alvo) return;
    Promise.resolve().then(() => {
      selecionar(alvo);
      setCodigoJaAberto(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, codigoFoco, codigoJaAberto]);

  async function carregarCotacoesDaSolicitacao(solicitacaoId: string) {
    const { data } = await supabase
      .from("cotacoes")
      .select("*, fornecedores(fornecedor)")
      .eq("solicitacao_id", solicitacaoId)
      .order("valor_presente", { ascending: true });
    const rows = (data as unknown as (Cotacao & { fornecedores: { fornecedor: string } | null })[]) ?? [];
    setCotacoesDaSolicitacao(rows);
    setContagens((prev) => ({ ...prev, [solicitacaoId]: rows.length }));

    if (rows.length === 3) {
      const { data: melhor } = await supabase
        .from("cotacoes_melhor_opcao")
        .select("*")
        .eq("solicitacao_id", solicitacaoId)
        .single();
      setVencedoraId((melhor as CotacaoMelhorOpcao | null)?.cotacao_vencedora_id ?? null);

      const { data: classif } = await supabase
        .from("cotacoes_classificacao")
        .select("*")
        .eq("solicitacao_id", solicitacaoId)
        .maybeSingle();
      setClassificacao((classif as CotacaoClassificacao | null) ?? null);
    } else {
      setClassificacao(null);
    }
  }

  useEffect(() => {
    if (cotacoesDaSolicitacao.length === 0) return;
    Promise.resolve().then(async () => {
      const ids = Array.from(new Set(cotacoesDaSolicitacao.map((c) => c.fornecedor_id)));
      const { data } = await supabase.from("fornecedores_avaliacao_resumo").select("*").in("fornecedor_id", ids);
      const map: Record<string, FornecedorAvaliacaoResumo> = {};
      ((data as FornecedorAvaliacaoResumo[] | null) ?? []).forEach((r) => {
        map[r.fornecedor_id] = r;
      });
      setResumosFornecedores(map);
    });
  }, [cotacoesDaSolicitacao]);

  async function adicionarCotacao() {
    if (!selecionada) return;
    if (!form.fornecedor_id || form.preco == null || !form.prazo_pagamento_dias) return;

    setSalvando(true);
    setMensagem(null);
    try {
      const { error: erroCotacao } = await supabase.from("cotacoes").insert({
        solicitacao_id: selecionada.id,
        fornecedor_id: form.fornecedor_id,
        preco: form.preco,
        prazo_entrega_dias: form.prazo_entrega_dias ? Number(form.prazo_entrega_dias) : null,
        prazo_pagamento_dias: Number(form.prazo_pagamento_dias),
      });
      if (erroCotacao) throw erroCotacao;

      const novaContagem = (contagens[selecionada.id] ?? 0) + 1;
      const novoStatus =
        novaContagem >= 3 ? "aguardando_aprovacao" : selecionada.status === "aguardando_cotacao" ? "em_cotacao" : null;

      if (novoStatus) {
        const { error: erroStatus } = await supabase
          .from("solicitacoes")
          .update({ status: novoStatus, updated_at: new Date().toISOString() })
          .eq("id", selecionada.id);
        if (erroStatus) throw erroStatus;
      }

      setForm({ fornecedor_id: "", preco: null, prazo_entrega_dias: "", prazo_pagamento_dias: "" });
      setFornecedorQuery("");
      await carregarCotacoesDaSolicitacao(selecionada.id);
      recarregar();
      setMensagem({ tipo: "sucesso", texto: "Cotação registrada." });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro ao registrar cotação: " + (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  const contagemSelecionada = selecionada ? contagens[selecionada.id] ?? 0 : 0;

  const especificacoesComprador = selecionada?.itens
    ? [
        { label: "Marca", valor: selecionada.itens.marca },
        { label: "Modelo", valor: selecionada.itens.modelo },
        { label: "Dimensões", valor: selecionada.itens.dimensoes },
        { label: "Unidade de medida", valor: selecionada.itens.unidade_medida },
        {
          label: "Custo ideal",
          valor: selecionada.itens.custo_ideal != null ? formatarMoeda(selecionada.itens.custo_ideal) : null,
        },
      ].filter((c): c is { label: string; valor: string } => !!c.valor)
    : [];

  const fornecedoresFiltrados = fornecedores.filter((f) =>
    f.fornecedor.toLowerCase().includes(fornecedorQuery.trim().toLowerCase())
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-medium">Registrar Cotações</h2>
        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma solicitação aguardando cotação.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th className="py-2">Código</th>
                <th>Item</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Solicitante</th>
                <th>Cotações</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className={tbodyRowClass}>
                  <td className="py-2">{s.codigo}</td>
                  <td>{s.itens?.item}</td>
                  <td>{s.unidades?.nome ?? "-"}</td>
                  <td>{s.quantidade}</td>
                  <td>{s.solicitantes?.nome_completo}</td>
                  <td>{contagens[s.id] ?? 0} de 3</td>
                  <td>
                    <button onClick={() => selecionar(s)} className={secondaryButtonClass}>
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
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
      </section>

      {selecionada && (
        <section className={cardClass}>
          <h2 className="font-medium">
            {selecionada.codigo} — {selecionada.itens?.item}
          </h2>
          <p className="text-sm text-muted">Unidade: {selecionada.unidades?.nome ?? "-"}</p>

          {((selecionada.itens?.especificacoes && Object.keys(selecionada.itens.especificacoes).length > 0) ||
            selecionada.observacoes) && (
            <div className="rounded-md border border-hairline bg-surface-muted p-3 text-sm space-y-1">
              <p className="font-medium">Especificações informadas pelo solicitante</p>
              {selecionada.itens?.especificacoes &&
                Object.entries(selecionada.itens.especificacoes).map(([chave, valor]) => (
                  <p key={chave}>
                    <span className="text-muted">
                      {camposCategoria.find((c) => c.campo_chave === chave)?.campo_label ?? chave}:
                    </span>{" "}
                    {valor}
                  </p>
                ))}
              {selecionada.observacoes && (
                <p>
                  <span className="text-muted">Observações:</span> {selecionada.observacoes}
                </p>
              )}
            </div>
          )}

          {especificacoesComprador.length > 0 && (
            <div className="rounded-md border border-hairline bg-surface-muted p-3 text-sm space-y-1">
              <p className="font-medium">Especificações completadas pelo comprador</p>
              {especificacoesComprador.map((c) => (
                <p key={c.label}>
                  <span className="text-muted">{c.label}:</span> {c.valor}
                </p>
              ))}
            </div>
          )}

          <p className="text-sm">{contagemSelecionada} de 3 cotações registradas</p>

          {cotacoesDaSolicitacao.length > 0 && (
            <table className={tableClass}>
              <thead>
                <tr className={theadRowClass}>
                  <th className="py-2">Fornecedor</th>
                  <th>Preço</th>
                  <th>Valor presente</th>
                  <th>Prazo entrega</th>
                  <th>Prazo pagamento</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {cotacoesDaSolicitacao.map((c) => (
                  <tr
                    key={c.id}
                    className={`${tbodyRowClass} ${
                      c.id === vencedoraId
                        ? "bg-green-100 font-medium dark:bg-green-900/40"
                        : "bg-green-50/70 dark:bg-green-950/20"
                    }`}
                  >
                    <td className="py-2">
                      <span className="inline-flex items-center gap-2">
                        {c.fornecedores?.fornecedor}
                        {c.id === vencedoraId ? " ★ vencedora" : ""}
                        {resumosFornecedores[c.fornecedor_id] && (
                          <SeloAvaliacao classificacao={resumosFornecedores[c.fornecedor_id].classificacao} />
                        )}
                      </span>
                    </td>
                    <td>{formatarMoeda(c.preco)}</td>
                    <td>{formatarMoeda(c.valor_presente)}</td>
                    <td>{c.prazo_entrega_dias ?? "-"} dias</td>
                    <td>{c.prazo_pagamento_dias} dias</td>
                    <td>{formatarDataBR(c.data_cotacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {contagemSelecionada === 3 && (
            <div className="space-y-1">
              <ClassificacaoBadge classificacao={classificacao?.classificacao ?? null} />
              {origemReferenciaTexto(classificacao?.origem_referencia ?? null) && (
                <p className="text-xs text-zinc-500">
                  {origemReferenciaTexto(classificacao?.origem_referencia ?? null)}
                </p>
              )}
            </div>
          )}

          {contagemSelecionada < 3 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Adicionar cotação</h3>
              <label className="block text-sm space-y-1">
                <span>Fornecedor</span>
                <div className="relative">
                  <input
                    value={fornecedorQuery}
                    onChange={(e) => {
                      setFornecedorQuery(e.target.value);
                      setForm({ ...form, fornecedor_id: "" });
                      setFornecedorDropdownAberto(true);
                    }}
                    onFocus={() => setFornecedorDropdownAberto(true)}
                    onBlur={() =>
                      setTimeout(() => {
                        setFornecedorDropdownAberto(false);
                        setFornecedorQuery((atual) => {
                          const selecionado = fornecedores.find((f) => f.id === form.fornecedor_id);
                          return selecionado ? selecionado.fornecedor : atual.trim() ? "" : atual;
                        });
                      }, 150)
                    }
                    placeholder="Digite para buscar..."
                    className={inputClass}
                  />
                  {fornecedorDropdownAberto && (
                    <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-hairline bg-white shadow-sm dark:bg-surface-muted">
                      {fornecedoresFiltrados.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-muted">Nenhum fornecedor encontrado.</li>
                      ) : (
                        fornecedoresFiltrados.map((f) => (
                          <li key={f.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setForm({ ...form, fornecedor_id: f.id });
                                setFornecedorQuery(f.fornecedor);
                                setFornecedorDropdownAberto(false);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                            >
                              {f.fornecedor}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </label>
              <label className="block text-sm space-y-1">
                <span>Preço</span>
                <CampoMoeda value={form.preco} onChange={(preco) => setForm({ ...form, preco })} />
              </label>
              <label className="block text-sm space-y-1">
                <span>Prazo de entrega (dias)</span>
                <input
                  type="number"
                  value={form.prazo_entrega_dias}
                  onChange={(e) => setForm({ ...form, prazo_entrega_dias: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm space-y-1">
                <span>Prazo de pagamento (dias)</span>
                <input
                  type="number"
                  value={form.prazo_pagamento_dias}
                  onChange={(e) => setForm({ ...form, prazo_pagamento_dias: e.target.value })}
                  className={inputClass}
                />
              </label>
              <button onClick={adicionarCotacao} disabled={salvando} className={buttonClass}>
                Adicionar cotação
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className={buttonClass} disabled>
                Enviada para aprovação
              </button>
              <button onClick={() => setSelecionada(null)} className={secondaryButtonClass}>
                Fechar
              </button>
            </div>
          )}

          <MensagemInline mensagem={mensagem} />
        </section>
      )}
    </div>
  );
}

interface SolicitacaoAprovacao {
  id: string;
  codigo: string;
  quantidade: number;
  comprador_id: string | null;
  itens: { item: string } | null;
  solicitantes: { nome_completo: string } | null;
  unidades: { nome: string } | null;
}

function VisaoAprovador({
  aprovadorId,
  codigoFoco,
}: {
  aprovadorId: string;
  codigoFoco: string | null;
}) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [melhores, setMelhores] = useState<Record<string, CotacaoMelhorOpcao>>({});
  const [selecionada, setSelecionada] = useState<SolicitacaoAprovacao | null>(null);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [vencedoraId, setVencedoraId] = useState<string | null>(null);
  const [melhorSelecionada, setMelhorSelecionada] = useState<CotacaoMelhorOpcao | null>(null);
  const [valorPago, setValorPago] = useState<number | null>(null);
  const [valorContraproposta, setValorContraproposta] = useState<number | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);
  const [codigoJaAberto, setCodigoJaAberto] = useState(false);

  const {
    dados: lista,
    total,
    totalPaginas,
    pagina,
    itensPorPagina,
    carregando,
    irParaPagina,
    mudarItensPorPagina,
    recarregar,
  } = usePaginatedQuery<SolicitacaoAprovacao>({
    ordenarPor: "created_at",
    ascendente: true,
    montarConsulta: () =>
      supabase
        .from("solicitacoes")
        .select(
          "id, codigo, quantidade, comprador_id, itens(item), solicitantes(nome_completo), unidades(nome)",
          { count: "exact" }
        )
        .eq("status", "aguardando_aprovacao"),
  });

  useEffect(() => {
    supabase
      .from("fornecedores")
      .select("*")
      .then(({ data }) => setFornecedores(data ?? []));
  }, []);

  function nomeFornecedor(id: string) {
    return fornecedores.find((f) => f.id === id)?.fornecedor ?? "-";
  }

  useEffect(() => {
    Promise.resolve().then(async () => {
      if (lista.length === 0) {
        setMelhores({});
        return;
      }
      const { data: melhoresData } = await supabase
        .from("cotacoes_melhor_opcao")
        .select("*")
        .in("solicitacao_id", lista.map((r) => r.id));
      const map: Record<string, CotacaoMelhorOpcao> = {};
      (melhoresData as CotacaoMelhorOpcao[] | null ?? []).forEach((m) => {
        map[m.solicitacao_id] = m;
      });
      setMelhores(map);
    });
  }, [lista]);

  async function selecionar(row: SolicitacaoAprovacao) {
    setSelecionada(row);
    setMensagem(null);
    setVencedoraId(null);
    setMelhorSelecionada(null);
    setValorPago(null);
    setValorContraproposta(null);
    setCarregandoDetalhe(true);
    try {
      const [{ data: cotacoesData }, { data: melhorData, error: melhorErro }] = await Promise.all([
        supabase
          .from("cotacoes")
          .select("*")
          .eq("solicitacao_id", row.id)
          .order("valor_presente", { ascending: true }),
        supabase.from("cotacoes_melhor_opcao").select("*").eq("solicitacao_id", row.id).maybeSingle(),
      ]);
      setCotacoes((cotacoesData as Cotacao[]) ?? []);
      if (melhorErro || !melhorData) {
        setMensagem({
          tipo: "erro",
          texto: "Não foi possível carregar a cotação vencedora desta solicitação. Feche e tente abrir novamente.",
        });
        return;
      }
      const melhor = melhorData as CotacaoMelhorOpcao;
      setMelhorSelecionada(melhor);
      setVencedoraId(melhor.cotacao_vencedora_id);
      setValorPago(melhor.preco);
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  useEffect(() => {
    if (!codigoFoco || codigoJaAberto || lista.length === 0) return;
    const alvo = lista.find((s) => s.codigo === codigoFoco);
    if (!alvo) return;
    Promise.resolve().then(() => {
      selecionar(alvo);
      setCodigoJaAberto(true);
    });
  }, [lista, codigoFoco, codigoJaAberto]);

  async function aprovar() {
    if (!selecionada) return;
    if (carregandoDetalhe || !vencedoraId || !melhorSelecionada) {
      setMensagem({
        tipo: "erro",
        texto: "Os dados da cotação vencedora ainda estão carregando. Aguarde um instante e tente novamente.",
      });
      return;
    }
    if (valorPago == null) {
      setMensagem({ tipo: "erro", texto: "Informe o valor pago." });
      return;
    }

    setProcessando(true);
    setMensagem(null);
    try {
      const { error: erroCompra } = await supabase.from("compras").insert({
        solicitacao_id: selecionada.id,
        cotacao_id: melhorSelecionada.cotacao_vencedora_id,
        comprador_id: selecionada.comprador_id,
        aprovador_id: aprovadorId,
        valor_pago: valorPago,
        valor_contraproposta: valorContraproposta,
      });
      if (erroCompra) throw erroCompra;

      const { error: erroSolicitacao } = await supabase
        .from("solicitacoes")
        .update({
          aprovador_id: aprovadorId,
          data_aprovacao: new Date().toISOString(),
          cotacao_vencedora_id: melhorSelecionada.cotacao_vencedora_id,
          status: "concluida",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selecionada.id);
      if (erroSolicitacao) throw erroSolicitacao;

      setMensagem({ tipo: "sucesso", texto: `Solicitação ${selecionada.codigo} aprovada e compra registrada.` });
      setSelecionada(null);
      recarregar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro ao aprovar: " + (e as Error).message });
    } finally {
      setProcessando(false);
    }
  }

  async function rejeitar() {
    if (!selecionada) return;
    const motivo = window.prompt("Motivo da rejeição:");
    if (!motivo) return;

    setProcessando(true);
    setMensagem(null);
    try {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ status: "rejeitada", observacoes: motivo, updated_at: new Date().toISOString() })
        .eq("id", selecionada.id);
      if (error) throw error;
      setMensagem({ tipo: "sucesso", texto: `Solicitação ${selecionada.codigo} rejeitada.` });
      setSelecionada(null);
      recarregar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro ao rejeitar: " + (e as Error).message });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-medium">Cotações Aguardando Aprovação</h2>
        {!selecionada && <MensagemInline mensagem={mensagem} />}
        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma solicitação aguardando aprovação.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th className="py-2">Código</th>
                <th>Item</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Solicitante</th>
                <th>Fornecedor vencedor</th>
                <th>Preço</th>
                <th>Valor presente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => {
                const m = melhores[s.id];
                return (
                  <tr key={s.id} className={tbodyRowClass}>
                    <td className="py-2">{s.codigo}</td>
                    <td>{s.itens?.item}</td>
                    <td>{s.unidades?.nome ?? "-"}</td>
                    <td>{s.quantidade}</td>
                    <td>{s.solicitantes?.nome_completo}</td>
                    <td>{m ? nomeFornecedor(m.fornecedor_id) : "-"}</td>
                    <td>{formatarMoeda(m?.preco)}</td>
                    <td>{formatarMoeda(m?.valor_presente)}</td>
                    <td>
                      <button onClick={() => selecionar(s)} className={secondaryButtonClass}>
                        Abrir
                      </button>
                    </td>
                  </tr>
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
      </section>

      {selecionada && (
        <section className={cardClass}>
          <h2 className="font-medium">
            {selecionada.codigo} — {selecionada.itens?.item}
          </h2>
          <p className="text-sm text-muted">Unidade: {selecionada.unidades?.nome ?? "-"}</p>

          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th className="py-2">Fornecedor</th>
                <th>Preço</th>
                <th>Prazo entrega</th>
                <th>Prazo pagamento</th>
                <th>Valor presente</th>
              </tr>
            </thead>
            <tbody>
              {cotacoes.map((c) => (
                <tr
                  key={c.id}
                  className={`${tbodyRowClass} ${
                    c.id === vencedoraId ? "bg-green-50 dark:bg-green-900/20 font-medium" : ""
                  }`}
                >
                  <td className="py-2">
                    {nomeFornecedor(c.fornecedor_id)}
                    {c.id === vencedoraId ? " ★ vencedora" : ""}
                  </td>
                  <td>{formatarMoeda(c.preco)}</td>
                  <td>{c.prazo_entrega_dias ?? "-"} dias</td>
                  <td>{c.prazo_pagamento_dias} dias</td>
                  <td>{formatarMoeda(c.valor_presente)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm space-y-1">
              <span>Valor pago</span>
              <CampoMoeda value={valorPago} onChange={setValorPago} disabled={carregandoDetalhe} />
            </label>
            <label className="block text-sm space-y-1">
              <span>Valor de contraproposta (opcional)</span>
              <CampoMoeda value={valorContraproposta} onChange={setValorContraproposta} disabled={carregandoDetalhe} />
              <span className="block text-xs text-zinc-500">
                Preencha somente se houve renegociação e o valor final ficou diferente do preço da
                cotação vencedora. Não é obrigatório.
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={aprovar}
              disabled={processando || carregandoDetalhe || !vencedoraId || valorPago == null}
              className={buttonClass}
            >
              {carregandoDetalhe ? "Carregando..." : processando ? "Aprovando..." : "Aprovar"}
            </button>
            <button onClick={rejeitar} disabled={processando} className={secondaryButtonClass}>
              Rejeitar
            </button>
          </div>

          <MensagemInline mensagem={mensagem} />
        </section>
      )}
    </div>
  );
}
