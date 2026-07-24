"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Fornecedor, FornecedorAvaliacaoResumo } from "@/lib/supabase/types";
import { inputClass, buttonClass, secondaryButtonClass, dangerButtonClass, cardClass, tableClass, theadRowClass, tbodyRowClass } from "@/components/ui";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";
import { PageContainer } from "@/components/PageContainer";
import { Pagination } from "@/components/Pagination";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { SeloAvaliacao, notaPorScore, NOTA_LABEL, NOTA_COR_BARRA } from "@/components/SeloAvaliacao";

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

const ASPECTOS_RESUMO: { campo: keyof FornecedorAvaliacaoResumo; label: string }[] = [
  { campo: "score_prazo_entrega", label: "Prazo de entrega" },
  { campo: "score_prazo_pagamento", label: "Prazo de pagamento" },
  { campo: "score_preco", label: "Preço" },
  { campo: "score_qualidade", label: "Qualidade do produto" },
  { campo: "score_portfolio", label: "Portfólio" },
];

function BarraAvaliacaoAspecto({ label, score }: { label: string; score: number }) {
  const nota = notaPorScore(score);
  const pct = Math.round(((score + 1) / 2) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-44 shrink-0 text-muted">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-2.5 rounded-full ${NOTA_COR_BARRA[nota]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0">{NOTA_LABEL[nota]}</span>
    </div>
  );
}

export default function FornecedoresPage() {
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
  } = usePaginatedQuery<Fornecedor>({
    ordenarPor: "fornecedor",
    ascendente: true,
    dependencias: [busca],
    montarConsulta: () => {
      let query = supabase.from("fornecedores").select("*", { count: "exact" });
      if (busca.trim()) {
        query = query.or(`fornecedor.ilike.%${busca}%,codigo.ilike.%${busca}%`);
      }
      return query;
    },
  });

  const [resumos, setResumos] = useState<Record<string, FornecedorAvaliacaoResumo>>({});

  useEffect(() => {
    if (lista.length === 0) return;
    Promise.resolve().then(async () => {
      const { data } = await supabase
        .from("fornecedores_avaliacao_resumo")
        .select("*")
        .in(
          "fornecedor_id",
          lista.map((f) => f.id)
        );
      const map: Record<string, FornecedorAvaliacaoResumo> = {};
      ((data as FornecedorAvaliacaoResumo[] | null) ?? []).forEach((r) => {
        map[r.fornecedor_id] = r;
      });
      setResumos((prev) => ({ ...prev, ...map }));
    });
  }, [lista]);

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
    recarregar();
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
        <h1 className="text-2xl font-semibold">Fornecedores</h1>
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
        <p className="text-sm text-zinc-500">Nenhum fornecedor encontrado.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr className={theadRowClass}>
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
                className={`${tbodyRowClass} cursor-pointer`}
              >
                <td>{f.codigo}</td>
                <td>
                  <span className="inline-flex items-center gap-2">
                    {f.fornecedor}
                    {resumos[f.id] && <SeloAvaliacao classificacao={resumos[f.id].classificacao} />}
                  </span>
                </td>
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
          <h2 className="font-medium">{editandoId ? "Editar fornecedor" : "Novo fornecedor"}</h2>

          {editandoId && resumos[editandoId] && (
            <div className="space-y-3 rounded-md border border-hairline bg-surface-muted p-3">
              <div className="flex items-center gap-2">
                <SeloAvaliacao classificacao={resumos[editandoId].classificacao} />
                <span className="text-xs text-muted">
                  Baseado em {resumos[editandoId].total_avaliacoes} avaliaç
                  {resumos[editandoId].total_avaliacoes === 1 ? "ão" : "ões"}
                </span>
              </div>
              <div className="space-y-2">
                {ASPECTOS_RESUMO.map(({ campo, label }) => (
                  <BarraAvaliacaoAspecto
                    key={campo}
                    label={label}
                    score={resumos[editandoId][campo] as number}
                  />
                ))}
              </div>
            </div>
          )}

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
    </PageContainer>
  );
}
