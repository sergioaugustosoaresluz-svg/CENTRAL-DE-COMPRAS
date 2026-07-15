"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Fornecedor } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, dangerButtonClass, cardClass } from "@/components/ui";

interface ErroSupabase {
  code?: string;
  message?: string;
}

const FORM_VAZIO = {
  codigo: "",
  fornecedor: "",
  contato: "",
  telefone: "",
  email: "",
  uf: "",
};

export default function FornecedoresPage() {
  const { isAdmin } = useAuth();
  const [lista, setLista] = useState<Fornecedor[]>([]);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  async function carregar() {
    let query = supabase.from("fornecedores").select("*").order("fornecedor");
    if (busca.trim()) {
      query = query.or(`fornecedor.ilike.%${busca}%,codigo.ilike.%${busca}%`);
    }
    const { data } = await query;
    setLista((data as Fornecedor[]) ?? []);
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setMensagem(null);
    setAberto(true);
  }

  function abrirEdicao(f: Fornecedor) {
    setEditandoId(f.id);
    setForm({
      codigo: f.codigo,
      fornecedor: f.fornecedor,
      contato: f.contato ?? "",
      telefone: f.telefone ?? "",
      email: f.email ?? "",
      uf: f.uf ?? "",
    });
    setMensagem(null);
    setAberto(true);
  }

  function mensagemDeErro(e: ErroSupabase): string {
    if (e.code === "42501") {
      return "Você não tem permissão para esta ação.";
    }
    if (e.code === "23505") {
      return "Já existe um fornecedor com este código.";
    }
    if (e.code === "23503") {
      return "Este fornecedor já foi usado em uma ou mais cotações e não pode ser excluído, para preservar o histórico de compras.";
    }
    return e.message ?? "Erro desconhecido.";
  }

  async function excluir(e: React.MouseEvent, f: Fornecedor) {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir "${f.fornecedor}"?`)) return;
    setMensagem(null);
    const { error } = await supabase.from("fornecedores").delete().eq("id", f.id);
    if (error) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(error) });
      return;
    }
    setMensagem({ tipo: "sucesso", texto: `Fornecedor "${f.fornecedor}" excluído com sucesso.` });
    carregar();
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.fornecedor.trim()) {
      setMensagem({ tipo: "erro", texto: "Código e nome do fornecedor são obrigatórios." });
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        fornecedor: form.fornecedor.trim(),
        contato: form.contato.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        uf: form.uf.trim() || null,
      };

      const { error } = editandoId
        ? await supabase.from("fornecedores").update(payload).eq("id", editandoId)
        : await supabase.from("fornecedores").insert(payload);
      if (error) throw error;

      setAberto(false);
      carregar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(e as ErroSupabase) });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fornecedores</h1>
        <button onClick={abrirNovo} className={buttonClass}>
          Novo cadastro
        </button>
      </div>

      {mensagem && (
        <p
          className={`text-sm ${
            mensagem.tipo === "erro"
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {mensagem.texto}
        </p>
      )}

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou código..."
        className={inputClass}
      />

      {lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum fornecedor encontrado.</p>
      ) : (
        <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th>Código</th>
              <th>Fornecedor</th>
              <th>Contato</th>
              <th>UF</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr
                key={f.id}
                onClick={() => abrirEdicao(f)}
                className="border-b border-zinc-100 dark:border-zinc-900 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <td>{f.codigo}</td>
                <td>{f.fornecedor}</td>
                <td>{f.contato ?? f.email ?? f.telefone ?? "-"}</td>
                <td>{f.uf ?? "-"}</td>
                {isAdmin && (
                  <td>
                    <button onClick={(e) => excluir(e, f)} className={dangerButtonClass}>
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
          <h2 className="font-medium">{editandoId ? "Editar fornecedor" : "Novo fornecedor"}</h2>

          <label className="block text-sm space-y-1">
            <span>Código</span>
            <input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Fornecedor</span>
            <input
              value={form.fornecedor}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Contato</span>
            <input
              value={form.contato}
              onChange={(e) => setForm({ ...form, contato: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Telefone</span>
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>UF</span>
            <input
              value={form.uf}
              onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
              maxLength={2}
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
        </section>
      )}
    </main>
  );
}
