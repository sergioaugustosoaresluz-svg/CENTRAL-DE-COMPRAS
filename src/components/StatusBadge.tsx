import type { SolicitacaoStatus } from "@/lib/supabase/types";
import { Badge, type BadgeTone } from "@/components/Badge";

const LABELS: Record<SolicitacaoStatus, string> = {
  aguardando_especificacao: "Aguardando especificação",
  aguardando_cotacao: "Aguardando cotação",
  em_cotacao: "Em cotação",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  concluida: "Concluída",
};

const TONS: Record<SolicitacaoStatus, BadgeTone> = {
  aguardando_especificacao: "amber",
  aguardando_cotacao: "blue",
  em_cotacao: "blue",
  aguardando_aprovacao: "purple",
  aprovada: "green",
  rejeitada: "red",
  concluida: "gray",
};

export function StatusBadge({ status }: { status: SolicitacaoStatus }) {
  return <Badge tone={TONS[status]}>{LABELS[status]}</Badge>;
}
