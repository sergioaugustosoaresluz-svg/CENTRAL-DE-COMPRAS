"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Item, SolicitacaoStatus, Categoria, CategoriaCampoEspecificacao, Unidade } from "@/lib/supabase/types";
import { StatusBadge } from "@/components/StatusBadge";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";
import { PageContainer, formCardWidthClass } from "@/components/PageContainer";
import {
  inputClass,
  buttonClass,
  secondaryButtonClass,
  dangerButtonClass,
  cardClass,
  UNIDADES,
  gerarCodigo,
  tableClass,
  theadRowClass,
  tbodyRowClass,
} from "@/components/ui";

type Tab = "solicitante" | "comprador";

export default function SolicitacaoPage() {
  return (
    <Suspense fallback={null}>
      <SolicitacaoPageConteudo />
    </Suspense>
  );
}

function SolicitacaoPageConteudo() {
  const searchParams = useSearchParams();
  const abaParam = searchParams.get("aba");
  const codigoFoco = searchParams.get("codigo");
  const { loading, isSolicitante, isComprador, isAdmin, solicitanteId, compradorId } = useAuth();
  const abas: Tab[] = [
    ...(isSolicitante ? (["solicitante"] as const) : []),
    ...(isComprador || isAdmin ? (["comprador"] as const) : []),
  ];
  const [tab, setTab] = useState<Tab | null>(() =>
    abaParam === "solicitante" || abaParam === "comprador" ? abaParam : null
  );
  const abaAtiva = tab && abas.includes(tab) ? tab : abas[0] ?? null;

  if (loading) return null;

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Solicitação</h1>

      {abas.length === 0 ? (
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      ) : (
        <>
          {abas.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setTab("solicitante")}
                className={abaAtiva === "solicitante" ? buttonClass : secondaryButtonClass}
              >
                Solicitante
              </button>
              <button
                onClick={() => setTab("comprador")}
                className={abaAtiva === "comprador" ? buttonClass : secondaryButtonClass}
              >
                Comprador
              </button>
            </div>
          )}

          {abaAtiva === "solicitante" && solicitanteId && (
            <VisaoSolicitante solicitanteId={solicitanteId} codigoFoco={codigoFoco} />
          )}
          {abaAtiva === "comprador" && (
            <VisaoComprador compradorId={compradorId} codigoFoco={codigoFoco} />
          )}
        </>
      )}
    </PageContainer>
  );
}

interface SolicitacaoComItem {
  id: string;
  codigo: string;
  quantidade: number;
  status: SolicitacaoStatus;
  created_at: string;
  itens: { item: string } | null;
  unidades: { nome: string } | null;
}

