import { Badge, type BadgeTone } from "@/components/Badge";
import type { AvaliacaoNota, ClassificacaoFornecedor } from "@/lib/supabase/types";

const CLASSIFICACAO_LABEL: Record<ClassificacaoFornecedor, string> = {
  bem_avaliado: "Bem avaliado",
  regular: "Regular",
  com_ressalvas: "Com ressalvas",
};

const CLASSIFICACAO_TOM: Record<ClassificacaoFornecedor, BadgeTone> = {
  bem_avaliado: "green",
  regular: "amber",
  com_ressalvas: "red",
};

export function SeloAvaliacao({ classificacao }: { classificacao: ClassificacaoFornecedor }) {
  return <Badge tone={CLASSIFICACAO_TOM[classificacao]}>{CLASSIFICACAO_LABEL[classificacao]}</Badge>;
}

// A view so traz o score continuo (-1 a 1) por aspecto, sem rotulo — aqui ele
// e "rebalanceado" nos mesmos 3 baldes de bom/regular/ruim usados na nota
// individual, dividindo o intervalo em tercos (score_geral usa a mesma faixa
// para chegar em bem_avaliado/regular/com_ressalvas).
export function notaPorScore(score: number): AvaliacaoNota {
  if (score > 1 / 3) return "bom";
  if (score < -1 / 3) return "ruim";
  return "regular";
}

export const NOTA_LABEL: Record<AvaliacaoNota, string> = {
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
};

export const NOTA_COR_BARRA: Record<AvaliacaoNota, string> = {
  bom: "bg-green-500",
  regular: "bg-amber-500",
  ruim: "bg-red-500",
};
