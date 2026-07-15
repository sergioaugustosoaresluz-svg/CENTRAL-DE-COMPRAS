export type MensagemTipo = "erro" | "sucesso";

export interface MensagemState {
  tipo: MensagemTipo;
  texto: string;
}

export function MensagemInline({ mensagem }: { mensagem: MensagemState | null }) {
  if (!mensagem) return null;
  return (
    <p
      className={`text-sm ${
        mensagem.tipo === "erro" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
      }`}
    >
      {mensagem.texto}
    </p>
  );
}
