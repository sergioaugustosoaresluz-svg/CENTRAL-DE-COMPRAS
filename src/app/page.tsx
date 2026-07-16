"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { cardClass } from "@/components/ui";
import { PageContainer } from "@/components/PageContainer";

interface SolicitacaoFarolRow {
  id: string;
  codigo: string;
  created_at: string;
  updated_at: string;
  itens: { item: string } | null;
}

interface CompraFarolRow {
  id: string;
  created_at: string;
  solicitacoes: { codigo: string; itens: { item: string } | null } | null;
}

interface ItemFarol {
  id: string;
  codigo: string;
  itemNome: string;
  dataReferencia: string;
  modo?: "comprador" | "aprovador";
}

function mapSolicitacaoRows(
  data: SolicitacaoFarolRow[] | null,
  modo?: "comprador" | "aprovador"
): ItemFarol[] {
  return (data ?? []).map((r) => ({
    id: r.id,
    codigo: r.codigo,
    itemNome: r.itens?.item ?? "-",
    dataReferencia: r.updated_at,
    modo,
  }));
}

function mapCompraRows(data: CompraFarolRow[] | null): ItemFarol[] {
  return (data ?? []).map((r) => ({
    id: r.id,
    codigo: r.solicitacoes?.codigo ?? "-",
    itemNome: r.solicitacoes?.itens?.item ?? "-",
    dataReferencia: r.created_at,
  }));
}

