"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Unidade } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, dangerButtonClass, cardClass, tableClass, theadRowClass, tbodyRowClass } from "@/components/ui";
import { Badge } from "@/components/Badge";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";
import { PageContainer } from "@/components/PageContainer";
import { Pagination } from "@/components/Pagination";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";

interface ErroSupabase {
  code?: string;
  message?: string;
}

const FORM_VAZIO = {
  codigo: "",
  nome: "",
};

function UnidadeStatusBadge({ ativo }: { ativo: boolean }) {
  return <Badge tone={ativo ? "green" : "gray"}>{ativo ? "Ativa" : "Inativa"}</Badge>;
}

export default function UnidadesPage() {
  const { isAdmin } = useAuth();
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
  } = usePaginatedQuery<Unidade>({
    ordenarPor: "nome",
    ascendente: true,
    dependencias: [busca],
    montarConsulta: () => {
      let query = supabase.from("unidades").select("*", { count: "exact" });
      if (busca.trim()) {
        query = query.or(`nome.ilike.%${busca}%,codigo.ilike.%${busca}%`);
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

  function abrirEdicao(u: Unidade) {
    setEditandoId(u.id);
    setForm({ codigo: u.codigo, nome: u.nome });
    setMensagem(null);
    setAberto(true);
  }

  function mensagemDeErro(e: ErroSupabase): string {
    if (e.code === "42501") {
      return "Você não tem permissão para esta ação.";
    }
    if (e.code === "23505") {
      return "Já existe uma unidade com este código.";
    }
    if (e.code === "23503") {
      return "Esta unidade já foi usada em uma ou mais solicitações e não pode ser excluída, para preservar o histórico de compras.";
    }
    return e.message ?? "Erro desconhecido.";
  }

  async function alternarAtivo(e: React.MouseEvent, u: Unidade) {
    e.stopPropagation();
    setMensagem(null);
    const { error } = await supabase.from("unidades").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(error) });
      return;
    }
    setMensagem({
      tipo: "sucesso",
      texto: `Unidade "${u.nome}" marcada como ${!u.ativo ? "ativa" : "inativa"}.`,
    });
    recarregar();
  }

  async function excluir(e: React.MouseEvent, u: Unidade) {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir "${u.nome}"?`)) return;
    setMensagem(null);
    const { error } = await supabase.from("unidades").delete().eq("id", u.id);
    if (error) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(error) });
      return;
    }
    setMensagem({ tipo: "sucesso", texto: `Unidade "${u.nome}" excluída com sucesso.` });
    recarregar();
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.nome.trim()) {
      setMensagem({ tipo: "erro", texto: "Código e nome da unidade são obrigatórios." });
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      const payload = { codigo: form.codigo.trim(), nome: form.nome.trim() };

      const { error } = editandoId
        ? await supabase.from("unidades").update(payload).eq("id", editandoId)
        : await supabase.from("unidades").insert(payload);
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
        <h1 className="text-2xl font-semibold">Unidades</h1>
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
        <p className="text-sm text-zinc-500">Nenhuma unidade encontrada.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr className={theadRowClass}>
              <th>Código</th>
              <th>Nome</th>
              <th>Status</th>
              <th></th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr
                key={u.id}
                onClick={() => abrirEdicao(u)}
                className={`${tbodyRowClass} cursor-pointer`}
              >
                <td>{u.codigo}</td>
                <td>{u.nome}</td>
                <td>
                  <UnidadeStatusBadge ativo={u.ativo} />
                </td>
                <td>
                  <button onClick={(e) => alternarAtivo(e, u)} className={secondaryButtonClass}>
                    {u.ativo ? "Desativar" : "Ativar"}
                  </button>
                </td>
                {isAdmin && (
                  <td>
                    <button onClick={(e) => excluir(e, u)} className={dangerButtonClass}>
                      Excluir
                    </button>
                  </td>
                )}
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
          <h2 className="font-medium">{editandoId ? "Editar unidade" : "Nova unidade"}</h2>

          <label className="block text-sm space-y-1">
            <span>Código</span>
            <input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block text-sm space-y-1">
            <span>Nome</span>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
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
    </PageContainer>
  );
}