function VisaoSolicitante({
  solicitanteId,
  codigoFoco,
}: {
  solicitanteId: string;
  codigoFoco: string | null;
}) {
  const [itens, setItens] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [itemNovo, setItemNovo] = useState(false);
  const [descricaoNovoItem, setDescricaoNovoItem] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [camposCategoria, setCamposCategoria] = useState<CategoriaCampoEspecificacao[]>([]);
  const [especificacoes, setEspecificacoes] = useState<Record<string, string>>({});
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<
    SolicitacaoComItem[]
  >([]);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);
  const [codigoDestacado, setCodigoDestacado] = useState<string | null>(null);

  useEffect(() => {
    if (!codigoFoco) return;
    const alvo = minhasSolicitacoes.find((s) => s.codigo === codigoFoco);
    if (!alvo) return;
    Promise.resolve().then(() => setCodigoDestacado(codigoFoco));
  }, [minhasSolicitacoes, codigoFoco]);

  useEffect(() => {
    supabase
      .from("itens")
      .select("*")
      .order("item")
      .then(({ data }) => setItens(data ?? []));
    supabase
      .from("categorias")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setCategorias(data ?? []));
    supabase
      .from("unidades")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setUnidades((data as Unidade[]) ?? []));
    carregarMinhasSolicitacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const consulta = categoriaId
      ? supabase
          .from("categoria_campos_especificacao")
          .select("*")
          .eq("categoria_id", categoriaId)
          .order("ordem")
      : Promise.resolve({ data: [] as CategoriaCampoEspecificacao[] });
    consulta.then(({ data }) => {
      setCamposCategoria(data ?? []);
      setEspecificacoes({});
    });
  }, [categoriaId]);

  async function carregarMinhasSolicitacoes() {
    const { data } = await supabase
      .from("solicitacoes")
      .select("id, codigo, quantidade, status, created_at, itens(item), unidades(nome)")
      .eq("solicitante_id", solicitanteId)
      .order("created_at", { ascending: false });
    setMinhasSolicitacoes((data as unknown as SolicitacaoComItem[]) ?? []);
  }

  async function enviarSolicitacao() {
    if (!quantidade) return;
    if (!unidadeId) return;
    if (!itemNovo && !itemId) return;
    if (itemNovo && !descricaoNovoItem.trim()) return;
    if (itemNovo && !categoriaId) return;
    if (itemNovo && camposCategoria.some((c) => c.obrigatorio && !(especificacoes[c.campo_chave] ?? "").trim())) {
      return;
    }

    setEnviando(true);
    setMensagem(null);
    try {
      let finalItemId = itemId;
      let statusInicial: SolicitacaoStatus;

      if (itemNovo) {
        const especificacoesPreenchidas = Object.fromEntries(
          Object.entries(especificacoes).filter(([, v]) => v.trim() !== "")
        );
        const { data: novoItem, error: erroItem } = await supabase
          .from("itens")
          .insert({
            item: descricaoNovoItem.trim(),
            status: "pendente_especificacao",
            categoria_id: categoriaId,
            especificacoes: Object.keys(especificacoesPreenchidas).length > 0 ? especificacoesPreenchidas : null,
          })
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
        unidade_id: unidadeId,
        quantidade: Number(quantidade),
        observacoes: observacoes.trim() || null,
        status: statusInicial,
      });
      if (erroSolicitacao) throw erroSolicitacao;

      setMensagem({ tipo: "sucesso", texto: `Solicitação ${codigo} criada com sucesso.` });
      setItemId("");
      setItemNovo(false);
      setDescricaoNovoItem("");
      setCategoriaId("");
      setEspecificacoes({});
      setUnidadeId("");
      setQuantidade("");
      setObservacoes("");
      carregarMinhasSolicitacoes();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro ao criar solicitação: " + (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className={`${cardClass} ${formCardWidthClass}`}>
        <h2 className="font-medium">Nova Solicitação</h2>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={itemNovo}
            onChange={(e) => setItemNovo(e.target.checked)}
          />
          Item novo (não está cadastrado)
        </label>

        {itemNovo ? (
          <>
            <label className="block text-sm space-y-1">
              <span>Descrição do item</span>
              <input
                value={descricaoNovoItem}
                onChange={(e) => setDescricaoNovoItem(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block text-sm space-y-1">
              <span>Categoria</span>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            {camposCategoria.map((campo) => (
              <label key={campo.campo_chave} className="block text-sm space-y-1">
                <span>
                  {campo.campo_label}
                  {campo.obrigatorio && <span className="text-red-600 dark:text-red-400"> *</span>}
                </span>
                <input
                  value={especificacoes[campo.campo_chave] ?? ""}
                  onChange={(e) =>
                    setEspecificacoes((prev) => ({ ...prev, [campo.campo_chave]: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </>
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
          <span>
            Unidade<span className="text-red-600 dark:text-red-400"> *</span>
          </span>
          <select
            value={unidadeId}
            onChange={(e) => setUnidadeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>

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

        <MensagemInline mensagem={mensagem} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Minhas solicitações</h2>
        {minhasSolicitacoes.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma solicitação ainda.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th className="py-2">Código</th>
                <th>Item</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {minhasSolicitacoes.map((s) => (
                <tr
                  key={s.id}
                  className={`${tbodyRowClass} ${s.codigo === codigoDestacado ? "bg-primary-soft" : ""}`}
                >
                  <td className="py-2">{s.codigo}</td>
                  <td>{s.itens?.item}</td>
                  <td>{s.unidades?.nome ?? "-"}</td>
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

interface SolicitacaoLigada {
  id: string;
  codigo: string;
  quantidade: number;
  solicitantes: { nome_completo: string } | null;
  unidades: { nome: string } | null;
}

interface ItemPendente extends Item {
  solicitacoes: SolicitacaoLigada[] | null;
}

function solicitacaoLigada(item: ItemPendente): SolicitacaoLigada | null {
  return item.solicitacoes?.[0] ?? null;
}

function VisaoComprador({
  compradorId,
  codigoFoco,
}: {
  compradorId: string | null;
  codigoFoco: string | null;
}) {
  const { isAdmin } = useAuth();
  const [pendentes, setPendentes] = useState<ItemPendente[]>([]);
  const [selecionado, setSelecionado] = useState<ItemPendente | null>(null);
  const [camposDaCategoriaSelecionada, setCamposDaCategoriaSelecionada] = useState<
    CategoriaCampoEspecificacao[]
  >([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    codigo: "",
    marca: "",
    modelo: "",
    dimensoes: "",
    unidade_medida: "",
    custo_ideal: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [aprovandoSelecionados, setAprovandoSelecionados] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);
  const [codigoJaAberto, setCodigoJaAberto] = useState(false);

  useEffect(() => {
    carregarPendentes();
  }, []);

  async function carregarPendentes() {
    const { data } = await supabase
      .from("itens")
      .select("*, solicitacoes(id, codigo, quantidade, solicitantes(nome_completo), unidades(nome))")
      .eq("status", "pendente_especificacao")
      .order("created_at");
    setPendentes((data as unknown as ItemPendente[]) ?? []);
  }

  function selecionar(item: ItemPendente) {
    setSelecionado(item);
    setMensagem(null);
    setForm({
      codigo: item.codigo ?? item.codigo_sugerido ?? gerarCodigo("ITEM"),
      marca: item.marca ?? "",
      modelo: item.modelo ?? "",
      dimensoes: item.dimensoes ?? "",
      unidade_medida: item.unidade_medida ?? "",
      custo_ideal: item.custo_ideal != null ? String(item.custo_ideal) : "",
    });
    if (item.categoria_id) {
      supabase
        .from("categoria_campos_especificacao")
        .select("*")
        .eq("categoria_id", item.categoria_id)
        .order("ordem")
        .then(({ data }) => setCamposDaCategoriaSelecionada(data ?? []));
    } else {
      setCamposDaCategoriaSelecionada([]);
    }
  }

  useEffect(() => {
    if (!codigoFoco || codigoJaAberto || pendentes.length === 0) return;
    const alvo = pendentes.find((p) => solicitacaoLigada(p)?.codigo === codigoFoco);
    if (!alvo) return;
    Promise.resolve().then(() => {
      selecionar(alvo);
      setCodigoJaAberto(true);
    });
  }, [pendentes, codigoFoco, codigoJaAberto]);

  async function aprovarItem() {
    if (!selecionado) return;
    if (!compradorId) {
      setMensagem({ tipo: "erro", texto: "Apenas compradores podem aprovar itens." });
      return;
    }
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
        .eq("id", selecionado.id);
      if (erroItem) throw erroItem;

      const solicitacao = solicitacaoLigada(selecionado);
      if (solicitacao) {
        const { error: erroSolicitacao } = await supabase
          .from("solicitacoes")
          .update({
            status: "aguardando_cotacao",
            comprador_id: compradorId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", solicitacao.id);
        if (erroSolicitacao) throw erroSolicitacao;
      }

      setMensagem({
        tipo: "sucesso",
        texto: solicitacao
          ? `Item aprovado. Solicitação ${solicitacao.codigo} liberada para cotação.`
          : "Item aprovado.",
      });
      setSelecionado(null);
      carregarPendentes();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro ao aprovar item: " + (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  function alternarSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarSelecaoTodos() {
    setSelecionados((prev) =>
      prev.size === pendentes.length ? new Set() : new Set(pendentes.map((p) => p.id))
    );
  }

  async function aprovarSelecionados() {
    if (!compradorId) {
      setMensagem({ tipo: "erro", texto: "Apenas compradores podem aprovar itens." });
      return;
    }
    if (selecionados.size === 0) return;

    setAprovandoSelecionados(true);
    setMensagem(null);
    try {
      const alvos = pendentes.filter((p) => selecionados.has(p.id));
      for (const item of alvos) {
        const codigoFinal = item.codigo ?? item.codigo_sugerido ?? null;
        const { error: erroItem } = await supabase
          .from("itens")
          .update({ status: "aprovado", ...(codigoFinal ? { codigo: codigoFinal } : {}) })
          .eq("id", item.id);
        if (erroItem) throw erroItem;

        const solicitacao = solicitacaoLigada(item);
        if (solicitacao) {
          const { error: erroSolicitacao } = await supabase
            .from("solicitacoes")
            .update({
              status: "aguardando_cotacao",
              comprador_id: compradorId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", solicitacao.id);
          if (erroSolicitacao) throw erroSolicitacao;
        }
      }

      setMensagem({ tipo: "sucesso", texto: `${alvos.length} item(ns) aprovado(s).` });
      setSelecionados(new Set());
      carregarPendentes();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro ao aprovar selecionados: " + (e as Error).message });
    } finally {
      setAprovandoSelecionados(false);
    }
  }

  async function excluir(item: ItemPendente) {
    if (!window.confirm(`Tem certeza que deseja excluir o item "${item.item}"?`)) return;
    const solicitacao = solicitacaoLigada(item);
    if (solicitacao) {
      const { error: erroSol } = await supabase.from("solicitacoes").delete().eq("id", solicitacao.id);
      if (erroSol) {
        setMensagem({ tipo: "erro", texto: "Erro ao excluir: " + erroSol.message });
        return;
      }
    }
    const { error } = await supabase.from("itens").delete().eq("id", item.id);
    if (error) {
      setMensagem({ tipo: "erro", texto: "Erro ao excluir: " + error.message });
      return;
    }
    if (selecionado?.id === item.id) setSelecionado(null);
    carregarPendentes();
  }

  async function solicitarMaisDetalhes() {
    if (!selecionado) return;
    const solicitacao = solicitacaoLigada(selecionado);
    if (!solicitacao) return;
    const motivo = window.prompt("O que precisa ser detalhado pelo solicitante?");
    if (!motivo) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ observacoes: motivo, updated_at: new Date().toISOString() })
        .eq("id", solicitacao.id);
      if (error) throw error;
      setMensagem({ tipo: "sucesso", texto: "Solicitado mais detalhes ao solicitante." });
      setSelecionado(null);
      carregarPendentes();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro: " + (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Especificação de Itens Pendentes</h2>
          {selecionados.size > 0 && (
            <button
              onClick={aprovarSelecionados}
              disabled={aprovandoSelecionados}
              className={buttonClass}
            >
              {aprovandoSelecionados
                ? "Aprovando..."
                : `Aprovar selecionados (${selecionados.size})`}
            </button>
          )}
        </div>
        {!selecionado && <MensagemInline mensagem={mensagem} />}
        {pendentes.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum item pendente de especificação.</p>
        ) : (
          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th className="py-2">
                  <input
                    type="checkbox"
                    checked={selecionados.size === pendentes.length}
                    onChange={alternarSelecaoTodos}
                  />
                </th>
                <th>Item</th>
                <th>Solicitante</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Data</th>
                <th></th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {pendentes.map((p) => (
                <tr key={p.id} className={tbodyRowClass}>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selecionados.has(p.id)}
                      onChange={() => alternarSelecao(p.id)}
                    />
                  </td>
                  <td>{p.item}</td>
                  <td>{solicitacaoLigada(p)?.solicitantes?.nome_completo ?? "-"}</td>
                  <td>{solicitacaoLigada(p)?.unidades?.nome ?? "-"}</td>
                  <td>{solicitacaoLigada(p)?.quantidade ?? "-"}</td>
                  <td>{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <button onClick={() => selecionar(p)} className={secondaryButtonClass}>
                      Especificar
                    </button>
                  </td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => excluir(p)} className={dangerButtonClass}>
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selecionado && (
        <section className={cardClass}>
          <h2 className="font-medium">
            Complementar especificação — {selecionado.item}
          </h2>
          <p className="text-sm text-muted">
            Unidade: {solicitacaoLigada(selecionado)?.unidades?.nome ?? "-"}
          </p>

          {selecionado.especificacoes && Object.keys(selecionado.especificacoes).length > 0 && (
            <div className="rounded-md border border-hairline bg-surface-muted p-3 text-sm space-y-1">
              <p className="font-medium">Especificações informadas pelo solicitante</p>
              {Object.entries(selecionado.especificacoes).map(([chave, valor]) => (
                <p key={chave}>
                  <span className="text-muted">
                    {camposDaCategoriaSelecionada.find((c) => c.campo_chave === chave)?.campo_label ?? chave}:
                  </span>{" "}
                  {valor}
                </p>
              ))}
            </div>
          )}

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
            <button onClick={aprovarItem} disabled={salvando} className={buttonClass}>
              Aprovar item
            </button>
            {solicitacaoLigada(selecionado) && (
              <button
                onClick={solicitarMaisDetalhes}
                disabled={salvando}
                className={secondaryButtonClass}
              >
                Solicitar mais detalhes ao solicitante
              </button>
            )}
          </div>

          <MensagemInline mensagem={mensagem} />
        </section>
      )}
    </div>
  );
}
