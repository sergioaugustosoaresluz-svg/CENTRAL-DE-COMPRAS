import { inputClass, secondaryButtonClass } from "@/components/ui";
import { ITENS_POR_PAGINA_OPCOES } from "@/hooks/usePaginatedQuery";

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  itensPorPagina: number;
  onMudarPagina: (pagina: number) => void;
  onMudarItensPorPagina: (valor: number) => void;
}

// Sempre mostra a primeira, a ultima, e uma janela ao redor da pagina atual;
// o resto vira "…" pra nao lotar a barra quando ha muitas paginas.
function paginasVisiveis(atual: number, total: number): (number | "...")[] {
  const janela = 1;
  const paginas: (number | "...")[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= atual - janela && p <= atual + janela)) {
      paginas.push(p);
    } else if (paginas[paginas.length - 1] !== "...") {
      paginas.push("...");
    }
  }
  return paginas;
}

export function Pagination({
  pagina,
  totalPaginas,
  total,
  itensPorPagina,
  onMudarPagina,
  onMudarItensPorPagina,
}: PaginationProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        Página {pagina} de {totalPaginas} — {total} registro{total === 1 ? "" : "s"}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onMudarPagina(pagina - 1)}
          disabled={pagina <= 1}
          className={secondaryButtonClass}
        >
          Anterior
        </button>

        {paginasVisiveis(pagina, totalPaginas).map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-1.5 text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onMudarPagina(p)}
              aria-current={p === pagina ? "page" : undefined}
              className={`min-w-8 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                p === pagina
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-surface-muted hover:text-primary"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onMudarPagina(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className={secondaryButtonClass}
        >
          Próxima
        </button>
      </div>

      <label className="flex items-center gap-2">
        <span className="text-muted">Por página</span>
        <select
          value={itensPorPagina}
          onChange={(e) => onMudarItensPorPagina(Number(e.target.value))}
          className={`${inputClass} w-auto`}
        >
          {ITENS_POR_PAGINA_OPCOES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
