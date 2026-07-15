"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  CompraSaving,
  DashboardSavingComprador,
  DashboardSavingItem,
  DashboardGastoFornecedor,
  DashboardGastoUnidade,
  DashboardClassificacaoPreco,
  SituacaoCompra,
  Classificacao,
} from "@/lib/supabase/types";
import { inputClass, cardClass } from "@/components/ui";

function mesAtualDefault() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function inicioEFimDoMes(periodo: string) {
  const [ano, mes] = periodo.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));
  return { inicioISO: inicio.toISOString(), fimISO: fim.toISOString() };
}

function formatarMoeda(v: number | null | undefined) {
  if (v == null) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SITUACAO_LABEL: Record<SituacaoCompra, string> = {
  aguardando_entrega: "Aguardando entrega",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

const CLASSIFICACAO_LABEL: Record<Classificacao, string> = {
  bom_preco: "Bom Preço",
  preco_justo: "Preço Justo",
  preco_caro: "Preço Caro",
};

const CLASSIFICACAO_COR: Record<Classificacao, string> = {
  bom_preco: "bg-green-500",
  preco_justo: "bg-amber-500",
  preco_caro: "bg-red-500",
};

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function BarraSimples({ valor, max, cor = "bg-blue-500" }: { valor: number; max: number; cor?: string }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(valor) / max) * 100) : 0;
  return (
    <div className="h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className={`h-4 rounded-r-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function BarraDivergente({ valor, maxAbs }: { valor: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(valor) / maxAbs) * 100) : 0;
  return (
    <div className="flex items-center h-4">
      <div className="flex-1 flex justify-end">
        {valor < 0 && (
          <div className="h-4 rounded-l-full bg-red-500" style={{ width: `${pct}%` }} />
        )}
      </div>
      <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
      <div className="flex-1">
        {valor >= 0 && (
          <div className="h-4 rounded-r-full bg-green-500" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { loading, isAdmin } = useAuth();
  const [periodo, setPeriodo] = useState(mesAtualDefault());

  const [kpiGastoTotal, setKpiGastoTotal] = useState(0);
  const [kpiSavingTotal, setKpiSavingTotal] = useState(0);
  const [kpiSavingMedioPct, setKpiSavingMedioPct] = useState<number | null>(null);
  const [kpiSituacoes, setKpiSituacoes] = useState<Record<SituacaoCompra, number>>({
    aguardando_entrega: 0,
    recebido: 0,
    cancelado: 0,
  });

  const [savingPorComprador, setSavingPorComprador] = useState<DashboardSavingComprador[]>([]);
  const [savingPorItem, setSavingPorItem] = useState<DashboardSavingItem[]>([]);
  const [gastoPorFornecedor, setGastoPorFornecedor] = useState<DashboardGastoFornecedor[]>([]);
  const [gastoPorUnidade, setGastoPorUnidade] = useState<DashboardGastoUnidade[]>([]);
  const [classificacaoPreco, setClassificacaoPreco] = useState<DashboardClassificacaoPreco[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    if (isAdmin) carregar(periodo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, periodo]);

  async function carregar(periodoSelecionado: string) {
    setCarregandoDados(true);
    const { inicioISO, fimISO } = inicioEFimDoMes(periodoSelecionado);
    const mesFiltroISO = inicioISO;

    const [
      compraSavingRes,
      situacoesRes,
      savingCompradorRes,
      savingItemRes,
      gastoFornecedorRes,
      gastoUnidadeRes,
      classificacaoRes,
    ] = await Promise.all([
      supabase
        .from("compras_saving")
        .select("*")
        .gte("data_recebimento", inicioISO.slice(0, 10))
        .lt("data_recebimento", fimISO.slice(0, 10)),
      supabase
        .from("compras")
        .select("situacao")
        .gte("data_compra", inicioISO.slice(0, 10))
        .lt("data_compra", fimISO.slice(0, 10)),
      supabase
        .from("dashboard_saving_por_comprador")
        .select("*")
        .eq("mes", mesFiltroISO)
        .order("saving_total", { ascending: false }),
      supabase
        .from("dashboard_saving_por_item")
        .select("*")
        .eq("mes", mesFiltroISO)
        .order("saving_total", { ascending: false }),
      supabase
        .from("dashboard_gasto_por_fornecedor")
        .select("*")
        .eq("mes", mesFiltroISO)
        .order("total_gasto", { ascending: false }),
      supabase
        .from("dashboard_gasto_por_unidade")
        .select("*")
        .eq("mes", mesFiltroISO)
        .order("total_gasto", { ascending: false }),
      supabase.from("dashboard_classificacao_preco").select("*").eq("mes", mesFiltroISO),
    ]);

    const savingRows = (compraSavingRes.data as CompraSaving[] | null) ?? [];
    const gastoTotal = savingRows.reduce((acc, r) => acc + (r.valor_pago ?? 0), 0);
    const savingTotal = savingRows.reduce((acc, r) => acc + (r.saving ?? 0), 0);
    const valorOrcadoTotal = savingRows.reduce((acc, r) => acc + (r.valor_orcado ?? 0), 0);
    setKpiGastoTotal(gastoTotal);
    setKpiSavingTotal(savingTotal);
    setKpiSavingMedioPct(valorOrcadoTotal > 0 ? (savingTotal / valorOrcadoTotal) * 100 : null);

    const contagem: Record<SituacaoCompra, number> = { aguardando_entrega: 0, recebido: 0, cancelado: 0 };
    ((situacoesRes.data as { situacao: SituacaoCompra }[] | null) ?? []).forEach((r) => {
      contagem[r.situacao] += 1;
    });
    setKpiSituacoes(contagem);

    setSavingPorComprador((savingCompradorRes.data as DashboardSavingComprador[]) ?? []);
    setSavingPorItem((savingItemRes.data as DashboardSavingItem[]) ?? []);
    setGastoPorFornecedor((gastoFornecedorRes.data as DashboardGastoFornecedor[]) ?? []);
    setGastoPorUnidade((gastoUnidadeRes.data as DashboardGastoUnidade[]) ?? []);
    setClassificacaoPreco((classificacaoRes.data as DashboardClassificacaoPreco[]) ?? []);
    setCarregandoDados(false);
  }

  if (loading) return null;

  if (!isAdmin) {
    return (
      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      </main>
    );
  }

  const maxAbsSavingComprador = Math.max(1, ...savingPorComprador.map((s) => Math.abs(s.saving_total)));
  const maxAbsSavingItem = Math.max(1, ...savingPorItem.map((s) => Math.abs(s.saving_total)));
  const maxGastoFornecedor = Math.max(1, ...gastoPorFornecedor.map((g) => g.total_gasto));
  const maxGastoUnidade = Math.max(1, ...gastoPorUnidade.map((g) => g.total_gasto));

  const totalClassificacao = classificacaoPreco.reduce((acc, c) => acc + c.quantidade, 0);

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <label className="flex items-center gap-2 text-sm">
          <span>Período</span>
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total gasto" value={formatarMoeda(kpiGastoTotal)} />
        <StatTile
          label="Saving total"
          value={formatarMoeda(kpiSavingTotal)}
          sub={kpiSavingTotal < 0 ? "Acima do orçado" : "Abaixo do orçado"}
        />
        <StatTile
          label="Saving médio"
          value={kpiSavingMedioPct != null ? `${kpiSavingMedioPct.toFixed(1)}%` : "-"}
          sub="Sobre o valor orçado"
        />
        <div className={`${cardClass} space-y-1`}>
          <p className="text-sm text-zinc-500">Pedidos por situação</p>
          {(Object.keys(SITUACAO_LABEL) as SituacaoCompra[]).map((s) => (
            <p key={s} className="text-sm flex justify-between gap-2">
              <span>{SITUACAO_LABEL[s]}</span>
              <span className="font-medium tabular-nums">{kpiSituacoes[s]}</span>
            </p>
          ))}
        </div>
      </section>

      {carregandoDados ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <>
          <section className={cardClass}>
            <h2 className="font-medium">Saving por comprador</h2>
            {savingPorComprador.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum dado para o período selecionado.</p>
            ) : (
              <div className="space-y-3">
                {savingPorComprador.map((s) => (
                  <div key={s.comprador_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{s.nome_completo}</span>
                      <span className="tabular-nums">{formatarMoeda(s.saving_total)}</span>
                    </div>
                    <BarraDivergente valor={s.saving_total} maxAbs={maxAbsSavingComprador} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={cardClass}>
            <h2 className="font-medium">Saving por item</h2>
            {savingPorItem.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum dado para o período selecionado.</p>
            ) : (
              <div className="space-y-3">
                {savingPorItem.map((s) => (
                  <div key={s.item_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{s.item}</span>
                      <span className="tabular-nums">{formatarMoeda(s.saving_total)}</span>
                    </div>
                    <BarraDivergente valor={s.saving_total} maxAbs={maxAbsSavingItem} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={cardClass}>
            <h2 className="font-medium">Gasto por fornecedor</h2>
            {gastoPorFornecedor.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum dado para o período selecionado.</p>
            ) : (
              <div className="space-y-3">
                {gastoPorFornecedor.map((g) => (
                  <div key={g.codigo} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{g.fornecedor}</span>
                      <span className="tabular-nums">{formatarMoeda(g.total_gasto)}</span>
                    </div>
                    <BarraSimples valor={g.total_gasto} max={maxGastoFornecedor} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={cardClass}>
            <h2 className="font-medium">Gasto por unidade</h2>
            {gastoPorUnidade.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum dado para o período selecionado.</p>
            ) : (
              <div className="space-y-3">
                {gastoPorUnidade.map((g) => (
                  <div key={g.codigo} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{g.nome}</span>
                      <span className="tabular-nums">{formatarMoeda(g.total_gasto)}</span>
                    </div>
                    <BarraSimples valor={g.total_gasto} max={maxGastoUnidade} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={cardClass}>
            <h2 className="font-medium">Classificação de preço</h2>
            {classificacaoPreco.length === 0 || totalClassificacao === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum dado para o período selecionado.</p>
            ) : (
              <div className="space-y-3">
                <div className="h-6 w-full rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
                  {(["bom_preco", "preco_justo", "preco_caro"] as Classificacao[]).map((c, i) => {
                    const row = classificacaoPreco.find((r) => r.classificacao === c);
                    const qtd = row?.quantidade ?? 0;
                    if (qtd === 0) return null;
                    const pct = (qtd / totalClassificacao) * 100;
                    return (
                      <div
                        key={c}
                        className={`h-6 ${CLASSIFICACAO_COR[c]} ${i > 0 ? "ml-0.5" : ""}`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-4 flex-wrap text-sm">
                  {(["bom_preco", "preco_justo", "preco_caro"] as Classificacao[]).map((c) => {
                    const row = classificacaoPreco.find((r) => r.classificacao === c);
                    return (
                      <span key={c} className="flex items-center gap-1.5">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${CLASSIFICACAO_COR[c]}`} />
                        {CLASSIFICACAO_LABEL[c]}: {row?.quantidade ?? 0}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
