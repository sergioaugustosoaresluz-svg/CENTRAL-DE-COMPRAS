"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Pessoa } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, dangerButtonClass, cardClass, tableClass, theadRowClass, tbodyRowClass } from "@/components/ui";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";
import { PageContainer } from "@/components/PageContainer";
import { Pagination } from "@/components/Pagination";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";

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
  const { user, isAdmin } = useAuth();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);

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
    recarregar,
  } = usePaginatedQuery<Pessoa>({
    ordenarPor: "nome_completo",
    ascendente: true,
    dependencias: [tabela, busca],
    montarConsulta: () => {
      let query = supabase.from(tabela).select("*", { count: "exact" });
      if (busca.trim()) {
        query = query.or(`nome_completo.ilike.%${busca}%,codigo.ilike.%${busca}%`);
      }
      return query;
    },
  });

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
    if (e.code === "23503") {
      return "Esta pessoa já foi usada no sistema e não pode ser excluída.";
    }
    return e.message ?? "Erro desconhecido.";
  }

  async function excluir() {
    if (!editandoId) return;
    const nome = form.nome_completo || "este cadastro";

    // busca o user_id atualizado (nao confia no `lista`/`form` locais, que
    // podem estar desatualizados) so pra bloquear auto-exclusao com seguranca.
    const { data: pessoaAtual } = await supabase
      .from(tabela)
      .select("user_id")
      .eq("id", editandoId)
      .maybeSingle();
    if (pessoaAtual?.user_id && user && pessoaAtual.user_id === user.id) {
      setMensagem({ tipo: "erro", texto: "Você não pode excluir o seu próprio cadastro." });
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
    setMensagem(null);
    // apaga so da tabela especifica (compradores/solicitantes/aprovadores) —
    // uma mesma pessoa pode ter papeis em mais de uma tabela, e os outros
    // papeis nao devem ser afetados.
    const { error } = await supabase.from(tabela).delete().eq("id", editandoId);
    if (error) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(error) });
      return;
    }
    setAberto(false);
    setMensagem({ tipo: "sucesso", texto: `"${nome}" excluído com sucesso.` });
    recarregar();
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
      recarregar();
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

      <MensagemInline mensagem={mensagem} />

      <input
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          resetarPagina();
        }}
        placeholder="Buscar por nome ou código..."
        className={inputClass}
      />

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : lista.length === 0 ? (
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

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        itensPorPagina={itensPorPagina}
        onMudarPagina={irParaPagina}
        onMudarItensPorPagina={mudarItensPorPagina}
      />

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
            {isAdmin && editandoId && (
              <button onClick={excluir} className={dangerButtonClass}>
                Excluir
              </button>
            )}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
