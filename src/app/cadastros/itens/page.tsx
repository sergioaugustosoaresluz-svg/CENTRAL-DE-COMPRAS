"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Item } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, dangerButtonClass, cardClass, UNIDADES } from "@/components/ui";

interface ErroSupabase {
  code?: string;
  message?: string;
}

const FORM_VAZIO = {
  item: "",
  marca: "",
  modelo: "",
  dimensoes: "",
  unidade_medida: "",
  custo_ideal: "",
};

function ItemStatusBadge({ status }: { status: Item["status"] }) {
  const aprovado = status === "aprovado";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        aprovado
          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      }`}
    >
      {aprovado ? "Aprovado" : "Pendente de especificação"}
    </span>
  );
}

export default function ItensPage() {
  const { isAdmin } = useAuth();
  const [lista, setLista] = useState<Item[]>([]);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  async function carregar() {
    let query = supabase.from("itens").select("*").order("item");
    if (busca.trim()) {
      query = query.or(`item.ilike.%${busca}%,codigo.ilike.%${busca}%`);
    }
    const { data } = await query;
    setLista((data as Item[]) ?? []);
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setMensagem(null);
    setAberto(true);
  }

  function abrirEdicao(i: Item) {
    setEditandoId(i.id);
    setForm({
      item: i.item,
      marca: i.marca ?? "",
      modelo: i.modelo ?? "",
      dimensoes: i.dimensoes ?? "",
      unidade_medida: i.unidade_medida ?? "",
      custo_ideal: i.custo_ideal != null ? String(i.custo_ideal) : "",
    });
    setMensagem(null);
    setAberto(true);
  }

  function mensagemDeErro(e: ErroSupabase): string {
    if (e.code === "42501") {
      return "Você não tem permissão para esta ação.";
    }
    return e.message ?? "Erro desconhecido.";
  }

  async function excluir(e: React.MouseEvent, i: Item) {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir "${i.item}"?`)) return;
    const { error } = await supabase.from("itens").delete().eq("id", i.id);
    if (error) {
      setMensagem(mensagemDeErro(error));
      return;
    }
    carregar();
  }

  async function salvar() {
    if (!form.item.trim()) {
      setMensagem("A descrição do item é obrigatória.");
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      const payload = {
        item: form.item.trim(),
        marca: form.marca.trim() || null,
        modelo: form.modelo.trim() || null,
        dimensoes: form.dimensoes.trim() || null,
        unidade_medida: form.unidade_medida || null,
        custo_ideal: form.custo_ideal ? Number(form.custo_ideal) : null,
      };

      const { error } = editandoId
        ? await supabase.from("itens").update(payload).eq("id", editandoId)
        : await supabase.from("itens").insert({ ...payload, status: "pendente_especificacao" });
      if (error) throw error;

      setAberto(false);
      carregar();
    } catch (e) {
      setMensagem(mensagemDeErro(e as ErroSupabase));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Itens</h1>
        <button onClick={abrirNovo} className={buttonClass}>
          Novo cadastro
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        Itens criados aqui entram como &quot;pendente de especificação&quot; e são aprovados
        na tela de Solicitação (visão comprador).
      </p>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por item ou código..."
        className={inputClass}
      />

      {lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum item encontrado.</p>
      ) : (
        <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th>Código</th>
              <th>Item</th>
              <th>Marca</th>
              <th>Status</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((i) => (
              <tr
                key={i.id}
                onClick={() => abrirEdicao(i)}
                className="border-b border-zinc-100 dark:border-zinc-900 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <td>{i.codigo ?? "-"}</td>
                <td>{i.item}</td>
                <td>{i.marca ?? "-"}</td>
                <td>
                  <ItemStatusBadge status={i.status} />
                </td>
                {isAdmin && (
                  <td>
                    <button onClick={(e) => excluir(e, i)} className={dangerButtonClass}>
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {aberto && (
        <section className={cardClass}>
          <h2 className="font-medium">{editandoId ? "Editar item" : "Novo item"}</h2>

          <label className="block text-sm space-y-1">
            <span>Item</span>
            <input
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
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
            <button onClick={salvar} disabled={salvando} className={buttonClass}>
              Salvar
            </button>
            <button onClick={() => setAberto(false)} className={secondaryButtonClass}>
              Cancelar
            </button>
          </div>

          {mensagem && <p className="text-sm text-red-600 dark:text-red-400">{mensagem}</p>}
        </section>
      )}
    </main>
  );
}
