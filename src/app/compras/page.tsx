"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AvaliacaoFornecedor, AvaliacaoNota, SituacaoCompra } from "@/lib/supabase/types";
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
import { Pagination } from "@/components/Pagination";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";

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

const NOTA_LABEL: Record<AvaliacaoNota, string> = {
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
};

const ASPECTOS_AVALIACAO: { campo: keyof FormAvaliacao; label: string }[] = [
  { campo: "prazo_entrega", label: "Prazo de entrega" },
  { campo: "prazo_pagamento", label: "Prazo de pagamento" },
  { campo: "preco", label: "Preço" },
  { campo: "qualidade_produto", label: "Qualidade do produto" },
  { campo: "portfolio", label: "Portfólio" },
];

interface FormAvaliacao {
  prazo_entrega: AvaliacaoNota | null;
  prazo_pagamento: AvaliacaoNota | null;
  preco: AvaliacaoNota | null;
  qualidade_produto: AvaliacaoNota | null;
  portfolio: AvaliacaoNota | null;
  comentario: string;
}

const FORM_AVALIACAO_VAZIO: FormAvaliacao = {
  prazo_entrega: null,
  prazo_pagamento: null,
  preco: null,
  qualidade_produto: null,
  portfolio: null,
  comentario: "",
};

function SeletorNota({
  valor,
  onChange,
}: {
  valor: AvaliacaoNota | null;
  onChange: (v: AvaliacaoNota) => void;
}) {
  const opcoes: AvaliacaoNota[] = ["bom", "regular", "ruim"];
  return (
    <div className="flex gap-2">
      {opcoes.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={valor === o ? buttonClass : secondaryButtonClass}
        >
          {NOTA_LABEL[o]}
        </button>
      ))}
    </div>
  );
}

