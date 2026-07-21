"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Item, VariacaoMensalItem } from "@/lib/supabase/types";
import {
  inputClass,
  buttonClass,
  secondaryButtonClass,
  cardClass,
  tableClass,
  theadRowClass,
  tbodyRowClass,
  formatarMoeda,
} from "@/components/ui";
import { PageContainer } from "@/components/PageContainer";

type Aba = "precos" | "compras";

interface MesDado {
  mes: number;
  volume_compras: number;
  quantidade_itens: number;
  gasto_total: number;
  orcado_total: number;
  custo_unitario_pago: number;
  custo_unitario_orcado: number;
}

const MESES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function anoAtual() {
  return new Date().getFullYear();
}

function formatarNumero(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default function VariacaoPage() {
  const { loading, isComprador, isAprovador, isAdmin } = useAuth();
  const temAcesso = isComprador || isAprovador || isAdmin;

  const [aba, setAba] = useState<Aba>("precos");
  const [itens, setItens] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [itemDropdownAberto, setItemDropdownAberto] = useState(false);
  const [anos, setAnos] = useState<number[]>([anoAtual()]);
  const [ano, setAno] = useState(anoAtual());
  const [dados, setDados] = useState<VariacaoMensalItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!temAcesso) return;
    supabase
      .from("itens")
      .select("*")
      .order("item")
      .then(({ data }) => setItens(data ?? []));
    supabase
      .from("variacao_mensal_item")
      .select("ano")
      .then(({ data }) => {
        const anosView = ((data as { ano: number }[] | null) ?? []).map((d) => d.ano);
        const todos = Array.from(new Set([...anosView, anoAtual()])).sort((a, b) => b - a);
        setAnos(todos);
      });
  }, [temAcesso]);

  async function carregarDados(itemIdAlvo: string, anoAlvo: number) {
    setCarregando(true);
    const { data } = await supabase
      .from("variacao_mensal_item")
      .select("*")
      .eq("item_id", itemIdAlvo)
      .eq("ano", anoAlvo);
    setDados((data as VariacaoMensalItem[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    if (!temAcesso || !itemId) {
      Promise.resolve().then(() => setDados([]));
      return;
    }
    Promise.resolve().then(() => carregarDados(itemId, ano));
  }, [temAcesso, itemId, ano]);

  const itensFiltrados = itens.filter((i) => i.item.toLowerCase().includes(itemQuery.trim().toLowerCase()));

  const meses = useMemo<MesDado[]>(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const numeroMes = i + 1;
      const linha = dados.find((d) => Number(d.mes) === numeroMes);
      return {
        mes: numeroMes,
        volume_compras: linha?.volume_compras ?? 0,
        quantidade_itens: linha?.quantidade_itens ?? 0,
        gasto_total: linha?.gasto_total ?? 0,
        orcado_total: linha?.orcado_total ?? 0,
        custo_unitario_pago: linha?.custo_unitario_pago ?? 0,
        custo_unitario_orcado: linha?.custo_unitario_orcado ?? 0,
      };
    });
  }, [dados]);

  if (loading) return null;

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Variação</h1>

      {!temAcesso ? (
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      ) : (
        <>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setAba("precos")}
                className={aba === "precos" ? buttonClass : secondaryButtonClass}
              >
                Dos Preços
              </button>
              <button
                onClick={() => setAba("compras")}
                className={aba === "compras" ? buttonClass : secondaryButtonClass}
              >
                Das Compras
              </button>
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              <label className="block text-sm space-y-1">
                <span>Ano</span>
                <select
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  className={inputClass}
                >
                  {anos.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm space-y-1 w-64">
                <span>Produto</span>
                <div className="relative">
                  <input
                    value={itemQuery}
                    onChange={(e) => {
                      setItemQuery(e.target.value);
                      setItemId("");
                      setItemDropdownAberto(true);
                    }}
                    onFocus={() => setItemDropdownAberto(true)}
                    onBlur={() =>
                      setTimeout(() => {
                        setItemDropdownAberto(false);
                        setItemQuery((atual) => {
                          const selecionado = itens.find((i) => i.id === itemId);
                          return selecionado ? selecionado.item : atual.trim() ? "" : atual;
                        });
                      }, 150)
                    }
                    placeholder="Digite para buscar..."
                    className={inputClass}
                  />
                  {itemDropdownAberto && (
                    <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-hairline bg-white shadow-sm dark:bg-surface-muted">
                      {itensFiltrados.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-muted">Nenhum produto encontrado.</li>
                      ) : (
                        itensFiltrados.map((i) => (
                          <li key={i.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setItemId(i.id);
                                setItemQuery(i.item);
                                setItemDropdownAberto(false);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                            >
                              {i.item}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </label>
            </div>
          </div>

          {!itemId ? (
            <p className="text-sm text-zinc-500">Selecione um produto para ver a variação.</p>
          ) : carregando ? (
            <p className="text-sm text-zinc-500">Carregando...</p>
          ) : aba === "precos" ? (
            <AbaPrecos meses={meses} />
          ) : (
            <AbaCompras meses={meses} />
          )}
        </>
      )}
    </PageContainer>
  );
}

function AbaPrecos({ meses }: { meses: MesDado[] }) {
  const gastoValores = meses.map((m) => m.gasto_total);
  const custoValores = meses.map((m) => m.custo_unitario_pago);
  const orcadoValores = meses.map((m) => m.custo_unitario_orcado);

  const gastoTotalAno = gastoValores.reduce((a, b) => a + b, 0);
  const quantidadeTotalAno = meses.reduce((a, m) => a + m.quantidade_itens, 0);
  // Média ponderada pelo volume comprado em cada mês (não a média simples dos
  // 12 custos unitários), para não distorcer o total quando meses com pouco
  // volume têm um custo unitário muito diferente dos meses de maior volume.
  const custoMedioPonderado = quantidadeTotalAno > 0 ? gastoTotalAno / quantidadeTotalAno : 0;

  return (
    <div className="space-y-6">
      <TabelaAnual
        linhas={[
          { label: "Custo do Produto", valores: custoValores, total: custoMedioPonderado, formatar: formatarMoeda },
          { label: "Gasto com a Compra", valores: gastoValores, total: gastoTotalAno, formatar: formatarMoeda },
        ]}
      />

      <GraficoLinha
        titulo="Custo do Produto"
        formatar={formatarMoeda}
        series={[
          { nome: "Pago", valores: custoValores, corClasse: "text-blue-600 dark:text-blue-400" },
          { nome: "Orçado", valores: orcadoValores, corClasse: "text-zinc-400 dark:text-zinc-500", tracejada: true },
        ]}
      />

      <GraficoLinha
        titulo="Gasto com a Compra"
        formatar={formatarMoeda}
        series={[{ nome: "Gasto", valores: gastoValores, corClasse: "text-primary" }]}
      />
    </div>
  );
}

function AbaCompras({ meses }: { meses: MesDado[] }) {
  const volumeValores = meses.map((m) => m.volume_compras);
  const quantidadeValores = meses.map((m) => m.quantidade_itens);

  return (
    <div className="space-y-6">
      <TabelaAnual
        linhas={[
          {
            label: "Volume de Compras",
            valores: volumeValores,
            total: volumeValores.reduce((a, b) => a + b, 0),
            formatar: formatarNumero,
          },
          {
            label: "Quantidade de itens",
            valores: quantidadeValores,
            total: quantidadeValores.reduce((a, b) => a + b, 0),
            formatar: formatarNumero,
          },
        ]}
      />

      <GraficoLinha
        titulo="Volume de Compras"
        formatar={formatarNumero}
        series={[{ nome: "Volume", valores: volumeValores, corClasse: "text-primary" }]}
      />
      <GraficoLinha
        titulo="Quantidade de itens"
        formatar={formatarNumero}
        series={[{ nome: "Quantidade", valores: quantidadeValores, corClasse: "text-primary" }]}
      />
    </div>
  );
}

function TabelaAnual({
  linhas,
}: {
  linhas: { label: string; valores: number[]; total: number; formatar: (v: number) => string }[];
}) {
  return (
    <table className={tableClass}>
      <thead>
        <tr className={theadRowClass}>
          <th></th>
          {MESES_LABEL.map((m) => (
            <th key={m}>{m}</th>
          ))}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => {
          const max = Math.max(...linha.valores);
          return (
            <tr key={linha.label} className={tbodyRowClass}>
              <td className="py-2 font-medium">{linha.label}</td>
              {linha.valores.map((v, i) => (
                <td
                  key={i}
                  className={max > 0 && v === max ? "bg-red-100 font-medium dark:bg-red-900/30" : ""}
                  data-linha={linha.label}
                  data-mes={i + 1}
                  data-valor={v}
                >
                  {linha.formatar(v)}
                </td>
              ))}
              <td className="font-medium">{linha.formatar(linha.total)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GraficoLinha({
  titulo,
  series,
  formatar,
}: {
  titulo: string;
  series: { nome: string; valores: number[]; corClasse: string; tracejada?: boolean }[];
  formatar: (v: number) => string;
}) {
  const largura = 720;
  const altura = 220;
  const margemEsq = 16;
  const margemDir = 16;
  const margemTopo = 16;
  const margemBaixo = 24;
  const areaLargura = largura - margemEsq - margemDir;
  const areaAltura = altura - margemTopo - margemBaixo;

  const todosValores = series.flatMap((s) => s.valores);
  const valorMax = Math.max(1, ...todosValores);
  const valorMin = Math.min(0, ...todosValores);
  const range = valorMax - valorMin || 1;

  function x(i: number) {
    return margemEsq + (areaLargura * i) / 11;
  }
  function y(v: number) {
    return margemTopo + areaAltura - ((v - valorMin) / range) * areaAltura;
  }

  return (
    <div className={cardClass}>
      <h3 className="font-medium">{titulo}</h3>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="h-auto w-full" role="img" aria-label={titulo}>
        <line
          x1={margemEsq}
          y1={y(0)}
          x2={largura - margemDir}
          y2={y(0)}
          className="stroke-hairline"
          strokeWidth={1}
        />
        {MESES_LABEL.map((m, i) => (
          <text key={m} x={x(i)} y={altura - 6} textAnchor="middle" className="fill-muted" fontSize={10}>
            {m}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.nome} className={s.corClasse}>
            <polyline
              points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray={s.tracejada ? "6 4" : undefined}
            />
            {s.valores.map((v, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={3}
                fill="currentColor"
                data-serie={s.nome}
                data-mes={i + 1}
                data-valor={v}
              >
                <title>{`${MESES_LABEL[i]}: ${formatar(v)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-4 text-sm">
          {series.map((s) => (
            <span key={s.nome} className={`flex items-center gap-1.5 ${s.corClasse}`}>
              <span className="inline-block h-0.5 w-3 bg-current" />
              {s.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
