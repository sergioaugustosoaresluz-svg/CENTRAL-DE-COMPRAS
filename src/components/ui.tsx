import type { ButtonHTMLAttributes, ChangeEvent } from "react";

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

export function formatarMoeda(v: number | null | undefined) {
  if (v == null) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Para colunas do tipo `date` (sem hora/fuso, ex: "2026-07-17"): reformata o
// prefixo AAAA-MM-DD diretamente, sem passar por Date/toLocaleDateString, que
// interpretam a string como meia-noite UTC e podem exibir o dia anterior em
// fusos negativos (ex: America/Sao_Paulo).
export function formatarDataBR(data: string | null | undefined) {
  if (!data) return "-";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

// Input de moeda com mascara: os digitos digitados sao tratados como centavos
// (da direita pra esquerda), entao "9500" vira "95,00" e "950000" vira
// "9.500,00" — mesmo padrao usado por bibliotecas de mascara de moeda em React.
// O valor exposto ao componente pai e sempre um numero puro (ou null).
export function CampoMoeda({
  value,
  onChange,
  className,
  disabled,
}: {
  value: number | null;
  onChange: (valor: number | null) => void;
  className?: string;
  disabled?: boolean;
}) {
  const exibicao =
    value != null
      ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";

  function aoDigitar(e: ChangeEvent<HTMLInputElement>) {
    const somenteDigitos = e.target.value.replace(/\D/g, "");
    if (!somenteDigitos) {
      onChange(null);
      return;
    }
    onChange(Number(somenteDigitos) / 100);
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-md border border-hairline bg-white px-3 py-2 text-sm dark:bg-surface-muted ${className ?? ""}`}
    >
      <span className="text-muted">R$</span>
      <input
        type="text"
        inputMode="decimal"
        value={exibicao}
        onChange={aoDigitar}
        disabled={disabled}
        className="w-full bg-transparent outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
  ...rest
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label?: string;
  disabled?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "disabled">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
      {...rest}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
