import type { SolicitacaoStatus } from "@/lib/supabase/types";

const LABELS: Record<SolicitacaoStatus, string> = {
  aguardando_especificacao: "Aguardando especificação",
  aguardando_cotacao: "Aguardando cotação",
  em_cotacao: "Em cotação",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  concluida: "Concluída",
};

const COLORS: Record<SolicitacaoStatus, string> = {
  aguardando_especificacao:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  aguardando_cotacao:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  em_cotacao: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  aguardando_aprovacao:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  aprovada: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejeitada: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  concluida: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusBadge({ status }: { status: SolicitacaoStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
