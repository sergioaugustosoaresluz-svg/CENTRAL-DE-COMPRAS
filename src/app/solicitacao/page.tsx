"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Pessoa, Item, SolicitacaoStatus } from "@/lib/supabase/types";
import { StatusBadge } from "@/components/StatusBadge";
import {
  inputClass,
  buttonClass,
  secondaryButtonClass,
  cardClass,
  UNIDADES,
  gerarCodigo,
} from "@/components/ui";

type Tab = "solicitante" | "comprador";

export default function SolicitacaoPage() {
  const [tab, setTab] = useState<Tab>("solicitante");

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Solicitação</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("solicitante")}
          className={
            tab === "solicitante" ? buttonClass : secondaryButtonClass
          }
        >
          Solicitante
        </button>
        <button
          onClick={() => setTab("comprador")}
          className={tab === "comprador" ? buttonClass : secondaryButtonClass}
        >
          Comprador
        </button>
      </div>

      {tab === "solicitante" ? <VisaoSolicitante /> : <VisaoComprador />}
    </main>
  );
}

interface SolicitacaoComItem {
  id: string;
  codigo: string;
  quantidade: number;
  status: SolicitacaoStatus;
  created_at: string;
  itens: { item: string } | null;
}

function VisaoSolicitante() {
  const [solicitantes, setSolicitantes] = useState<Pessoa[]>([]);
  const [solicitanteId, setSolicitanteId] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [itemNovo, setItemNovo] = useState(false);
  const [descricaoNovoItem, setDescricaoNovoItem] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<
    SolicitacaoComItem[]
  >([]);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("solicitantes")
      .select("*")
      .order("nome_completo")
      .then(({ data }) => setSolicitantes(data ?? []));
    supabase
      .from("itens")
      .select("*")
      .order("item")
      .then(({ data }) => setItens(data ?? []));
  }, []);

  useEffect(() => {
    if (!solicitanteId) {
      setMinhasSolicitacoes([]);
      return;
    }
    carregarMinhasSolicitacoes(solicitanteId);
  }, [solicitanteId]);

  async function carregarMinhasSolicitacoes(id: string) {
    const { data } = await supabase
      .from("solicitacoes")
      .select("id, codigo, quantidade, status, created_at, itens(item)")
      .eq("solicitante_id", id)
      .order("created_at", { ascending: false });
    setMinhasSolicitacoes((data as unknown as SolicitacaoComItem[]) ?? []);
  }

  async function enviarSolicitacao() {
    if (!solicitanteId || !quantidade) return;
    if (!itemNovo && !itemId) return;
    if (itemNovo && !descricaoNovoItem.trim()) return;

    setEnviando(true);
    setMensagem(null);
    try {
      let finalItemId = itemId;
      let statusInicial: SolicitacaoStatus;

      if (itemNovo) {
        const { data: novoItem, error: erroItem } = await supabase
          .from("itens")
          .insert({ item: descricaoNovoItem.trim(), status: "pendente_especificacao" })
          .select()
          .single();
        if (erroItem || !novoItem) throw erroItem ?? new Error("Falha ao criar item");
        finalItemId = novoItem.id;
        statusInicial = "aguardando_especificacao";
      } else {
        const item = itens.find((i) => i.id === itemId);
        statusInicial =
          item?.status === "aprovado" ? "aguardando_cotacao" : "aguardando_especificacao";
      }

      const codigo = gerarCodigo("SOL");
      const { error: erroSolicitacao } = await supabase.from("solicitacoes").insert({
        codigo,
        solicitante_id: solicitanteId,
        item_id: finalItemId,
        quantidade: Number(quantidade),
        observacoes: observacoes.trim() || null,
        status: statusInicial,
      });
      if (erroSolicitacao) throw erroSolicitacao;

      setMensagem(`Solicitação ${codigo} criada com sucesso.`);
      setItemId("");
      setItemNovo(false);
      setDescricaoNovoItem("");
      setQuantidade("");
      setObservacoes("");
      carregarMinhasSolicitacoes(solicitanteId);
    } catch (e) {
      setMensagem("Erro ao criar solicitação: " + (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className={cardClass}>
        <h2 className="font-medium">Nova Solicitação</h2>

        <label className="block text-sm space-y-1">
          <span>Solicitante</span>
          <select
            value={solicitanteId}
            onChange={(e) => setSolicitanteId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {solicitantes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome_completo}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={itemNovo}
            onChange={(e) => setItemNovo(e.target.checked)}
          />
          Item novo (não está cadastrado)
        </label>

        {itemNovo ? (
          <label className="block text-sm space-y-1">
            <span>Descrição do item</span>
            <input
              value={descricaoNovoItem}
              onChange={(e) => setDescricaoNovoItem(e.target.value)}
              className={inputClass}
            />
          </label>
        ) : (
          <label className="block text-sm space-y-1">
            <span>Item</span>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.item}
                  {i.status === "pendente_especificacao" ? " (pendente de especificação)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm space-y-1">
          <span>Quantidade</span>
          <input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-sm space-y-1">
          <span>Observações</span>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className={inputClass}
            rows={3}
          />
        </label>

        <button onClick={enviarSolicitacao} disabled={enviando} className={buttonClass}>
          {enviando ? "Enviando..." : "Enviar solicitação"}
        </button>

        {mensagem && <p className="text-sm">{mensagem}</p>}
      </section>

      <section>
        <h2 className="font-medium mb-3">Minhas solicitações</h2>
        {minhasSolicitacoes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {solicitanteId ? "Nenhuma solicitação ainda." : "Selecione um solicitante para ver a lista."}
          </p>
        ) : (
          <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
            <thead>
              <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Código</th>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {minhasSolicitacoes.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">{s.codigo}</td>
                  <td>{s.itens?.item}</td>
                  <td>{s.quantidade}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

interface SolicitacaoPendente {
  id: string;
  codigo: string;
  quantidade: number;
  created_at: string;
  item_id: string;
  itens: Item | null;
  solicitantes: { nome_completo: string } | null;
}

function VisaoComprador() {
  const [compradores, setCompradores] = useState<Pessoa[]>([]);
  const [compradorId, setCompradorId] = useState("");
  const [pendentes, setPendentes] = useState<SolicitacaoPendente[]>([]);
  const [selecionado, setSelecionado] = useState<SolicitacaoPendente | null>(null);
  const [form, setForm] = useState({
    codigo: "",
    marca: "",
    modelo: "",
    dimensoes: "",
    unidade_medida: "",
    custo_ideal: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("compradores")
      .select("*")
      .order("nome_completo")
      .then(({ data }) => setCompradores(data ?? []));
    carregarPendentes();
  }, []);

  async function carregarPendentes() {
    const { data } = await supabase
      .from("solicitacoes")
      .select("id, codigo, quantidade, created_at, item_id, itens(*), solicitantes(nome_completo)")
      .eq("status", "aguardando_especificacao")
      .order("created_at");
    setPendentes((data as unknown as SolicitacaoPendente[]) ?? []);
  }

  function selecionar(row: SolicitacaoPendente) {
    setSelecionado(row);
    setMensagem(null);
    setForm({
      codigo: row.itens?.codigo ?? gerarCodigo("ITEM"),
      marca: row.itens?.marca ?? "",
      modelo: row.itens?.modelo ?? "",
      dimensoes: row.itens?.dimensoes ?? "",
      unidade_medida: row.itens?.unidade_medida ?? "",
      custo_ideal: row.itens?.custo_ideal != null ? String(row.itens.custo_ideal) : "",
    });
  }

  async function aprovarItem() {
    if (!selecionado || !compradorId) return;
    setSalvando(true);
    try {
      const { error: erroItem } = await supabase
        .from("itens")
        .update({
          codigo: form.codigo,
          marca: form.marca || null,
          modelo: form.modelo || null,
          dimensoes: form.dimensoes || null,
          unidade_medida: form.unidade_medida || null,
          custo_ideal: form.custo_ideal ? Number(form.custo_ideal) : null,
          status: "aprovado",
        })
        .eq("id", selecionado.item_id);
      if (erroItem) throw erroItem;

      const { error: erroSolicitacao } = await supabase
        .from("solicitacoes")
        .update({
          status: "aguardando_cotacao",
          comprador_id: compradorId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selecionado.id);
      if (erroSolicitacao) throw erroSolicitacao;

      setMensagem(`Item aprovado. Solicitação ${selecionado.codigo} liberada para cotação.`);
      setSelecionado(null);
      carregarPendentes();
    } catch (e) {
      setMensagem("Erro ao aprovar item: " + (e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function solicitarMaisDetalhes() {
    if (!selecionado) return;
    const motivo = window.prompt("O que precisa ser detalhado pelo solicitante?");
    if (!motivo) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ observacoes: motivo, updated_at: new Date().toISOString() })
        .eq("id", selecionado.id);
      if (error) throw error;
      setMensagem("Solicitado mais detalhes ao solicitante.");
      setSelecionado(null);
      carregarPendentes();
    } catch (e) {
      setMensagem("Erro: " + (e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-8">
      <label className="block text-sm space-y-1 max-w-sm">
        <span>Você é (comprador)</span>
        <select
          value={compradorId}
          onChange={(e) => setCompradorId(e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione...</option>
          {compradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_completo}
            </option>
          ))}
        </select>
      </label>

      <section>
        <h2 className="font-medium mb-3">Especificação de Itens Pendentes</h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum item pendente de especificação.</p>
        ) : (
          <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
            <thead>
              <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Item</th>
                <th>Solicitante</th>
                <th>Quantidade</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2">{p.itens?.item}</td>
                  <td>{p.solicitantes?.nome_completo}</td>
                  <td>{p.quantidade}</td>
                  <td>{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <button onClick={() => selecionar(p)} className={secondaryButtonClass}>
                      Especificar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selecionado && (
        <section className={cardClass}>
          <h2 className="font-medium">
            Complementar especificação — {selecionado.itens?.item}
          </h2>

          <label className="block text-sm space-y-1">
            <span>Código do item</span>
            <input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Marca</span>
            <input
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Modelo</span>
            <input
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Dimensões</span>
            <input
              value={form.dimensoes}
              onChange={(e) => setForm({ ...form, dimensoes: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Unidade de medida</span>
            <select
              value={form.unidade_medida}
              onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm space-y-1">
            <span>Custo ideal</span>
            <input
              type="number"
              value={form.custo_ideal}
              onChange={(e) => setForm({ ...form, custo_ideal: e.target.value })}
              className={inputClass}
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={aprovarItem}
              disabled={salvando || !compradorId}
              className={buttonClass}
            >
              Aprovar item
            </button>
            <button
              onClick={solicitarMaisDetalhes}
              disabled={salvando}
              className={secondaryButtonClass}
            >
              Solicitar mais detalhes ao solicitante
            </button>
          </div>

          {mensagem && <p className="text-sm">{mensagem}</p>}
        </section>
      )}
    </div>
  );
}
