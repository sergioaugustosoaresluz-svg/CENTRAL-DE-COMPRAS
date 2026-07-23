"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SituacaoCompra } from "@/lib/supabase/types";
import {
  inputClass,
  buttonClass,
  secondaryButtonClass,
  dangerButtonClass,
  cardClass,
  tableClass,
  theadRowClass,
  tbodyRowClass,
  formatarDataBR,
  formatarMoeda,
} from "@/components/ui";
import { Badge, type BadgeTone } from "@/components/Badge";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";
import { PageContainer } from "@/components/PageContainer";

interface ErroSupabase {
  code?: string;
  message?: string;
}

const SITUACAO_LABEL: Record<SituacaoCompra, string> = {
  aguardando_entrega: "Aguardando entrega",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

const SITUACAO_TONS: Record<SituacaoCompra, BadgeTone> = {
  aguardando_entrega: "blue",
  recebido: "green",
  cancelado: "red",
};

function SituacaoBadge({ situacao }: { situacao: SituacaoCompra }) {
  return <Badge tone={SITUACAO_TONS[situacao]}>{SITUACAO_LABEL[situacao]}</Badge>;
}

interface CompraLista {
  id: string;
  numero_pedido: number;
  valor_orcado: number | null;
  valor_pago: number | null;
  valor_contraproposta: number | null;
  data_compra: string;
  data_recebimento: string | null;
  nota_fiscal: string | null;
  situacao: SituacaoCompra;
  solicitacoes: {
    codigo: string;
    data_aprovacao: string | null;
    itens: { item: string } | null;
    unidades: { nome: string } | null;
  } | null;
  cotacoes: { fornecedores: { fornecedor: string } | null } | null;
}

function mensagemDeErro(e: ErroSupabase): string {
  if (e.code === "42501") {
    return "Você não tem permissão para esta ação.";
  }
  return e.message ?? "Erro desconhecido.";
}

export default function ComprasPage() {
  return (
    <Suspense fallback={null}>
      <ComprasPageConteudo />
    </Suspense>
  );
}

function ComprasPageConteudo() {
  const searchParams = useSearchParams();
  const codigoFoco = searchParams.get("codigo");
  const { loading, isComprador, isAprovador, isAdmin } = useAuth();
  const [lista, setLista] = useState<CompraLista[]>([]);
  const [selecionada, setSelecionada] = useState<CompraLista | null>(null);
  const [notaFiscal, setNotaFiscal] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);
  const [codigoJaAberto, setCodigoJaAberto] = useState(false);

  const temAcesso = isComprador || isAprovador || isAdmin;

  useEffect(() => {
    if (temAcesso) carregar();
  }, [temAcesso]);

  async function carregar() {
    const { data } = await supabase
      .from("compras")
      .select(
        "id, numero_pedido, valor_orcado, valor_pago, valor_contraproposta, data_compra, data_recebimento, nota_fiscal, situacao, solicitacoes(codigo, data_aprovacao, itens(item), unidades(nome)), cotacoes(fornecedores(fornecedor))"
      )
      .order("numero_pedido", { ascending: false });
    setLista((data as unknown as CompraLista[]) ?? []);
  }

  function selecionar(c: CompraLista) {
    setSelecionada(c);
    setMensagem(null);
    setNotaFiscal(c.nota_fiscal ?? "");
    setDataRecebimento(new Date().toISOString().slice(0, 10));
  }

  useEffect(() => {
    if (!codigoFoco || codigoJaAberto || lista.length === 0) return;
    const alvo = lista.find((c) => c.solicitacoes?.codigo === codigoFoco);
    if (!alvo) return;
    Promise.resolve().then(() => {
      selecionar(alvo);
      setCodigoJaAberto(true);
    });
  }, [lista, codigoFoco, codigoJaAberto]);

  async function registrarRecebimento() {
    if (!selecionada) return;
    setProcessando(true);
    setMensagem(null);
    try {
      const { error } = await supabase
        .from("compras")
        .update({
          situacao: "recebido",
          nota_fiscal: notaFiscal.trim() || null,
          data_recebimento: dataRecebimento,
        })
        .eq("id", selecionada.id);
      if (error) throw error;

      setMensagem({ tipo: "sucesso", texto: `Recebimento do pedido nº ${selecionada.numero_pedido} registrado com sucesso.` });
      setSelecionada(null);
      carregar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(e as ErroSupabase) });
    } finally {
      setProcessando(false);
    }
  }

  async function cancelarPedido() {
    if (!selecionada) return;
    if (!window.confirm(`Tem certeza que deseja cancelar o pedido nº ${selecionada.numero_pedido}?`)) return;
    setProcessando(true);
    setMensagem(null);
    try {
      const { error } = await supabase.from("compras").update({ situacao: "cancelado" }).eq("id", selecionada.id);
      if (error) throw error;

      setMensagem({ tipo: "sucesso", texto: `Pedido nº ${selecionada.numero_pedido} cancelado.` });
      setSelecionada(null);
      carregar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(e as ErroSupabase) });
    } finally {
      setProcessando(false);
    }
  }

  if (loading) return null;

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Compras</h1>

      {!temAcesso ? (
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      ) : (
        <>
          <MensagemInline mensagem={mensagem} />

          {lista.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma compra registrada ainda.</p>
          ) : (
            <table className={tableClass}>
              <thead>
                <tr className={theadRowClass}>
                  <th>Nº Pedido</th>
                  <th>Solicitação</th>
                  <th>Unidade</th>
                  <th>Item</th>
                  <th>Fornecedor</th>
                  <th>Preço final</th>
                  <th>Data de aprovação</th>
                  <th>Data da compra</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className={tbodyRowClass}>
                    <td className="py-2">{c.numero_pedido}</td>
                    <td>{c.solicitacoes?.codigo}</td>
                    <td>{c.solicitacoes?.unidades?.nome ?? "-"}</td>
                    <td>{c.solicitacoes?.itens?.item}</td>
                    <td>{c.cotacoes?.fornecedores?.fornecedor}</td>
                    <td>{formatarMoeda(c.valor_pago)}</td>
                    <td>
                      {c.solicitacoes?.data_aprovacao
                        ? new Date(c.solicitacoes.data_aprovacao).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td>{formatarDataBR(c.data_compra)}</td>
                    <td>
                      <SituacaoBadge situacao={c.situacao} />
                    </td>
                    <td>
                      <button onClick={() => selecionar(c)} className={secondaryButtonClass}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selecionada && (
            <section className={cardClass}>
              <h2 className="font-medium">
                Pedido nº {selecionada.numero_pedido} — {selecionada.solicitacoes?.codigo} —{" "}
                {selecionada.solicitacoes?.itens?.item}
              </h2>
              <p className="text-sm text-muted">
                Unidade: {selecionada.solicitacoes?.unidades?.nome ?? "-"}
              </p>
              <p className="text-sm">
                Fornecedor: {selecionada.cotacoes?.fornecedores?.fornecedor} · Preço final:{" "}
                {formatarMoeda(selecionada.valor_pago)}
              </p>
              <p className="text-sm">
                Valor orçado (preço da cotação vencedora): {formatarMoeda(selecionada.valor_orcado)}
              </p>
              <p className="text-sm">Valor pago: {formatarMoeda(selecionada.valor_pago)}</p>
              {selecionada.valor_contraproposta != null && (
                <p className="text-sm">
                  Valor de contraproposta: {formatarMoeda(selecionada.valor_contraproposta)}
                </p>
              )}
              <p className="text-sm">
                Data de aprovação:{" "}
                {selecionada.solicitacoes?.data_aprovacao
                  ? new Date(selecionada.solicitacoes.data_aprovacao).toLocaleDateString("pt-BR")
                  : "-"}
                {" · "}
                Data da compra: {formatarDataBR(selecionada.data_compra)}
              </p>
              <p className="text-sm">
                Situação atual: <SituacaoBadge situacao={selecionada.situacao} />
              </p>

              {selecionada.situacao === "aguardando_entrega" ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Registrar recebimento</h3>
                  <label className="block text-sm space-y-1">
                    <span>Nota fiscal</span>
                    <input
                      value={notaFiscal}
                      onChange={(e) => setNotaFiscal(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm space-y-1">
                    <span>Data de recebimento</span>
                    <input
                      type="date"
                      value={dataRecebimento}
                      onChange={(e) => setDataRecebimento(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button onClick={registrarRecebimento} disabled={processando} className={buttonClass}>
                      Confirmar recebimento
                    </button>
                    <button onClick={cancelarPedido} disabled={processando} className={dangerButtonClass}>
                      Cancelar pedido
                    </button>
                    <button onClick={() => setSelecionada(null)} className={secondaryButtonClass}>
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {selecionada.situacao === "recebido" && (
                    <>
                      <p className="text-sm">Nota fiscal: {selecionada.nota_fiscal ?? "-"}</p>
                      <p className="text-sm">
                        Recebido em:{" "}
                        {selecionada.data_recebimento
                          ? new Date(selecionada.data_recebimento).toLocaleDateString("pt-BR")
                          : "-"}
                      </p>
                    </>
                  )}
                  <button onClick={() => setSelecionada(null)} className={secondaryButtonClass}>
                    Fechar
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </PageContainer>
  );
}
