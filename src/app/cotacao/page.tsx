"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Fornecedor, Cotacao, CotacaoMelhorOpcao } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, cardClass } from "@/components/ui";

type Tab = "comprador" | "aprovador";

export default function CotacaoPage() {
  const { loading, isComprador, isAprovador, aprovadorId } = useAuth();
  const abas: Tab[] = [
    ...(isComprador ? (["comprador"] as const) : []),
    ...(isAprovador ? (["aprovador"] as const) : []),
  ];
  const [tab, setTab] = useState<Tab | null>(null);
  const abaAtiva = tab && abas.includes(tab) ? tab : abas[0] ?? null;

  if (loading) return null;

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Cotação</h1>

      {abas.length === 0 ? (
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      ) : (
        <>
          {abas.length > 1 && (
            <div className="flex gap-2 mb-6">
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

          {abaAtiva === "comprador" && <VisaoComprador />}
          {abaAtiva === "aprovador" && aprovadorId && <VisaoAprovador aprovadorId={aprovadorId} />}
        </>
      )}
    </main>
  );
}

interface SolicitacaoResumo {
  id: string;
  codigo: string;
  quantidade: number;
  status: "aguardando_cotacao" | "em_cotacao" | "aguardando_aprovacao";
  comprador_id: string | null;
  itens: { item: string } | null;
  solicitantes: { nome_completo: string } | null;
}

function VisaoComprador() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [lista, setLista] = useState<SolicitacaoResumo[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [selecionada, setSelecionada] = useState<SolicitacaoResumo | null>(null);
  const [cotacoesDaSolicitacao, setCotacoesDaSolicitacao] = useState<
    (Cotacao & { fornecedores: { fornecedor: string } | null })[]
  >([]);
  const [vencedoraId, setVencedoraId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fornecedor_id: "",
    preco: "",
    prazo_entrega_dias: "",
    prazo_pagamento_dias: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("fornecedores")
      .select("*")
      .order("fornecedor")
      .then(({ data }) => setFornecedores(data ?? []));
    carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarLista() {
    const { data } = await supabase
      .from("solicitacoes")
      .select("id, codigo, quantidade, status, comprador_id, itens(item), solicitantes(nome_completo)")
      .in("status", ["aguardando_cotacao", "em_cotacao"])
      .order("created_at");
    const rows = (data as unknown as SolicitacaoResumo[]) ?? [];
    setLista(rows);

    if (rows.length > 0) {
      const { data: cts } = await supabase
        .from("cotacoes")
        .select("solicitacao_id")
        .in("solicitacao_id", rows.map((r) => r.id));
      const counts: Record<string, number> = {};
      (cts ?? []).forEach((c) => {
        counts[c.solicitacao_id] = (counts[c.solicitacao_id] ?? 0) + 1;
      });
      setContagens(counts);
    }
  }

  async function selecionar(row: SolicitacaoResumo) {
    setSelecionada(row);
    setMensagem(null);
    setVencedoraId(null);
    setForm({ fornecedor_id: "", preco: "", prazo_entrega_dias: "", prazo_pagamento_dias: "" });
    await carregarCotacoesDaSolicitacao(row.id);
  }

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
    }
  }

  async function adicionarCotacao() {
    if (!selecionada) return;
    if (!form.fornecedor_id || !form.preco || !form.prazo_pagamento_dias) return;

    setSalvando(true);
    setMensagem(null);
    try {
      const { error: erroCotacao } = await supabase.from("cotacoes").insert({
        solicitacao_id: selecionada.id,
        fornecedor_id: form.fornecedor_id,
        preco: Number(form.preco),
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

      setForm({ fornecedor_id: "", preco: "", prazo_entrega_dias: "", prazo_pagamento_dias: "" });
      await carregarCotacoesDaSolicitacao(selecionada.id);
      await carregarLista();
      setMensagem("Cotação registrada.");
    } catch (e) {
      setMensagem("Erro ao registrar cotação: " + (e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const contagemSelecionada = selecionada ? contagens[selecionada.id] ?? 0 : 0;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-medium mb-3">Registrar Cotações</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma solicitação aguardando cotação.</p>
        ) : (
          <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
            <thead>
              <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Código</th>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Solicitante</th>
                <th>Cotações</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">{s.codigo}</td>
                  <td>{s.itens?.item}</td>
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
      </section>

      {selecionada && (
        <section className={cardClass}>
          <h2 className="font-medium">
            {selecionada.codigo} — {selecionada.itens?.item}
          </h2>
          <p className="text-sm">{contagemSelecionada} de 3 cotações registradas</p>

          {cotacoesDaSolicitacao.length > 0 && (
            <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
              <thead>
                <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Fornecedor</th>
                  <th>Preço</th>
                  <th>Prazo entrega</th>
                  <th>Prazo pagamento</th>
                  <th>Valor presente</th>
                </tr>
              </thead>
              <tbody>
                {cotacoesDaSolicitacao.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-zinc-100 dark:border-zinc-900 ${
                      c.id === vencedoraId ? "bg-green-50 dark:bg-green-900/20 font-medium" : ""
                    }`}
                  >
                    <td className="py-2">
                      {c.fornecedores?.fornecedor}
                      {c.id === vencedoraId ? " ★ vencedora" : ""}
                    </td>
                    <td>{c.preco}</td>
                    <td>{c.prazo_entrega_dias ?? "-"} dias</td>
                    <td>{c.prazo_pagamento_dias} dias</td>
                    <td>{c.valor_presente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {contagemSelecionada < 3 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Adicionar cotação</h3>
              <label className="block text-sm space-y-1">
                <span>Fornecedor</span>
                <select
                  value={form.fornecedor_id}
                  onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fornecedor}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm space-y-1">
                <span>Preço</span>
                <input
                  type="number"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  className={inputClass}
                />
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
            <button className={buttonClass} disabled>
              Enviada para aprovação
            </button>
          )}

          {mensagem && <p className="text-sm">{mensagem}</p>}
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
}

function VisaoAprovador({ aprovadorId }: { aprovadorId: string }) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [lista, setLista] = useState<SolicitacaoAprovacao[]>([]);
  const [melhores, setMelhores] = useState<Record<string, CotacaoMelhorOpcao>>({});
  const [selecionada, setSelecionada] = useState<SolicitacaoAprovacao | null>(null);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [vencedoraId, setVencedoraId] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("fornecedores")
      .select("*")
      .then(({ data }) => setFornecedores(data ?? []));
    carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nomeFornecedor(id: string) {
    return fornecedores.find((f) => f.id === id)?.fornecedor ?? "-";
  }

  async function carregarLista() {
    const { data } = await supabase
      .from("solicitacoes")
      .select("id, codigo, quantidade, comprador_id, itens(item), solicitantes(nome_completo)")
      .eq("status", "aguardando_aprovacao")
      .order("created_at");
    const rows = (data as unknown as SolicitacaoAprovacao[]) ?? [];
    setLista(rows);

    if (rows.length > 0) {
      const { data: melhoresData } = await supabase
        .from("cotacoes_melhor_opcao")
        .select("*")
        .in("solicitacao_id", rows.map((r) => r.id));
      const map: Record<string, CotacaoMelhorOpcao> = {};
      (melhoresData as CotacaoMelhorOpcao[] | null ?? []).forEach((m) => {
        map[m.solicitacao_id] = m;
      });
      setMelhores(map);
    }
  }

  async function selecionar(row: SolicitacaoAprovacao) {
    setSelecionada(row);
    setMensagem(null);
    const { data } = await supabase
      .from("cotacoes")
      .select("*")
      .eq("solicitacao_id", row.id)
      .order("valor_presente", { ascending: true });
    setCotacoes((data as Cotacao[]) ?? []);
    setVencedoraId(melhores[row.id]?.cotacao_vencedora_id ?? null);
  }

  async function aprovar() {
    if (!selecionada || !vencedoraId) return;
    const melhor = melhores[selecionada.id];
    if (!melhor) return;

    setProcessando(true);
    setMensagem(null);
    try {
      const { error: erroCompra } = await supabase.from("compras").insert({
        solicitacao_id: selecionada.id,
        cotacao_id: melhor.cotacao_vencedora_id,
        comprador_id: selecionada.comprador_id,
        aprovador_id: aprovadorId,
        preco_final: melhor.preco,
      });
      if (erroCompra) throw erroCompra;

      const { error: erroSolicitacao } = await supabase
        .from("solicitacoes")
        .update({
          aprovador_id: aprovadorId,
          data_aprovacao: new Date().toISOString(),
          cotacao_vencedora_id: melhor.cotacao_vencedora_id,
          status: "concluida",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selecionada.id);
      if (erroSolicitacao) throw erroSolicitacao;

      setMensagem(`Solicitação ${selecionada.codigo} aprovada e compra registrada.`);
      setSelecionada(null);
      carregarLista();
    } catch (e) {
      setMensagem("Erro ao aprovar: " + (e as Error).message);
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
      setMensagem(`Solicitação ${selecionada.codigo} rejeitada.`);
      setSelecionada(null);
      carregarLista();
    } catch (e) {
      setMensagem("Erro ao rejeitar: " + (e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-medium mb-3">Cotações Aguardando Aprovação</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma solicitação aguardando aprovação.</p>
        ) : (
          <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
            <thead>
              <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Código</th>
                <th>Item</th>
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
                  <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2">{s.codigo}</td>
                    <td>{s.itens?.item}</td>
                    <td>{s.quantidade}</td>
                    <td>{s.solicitantes?.nome_completo}</td>
                    <td>{m ? nomeFornecedor(m.fornecedor_id) : "-"}</td>
                    <td>{m?.preco ?? "-"}</td>
                    <td>{m?.valor_presente ?? "-"}</td>
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
      </section>

      {selecionada && (
        <section className={cardClass}>
          <h2 className="font-medium">
            {selecionada.codigo} — {selecionada.itens?.item}
          </h2>

          <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
            <thead>
              <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
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
                  className={`border-b border-zinc-100 dark:border-zinc-900 ${
                    c.id === vencedoraId ? "bg-green-50 dark:bg-green-900/20 font-medium" : ""
                  }`}
                >
                  <td className="py-2">
                    {nomeFornecedor(c.fornecedor_id)}
                    {c.id === vencedoraId ? " ★ vencedora" : ""}
                  </td>
                  <td>{c.preco}</td>
                  <td>{c.prazo_entrega_dias ?? "-"} dias</td>
                  <td>{c.prazo_pagamento_dias} dias</td>
                  <td>{c.valor_presente}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2">
            <button onClick={aprovar} disabled={processando} className={buttonClass}>
              Aprovar
            </button>
            <button onClick={rejeitar} disabled={processando} className={secondaryButtonClass}>
              Rejeitar
            </button>
          </div>

          {mensagem && <p className="text-sm">{mensagem}</p>}
        </section>
      )}
    </div>
  );
}
