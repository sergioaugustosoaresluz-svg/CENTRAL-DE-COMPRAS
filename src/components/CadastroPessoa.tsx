"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Pessoa } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, cardClass, tableClass, theadRowClass, tbodyRowClass } from "@/components/ui";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";
import { PageContainer } from "@/components/PageContainer";

type TabelaPessoa = "compradores" | "solicitantes" | "aprovadores";

interface Props {
  tabela: TabelaPessoa;
  titulo: string;
}

interface ErroSupabase {
  code?: string;
  message?: string;
}

const FORM_VAZIO = {
  codigo: "",
  nome_completo: "",
  nome_abreviado: "",
  telefone: "",
  email: "",
  funcao: "",
};

export function CadastroPessoa({ tabela, titulo }: Props) {
  const [lista, setLista] = useState<Pessoa[]>([]);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  async function carregar() {
    let query = supabase.from(tabela).select("*").order("nome_completo");
    if (busca.trim()) {
      query = query.or(`nome_completo.ilike.%${busca}%,codigo.ilike.%${busca}%`);
    }
    const { data } = await query;
    setLista((data as Pessoa[]) ?? []);
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setMensagem(null);
    setAberto(true);
  }

  function abrirEdicao(p: Pessoa) {
    setEditandoId(p.id);
    setForm({
      codigo: p.codigo,
      nome_completo: p.nome_completo,
      nome_abreviado: p.nome_abreviado ?? "",
      telefone: p.telefone ?? "",
      email: p.email ?? "",
      funcao: p.funcao ?? "",
    });
    setMensagem(null);
    setAberto(true);
  }

  function mensagemDeErro(e: ErroSupabase): string {
    if (e.code === "42501") {
      return "Você não tem permissão para esta ação.";
    }
    if (e.code === "23505") {
      if (e.message?.includes("codigo")) return "Já existe um cadastro com este código.";
      if (e.message?.includes("email")) return "Já existe um cadastro com este e-mail.";
      return "Já existe um cadastro com esses dados (código ou e-mail duplicado).";
    }
    return e.message ?? "Erro desconhecido.";
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.nome_completo.trim()) {
      setMensagem({ tipo: "erro", texto: "Código e nome completo são obrigatórios." });
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nome_completo: form.nome_completo.trim(),
        nome_abreviado: form.nome_abreviado.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        funcao: form.funcao.trim() || null,
      };

      const { error } = editandoId
        ? await supabase.from(tabela).update(payload).eq("id", editandoId)
        : await supabase.from(tabela).insert(payload);
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
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <button onClick={abrirNovo} className={buttonClass}>
          Novo cadastro
        </button>
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou código..."
        className={inputClass}
      />

      {lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum cadastro encontrado.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr className={theadRowClass}>
              <th>Código</th>
              <th>Nome</th>
              <th>Função</th>
              <th>Contato</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr
                key={p.id}
                onClick={() => abrirEdicao(p)}
                className={`${tbodyRowClass} cursor-pointer`}
              >
                <td>{p.codigo}</td>
                <td>{p.nome_completo}</td>
                <td>{p.funcao ?? "-"}</td>
                <td>{p.email ?? p.telefone ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {aberto && (
        <section className={cardClass}>
          <h2 className="font-medium">{editandoId ? "Editar cadastro" : "Novo cadastro"}</h2>

          <label className="block text-sm space-y-1">
            <span>Código</span>
            <input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Nome completo</span>
            <input
              value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Nome abreviado</span>
            <input
              value={form.nome_abreviado}
              onChange={(e) => setForm({ ...form, nome_abreviado: e.target.value })}
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
            <span>Função</span>
            <input
              value={form.funcao}
              onChange={(e) => setForm({ ...form, funcao: e.target.value })}
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

          <MensagemInline mensagem={mensagem} />
        </section>
      )}
    </PageContainer>
  );
}
