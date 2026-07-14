export const inputClass =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm";

export const buttonClass =
  "rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium disabled:opacity-50";

export const dangerButtonClass =
  "rounded-md border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 text-sm font-medium disabled:opacity-50";

export const cardClass =
  "space-y-4 border rounded-lg p-6 border-zinc-200 dark:border-zinc-800";

export const UNIDADES = ["UN", "PC", "CX", "KG", "L", "M", "M2", "M3", "PAR", "KIT"];

export function gerarCodigo(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36).toUpperCase()}`;
}