interface CompraLista {
  id: string;
  numero_pedido: number;
  comprador_id: string | null;
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
  cotacoes: { fornecedor_id: string; fornecedores: { fornecedor: string } | null } | null;
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
  const { loading, isComprador, isAprovador, isAdmin, compradorId } = useAuth();
  const [selecionada, setSelecionada] = useState<CompraLista | null>(null);
  const [notaFiscal, setNotaFiscal] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);
  const [codigoJaAberto, setCodigoJaAberto] = useState(false);

  const [avaliacao, setAvaliacao] = useState<AvaliacaoFornecedor | null>(null);
  const [carregandoAvaliacao, setCarregandoAvaliacao] = useState(false);
  const [formAvaliacao, setFormAvaliacao] = useState<FormAvaliacao>(FORM_AVALIACAO_VAZIO);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [mensagemAvaliacao, setMensagemAvaliacao] = useState<MensagemState | null>(null);

  const temAcesso = isComprador || isAprovador || isAdmin;

  const {
    dados: lista,
    total,
    totalPaginas,
    pagina,
    itensPorPagina,
    carregando,
    irParaPagina,
    mudarItensPorPagina,
    recarregar,
  } = usePaginatedQuery<CompraLista>({
    habilitado: temAcesso,
    ordenarPor: "numero_pedido",
    ascendente: false,
    montarConsulta: () =>
      supabase
        .from("compras")
        .select(
          "id, numero_pedido, comprador_id, valor_orcado, valor_pago, valor_contraproposta, data_compra, data_recebimento, nota_fiscal, situacao, solicitacoes(codigo, data_aprovacao, itens(item), unidades(nome)), cotacoes(fornecedor_id, fornecedores(fornecedor))",
          { count: "exact" }
        ),
  });

  function selecionar(c: CompraLista) {
    setSelecionada(c);
    setMensagem(null);
    setNotaFiscal(c.nota_fiscal ?? "");
    setDataRecebimento(new Date().toISOString().slice(0, 10));

    setAvaliacao(null);
    setFormAvaliacao(FORM_AVALIACAO_VAZIO);
    setMensagemAvaliacao(null);
    if (c.situacao === "recebido") {
      setCarregandoAvaliacao(true);
      supabase
        .from("avaliacoes_fornecedor")
        .select("*")
        .eq("compra_id", c.id)
        .maybeSingle()
        .then(({ data }) => {
          setAvaliacao((data as AvaliacaoFornecedor | null) ?? null);
          setCarregandoAvaliacao(false);
        });
    }
  }

  async function enviarAvaliacao() {
    if (!selecionada || !compradorId || !selecionada.cotacoes) return;
    const { prazo_entrega, prazo_pagamento, preco, qualidade_produto, portfolio, comentario } = formAvaliacao;
    if (!prazo_entrega || !prazo_pagamento || !preco || !qualidade_produto || !portfolio) {
      setMensagemAvaliacao({ tipo: "erro", texto: "Avalie todos os aspectos antes de enviar." });
      return;
    }

    setEnviandoAvaliacao(true);
    setMensagemAvaliacao(null);
    try {
      const { data, error } = await supabase
        .from("avaliacoes_fornecedor")
        .insert({
          compra_id: selecionada.id,
          fornecedor_id: selecionada.cotacoes.fornecedor_id,
          comprador_id: compradorId,
          prazo_entrega,
          prazo_pagamento,
          preco,
          qualidade_produto,
          portfolio,
          comentario: comentario.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      setAvaliacao(data as AvaliacaoFornecedor);
    } catch (e) {
      setMensagemAvaliacao({ tipo: "erro", texto: "Erro ao enviar avaliação: " + (e as Error).message });
    } finally {
      setEnviandoAvaliacao(false);
    }
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
      recarregar();
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
      recarregar();
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

          {carregando ? (
            <p className="text-sm text-zinc-500">Carregando...</p>
          ) : lista.length === 0 ? (
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

          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            itensPorPagina={itensPorPagina}
            onMudarPagina={irParaPagina}
            onMudarItensPorPagina={mudarItensPorPagina}
          />

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

              {selecionada.situacao === "recebido" && !carregandoAvaliacao && (
                <div className="space-y-3 border-t border-hairline pt-4">
                  {avaliacao ? (
                    <>
                      <h3 className="text-sm font-medium">Avaliação do fornecedor</h3>
                      {ASPECTOS_AVALIACAO.map(({ campo, label }) => (
                        <p key={campo} className="text-sm">
                          <span className="text-muted">{label}:</span> {NOTA_LABEL[avaliacao[campo] as AvaliacaoNota]}
                        </p>
                      ))}
                      {avaliacao.comentario && (
                        <p className="text-sm">
                          <span className="text-muted">Comentário:</span> {avaliacao.comentario}
                        </p>
                      )}
                    </>
                  ) : (
                    compradorId != null &&
                    compradorId === selecionada.comprador_id && (
                      <>
                        <h3 className="text-sm font-medium">Avaliar fornecedor</h3>
                        {ASPECTOS_AVALIACAO.map(({ campo, label }) => (
                          // Nao e' <label>: envolveria 3 botoes ao mesmo tempo, o que
                          // e' semanticamente invalido (label so' associa 1 controle) e
                          // atrapalha o calculo de nome acessivel de cada botao.
                          <div key={campo} className="block text-sm space-y-1">
                            <span>{label}</span>
                            <SeletorNota
                              valor={formAvaliacao[campo] as AvaliacaoNota | null}
                              onChange={(v) => setFormAvaliacao({ ...formAvaliacao, [campo]: v })}
                            />
                          </div>
                        ))}
                        <label className="block text-sm space-y-1">
                          <span>Comentário (opcional)</span>
                          <textarea
                            value={formAvaliacao.comentario}
                            onChange={(e) => setFormAvaliacao({ ...formAvaliacao, comentario: e.target.value })}
                            className={inputClass}
                            rows={3}
                          />
                        </label>
                        <button onClick={enviarAvaliacao} disabled={enviandoAvaliacao} className={buttonClass}>
                          {enviandoAvaliacao ? "Enviando..." : "Enviar avaliação"}
                        </button>
                        <MensagemInline mensagem={mensagemAvaliacao} />
                      </>
                    )
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </PageContainer>
  );
}
