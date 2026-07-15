"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Parametro } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, cardClass, tableClass, theadRowClass, tbodyRowClass } from "@/components/ui";

export default function ParametrizacaoPage() {
  const [lista, setLista] = useState<Parametro[]>([]);
  const [editando, setEditando] = useState<Parametro | null>(null);
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase.from("parametros").select("*").order("chave");
    setLista((data as Parametro[]) ?? []);
  }

  function abrirEdicao(p: Parametro) {
    setEditando(p);
    setValor(p.valor);
    setMensagem(null);
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const { error } = await supabase
        .from("parametros")
        .update({ valor, updated_at: new Date().toISOString() })
        .eq("chave", editando.chave);
      if (error) throw error;

      setEditando(null);
      carregar();
    } catch (e) {
      const erro = e as { code?: string; message?: string };
      if (erro.code === "42501") {
        setMensagem("Você não tem permissão para esta ação.");
      } else {
        setMensagem("Erro ao salvar: " + (erro.message ?? "erro desconhecido"));
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Parametrização</h1>

      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
        <strong>Atenção:</strong> alterar a taxa de desconto mensal <strong>não recalcula</strong>{" "}
        cotações já registradas. Cada cotação trava a taxa usada no momento em que foi criada
        (campo <code>taxa_utilizada</code>). A mudança só afeta cotações novas, criadas depois
        da alteração.
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum parâmetro cadastrado.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr className={theadRowClass}>
              <th>Chave</th>
              <th>Valor</th>
              <th>Descrição</th>
              <th>Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr
                key={p.chave}
                onClick={() => abrirEdicao(p)}
                className={`${tbodyRowClass} cursor-pointer`}
              >
                <td>{p.chave}</td>
                <td>{p.valor}</td>
                <td>{p.descricao ?? "-"}</td>
                <td>{new Date(p.updated_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editando && (
        <section className={cardClass}>
          <h2 className="font-medium">Editar {editando.chave}</h2>

          {editando.descricao && (
            <p className="text-sm text-zinc-500">{editando.descricao}</p>
          )}

          <label className="block text-sm space-y-1">
            <span>Valor</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} className={inputClass} />
          </label>

          <div className="flex gap-2">
            <button onClick={salvar} disabled={salvando} className={buttonClass}>
              Salvar
            </button>
            <button onClick={() => setEditando(null)} className={secondaryButtonClass}>
              Cancelar
            </button>
          </div>

          {mensagem && <p className="text-sm text-red-600 dark:text-red-400">{mensagem}</p>}
        </section>
      )}
    </main>
  );
}
