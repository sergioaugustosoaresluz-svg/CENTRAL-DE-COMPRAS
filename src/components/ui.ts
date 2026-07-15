export const inputClass =
  "w-full rounded-md border border-hairline bg-white dark:bg-surface-muted px-3 py-2 text-sm";

export const buttonClass =
  "rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary";

export const secondaryButtonClass =
  "rounded-md border border-hairline px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClass =
  "rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20";

export const cardClass =
  "space-y-4 rounded-lg border border-hairline bg-white p-6 shadow-sm dark:bg-surface-muted";

// Classes compartilhadas de tabela: cabecalho com fundo levemente destacado,
// linhas com hairline e hover sutil. Usadas em todas as telas com tabela.
export const tableClass =
  "w-full text-sm border-collapse [&_th]:text-left [&_th]:py-2.5 [&_th]:pr-4 [&_td]:py-2.5 [&_td]:pr-4";

export const theadRowClass = "border-b border-hairline bg-surface-muted [&_th]:font-medium [&_th]:text-muted";

export const tbodyRowClass = "border-b border-hairline transition-colors hover:bg-surface-muted/70";

export const UNIDADES = ["UN", "PC", "CX", "KG", "L", "M", "M2", "M3", "PAR", "KIT"];

export function gerarCodigo(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36).toUpperCase()}`;
}