function diasDesde(dataISO: string): number {
  const ms = Date.now() - new Date(dataISO).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function corFarol(itens: ItemFarol[]): "verde" | "amarelo" | "vermelho" {
  if (itens.length === 0) return "verde";
  return itens.some((i) => diasDesde(i.dataReferencia) > 3) ? "vermelho" : "amarelo";
}

const FAROL_CLASSES: Record<"verde" | "amarelo" | "vermelho", string> = {
  verde: "bg-green-500",
  amarelo: "bg-amber-500",
  vermelho: "bg-red-500",
};

function CardFarol({
  titulo,
  itens,
  hrefItem,
  hrefTodas,
}: {
  titulo: string;
  itens: ItemFarol[];
  hrefItem: (item: ItemFarol) => string;
  hrefTodas: string;
}) {
  const cor = corFarol(itens);
  const topo = itens.slice(0, 5);

  return (
    <div className={`${cardClass} flex flex-col`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${FAROL_CLASSES[cor]}`} />
          <h2 className="font-medium">{titulo}</h2>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{itens.length}</span>
      </div>

      {topo.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma pendência.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {topo.map((i) => (
            <li key={i.id}>
              <Link
                href={hrefItem(i)}
                className="flex items-center justify-between gap-2 hover:text-primary hover:underline"
              >
                <span className="truncate">
                  {i.codigo} — {i.itemNome}
                </span>
                <span className="whitespace-nowrap text-xs text-muted">
                  {diasDesde(i.dataReferencia) === 0 ? "hoje" : `há ${diasDesde(i.dataReferencia)}d`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={hrefTodas} className="mt-auto pt-3 text-sm text-primary hover:underline">
        Ver todas →
      </Link>
    </div>
  );
}

export default function Home() {
  const { loading, isSolicitante, isComprador, isAprovador, isAdmin, solicitanteId } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [solModo, setSolModo] = useState<"comprador" | "solicitante" | null>(null);
  const [solItens, setSolItens] = useState<ItemFarol[]>([]);
  const [cotItens, setCotItens] = useState<ItemFarol[]>([]);
  const [compraItens, setCompraItens] = useState<ItemFarol[]>([]);

  const mostrarSolicitacao = isComprador || isAdmin || isSolicitante;
  const mostrarCotacao = isComprador || isAprovador || isAdmin;
  const mostrarCompra = isComprador || isAprovador || isAdmin;

  async function carregarSolicitacaoCard() {
    if (isComprador || isAdmin) {
      const { data } = await supabase
        .from("solicitacoes")
        .select("id, codigo, created_at, updated_at, itens(item)")
        .eq("status", "aguardando_especificacao")
        .order("created_at", { ascending: true });
      setSolModo("comprador");
      setSolItens(mapSolicitacaoRows(data as unknown as SolicitacaoFarolRow[] | null));
      return;
    }
    if (isSolicitante && solicitanteId) {
      const { data } = await supabase
        .from("solicitacoes")
        .select("id, codigo, created_at, updated_at, itens(item)")
        .eq("solicitante_id", solicitanteId)
        .not("status", "in", "(concluida,rejeitada)")
        .order("created_at", { ascending: true });
      setSolModo("solicitante");
      setSolItens(mapSolicitacaoRows(data as unknown as SolicitacaoFarolRow[] | null));
      return;
    }
    setSolModo(null);
    setSolItens([]);
  }

  async function carregarCotacaoCard() {
    const buscas: PromiseLike<ItemFarol[]>[] = [];
    if (isComprador || isAdmin) {
      buscas.push(
        supabase
          .from("solicitacoes")
          .select("id, codigo, created_at, updated_at, itens(item)")
          .in("status", ["aguardando_cotacao", "em_cotacao"])
          .order("created_at", { ascending: true })
          .then(({ data }) =>
            mapSolicitacaoRows(data as unknown as SolicitacaoFarolRow[] | null, "comprador")
          )
      );
    }
    if (isAprovador || isAdmin) {
      buscas.push(
        supabase
          .from("solicitacoes")
          .select("id, codigo, created_at, updated_at, itens(item)")
          .eq("status", "aguardando_aprovacao")
          .order("created_at", { ascending: true })
          .then(({ data }) =>
            mapSolicitacaoRows(data as unknown as SolicitacaoFarolRow[] | null, "aprovador")
          )
      );
    }
    if (buscas.length === 0) {
      setCotItens([]);
      return;
    }
    const resultados = await Promise.all(buscas);
    const combinado = resultados.flat();
    const dedup = Array.from(new Map(combinado.map((i) => [i.id, i])).values());
    dedup.sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia));
    setCotItens(dedup);
  }

  async function carregarCompraCard() {
    if (!(isComprador || isAprovador || isAdmin)) {
      setCompraItens([]);
      return;
    }
    const { data } = await supabase
      .from("compras")
      .select("id, created_at, solicitacoes(codigo, itens(item))")
      .eq("situacao", "aguardando_entrega")
      .order("created_at", { ascending: true });
    setCompraItens(mapCompraRows(data as unknown as CompraFarolRow[] | null));
  }

  useEffect(() => {
    if (loading) return;
    Promise.resolve().then(() => {
      Promise.all([carregarSolicitacaoCard(), carregarCotacaoCard(), carregarCompraCard()]).then(() =>
        setCarregando(false)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isSolicitante, isComprador, isAprovador, isAdmin, solicitanteId]);

  if (loading) return null;

  const hrefTodasCotacao = isComprador || isAdmin ? "/cotacao?aba=comprador" : "/cotacao?aba=aprovador";

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Central de Compras</h1>

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : !mostrarSolicitacao && !mostrarCotacao && !mostrarCompra ? (
        <p className="text-sm text-zinc-500">Nenhum painel disponível para o seu perfil.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mostrarSolicitacao && (
            <CardFarol
              titulo="Solicitação"
              itens={solItens}
              hrefItem={(i) =>
                solModo === "comprador"
                  ? `/solicitacao?aba=comprador&codigo=${i.codigo}`
                  : `/solicitacao?aba=solicitante&codigo=${i.codigo}`
              }
              hrefTodas={
                solModo === "comprador" ? "/solicitacao?aba=comprador" : "/solicitacao?aba=solicitante"
              }
            />
          )}
          {mostrarCotacao && (
            <CardFarol
              titulo="Cotação"
              itens={cotItens}
              hrefItem={(i) => `/cotacao?aba=${i.modo}&codigo=${i.codigo}`}
              hrefTodas={hrefTodasCotacao}
            />
          )}
          {mostrarCompra && (
            <CardFarol
              titulo="Compra"
              itens={compraItens}
              hrefItem={(i) => `/compras?codigo=${i.codigo}`}
              hrefTodas="/compras"
            />
          )}
        </div>
      )}
    </PageContainer>
  );
}
