import type { ReactNode } from "react";

type Variant = "list" | "form" | "center";

const VARIANT_CLASS: Record<Variant, string> = {
  // w-full é necessário: <body> é flex-col, e mx-auto num item flex cancela o
  // stretch do cross-axis, fazendo o <main> encolher para o conteúdo (largura
  // inconsistente entre páginas) em vez de ocupar a largura disponível até o max-width.
  list: "w-full max-w-[1100px] mx-auto p-8 space-y-6",
  form: "w-full max-w-[640px] mx-auto p-8 space-y-6",
  center: "flex flex-1 items-center justify-center p-8",
};

// Largura padrão para cartões de formulário embutidos em páginas de lista
// (ex: "Nova Solicitação" acima de uma tabela) — evita esticar o card por
// toda a largura da página quando o conteúdo é só um formulário estreito.
export const formCardWidthClass = "max-w-[640px]";

export function PageContainer({
  children,
  variant = "list",
}: {
  children: ReactNode;
  variant?: Variant;
}) {
  return <main className={VARIANT_CLASS[variant]}>{children}</main>;
}
