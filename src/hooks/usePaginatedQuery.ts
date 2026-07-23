"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const ITENS_POR_PAGINA_PADRAO = 20;
export const ITENS_POR_PAGINA_OPCOES = [20, 50, 100] as const;

// Formato minimo que qualquer query builder do Supabase satisfaz depois de
// `.select(..., { count: "exact" })` + filtros: falta so encadear order/range.
// Nao e generico em T de proposito: o Supabase infere relacoes embutidas
// (ex: "itens(item)") como array mesmo quando o app trata como objeto unico,
// entao toda tela do projeto ja faz `as unknown as X[]` no retorno — o hook
// absorve esse cast uma unica vez, em vez de forcar isso em cada tela.
interface ConsultaOrdenavel {
  order: (
    coluna: string,
    opcoes?: { ascending?: boolean }
  ) => {
    range: (de: number, ate: number) => PromiseLike<{ data: unknown; count: number | null }>;
  };
}

interface UsePaginatedQueryOptions {
  // Monta a query ja com .select(..., { count: "exact" }) e os filtros
  // aplicados, mas SEM .order()/.range() — isso quem encadeia e o hook.
  montarConsulta: () => ConsultaOrdenavel;
  ordenarPor: string;
  ascendente?: boolean;
  // false enquanto uma pre-condicao (ex: papel do usuario) nao esta pronta.
  habilitado?: boolean;
  // valores de filtro externos: mudar qualquer um deles dispara novo fetch.
  dependencias?: unknown[];
}

function lerPaginaDaUrl(): number {
  if (typeof window === "undefined") return 1;
  return Math.max(1, Number(new URLSearchParams(window.location.search).get("page")) || 1);
}

// A pagina fica na query string (?page=N) via History API nativa
// (pushState/popstate), em vez do router do Next: em producao,
// router.push() para remover ?page depois de um reload as vezes nao
// atualiza a URL de verdade (bug de cache do router do App Router
// reproduzido durante os testes) — a History API nao tem essa instabilidade
// e nao exige <Suspense> ao redor de quem usa o hook.
export function usePaginatedQuery<T>({
  montarConsulta,
  ordenarPor,
  ascendente = false,
  habilitado = true,
  dependencias = [],
}: UsePaginatedQueryOptions) {
  const [pagina, setPagina] = useState(lerPaginaDaUrl);
  const [itensPorPagina, setItensPorPagina] = useState(ITENS_POR_PAGINA_PADRAO);

  const [dados, setDados] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [versao, setVersao] = useState(0);

  // Trocar filtro dispara duas renderizacoes em sequencia rapida: uma ainda
  // com a pagina antiga (antes do reset terminar) e outra ja com a pagina 1.
  // As duas viram fetch — sem essa guarda, se a resposta da requisicao
  // desatualizada chegar depois da correta, ela sobrescreve o resultado
  // certo com dados da pagina/filtro errados.
  const requisicaoAtualRef = useRef(0);

  useEffect(() => {
    function aoNavegarHistorico() {
      setPagina(lerPaginaDaUrl());
    }
    window.addEventListener("popstate", aoNavegarHistorico);
    return () => window.removeEventListener("popstate", aoNavegarHistorico);
  }, []);

  const irParaPagina = useCallback((novaPagina: number) => {
    const paginaFinal = Math.max(1, novaPagina);
    const params = new URLSearchParams(window.location.search);
    if (paginaFinal <= 1) params.delete("page");
    else params.set("page", String(paginaFinal));
    const query = params.toString();
    const destino = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.pushState(null, "", destino);
    setPagina(paginaFinal);
  }, []);

  const resetarPagina = useCallback(() => {
    setPagina((atual) => {
      if (atual === 1) return atual;
      const params = new URLSearchParams(window.location.search);
      params.delete("page");
      const query = params.toString();
      const destino = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.pushState(null, "", destino);
      return 1;
    });
  }, []);

  // JSON.stringify vira uma unica dependencia estavel em conteudo — o hook
  // useCallback exige um array literal, entao nao da pra espalhar
  // `dependencias` direto nele.
  const chaveDependencias = JSON.stringify(dependencias);

  const carregar = useCallback(async () => {
    if (!habilitado) return;
    const idRequisicao = ++requisicaoAtualRef.current;
    setCarregando(true);
    const de = (pagina - 1) * itensPorPagina;
    const ate = de + itensPorPagina - 1;
    const { data, count } = await montarConsulta()
      .order(ordenarPor, { ascending: ascendente })
      .range(de, ate);
    if (idRequisicao !== requisicaoAtualRef.current) return; // resposta desatualizada, ignora
    setDados((Array.isArray(data) ? data : []) as unknown as T[]);
    setTotal(count ?? 0);
    setCarregando(false);
    // montarConsulta fecha sobre os filtros atuais; chaveDependencias (vinda
    // de `dependencias`, passada por quem usa o hook) e que decide quando
    // refazer o fetch — por isso o eslint-disable, igual ao padrao já usado
    // em outras telas do projeto para efeitos com deps escolhidas a mao.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, pagina, itensPorPagina, ordenarPor, ascendente, versao, chaveDependencias]);

  useEffect(() => {
    Promise.resolve().then(() => carregar());
  }, [carregar]);

  function mudarItensPorPagina(novoValor: number) {
    setItensPorPagina(novoValor);
    resetarPagina();
  }

  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));

  return {
    dados,
    total,
    totalPaginas,
    pagina,
    itensPorPagina,
    carregando,
    irParaPagina,
    resetarPagina,
    mudarItensPorPagina,
    recarregar: () => setVersao((v) => v + 1),
  };
}
