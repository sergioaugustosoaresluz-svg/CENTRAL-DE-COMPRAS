"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { inputClass, buttonClass, cardClass } from "@/components/ui";
import { PageContainer } from "@/components/PageContainer";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensagem(null);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
    } catch {
      // ignorado de proposito: a mensagem exibida nunca muda com o resultado
    } finally {
      // Mensagem sempre generica: nunca revela se o e-mail existe no sistema.
      setMensagem({
        tipo: "sucesso",
        texto: "Se este e-mail estiver cadastrado, você receberá um link em instantes.",
      });
      setEnviando(false);
    }
  }

  return (
    <PageContainer variant="center">
      <form onSubmit={enviar} className={`${cardClass} w-full max-w-sm`}>
        <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
        <p className="text-sm text-muted">
          Informe o e-mail cadastrado para receber um link de redefinição de senha.
        </p>

        <label className="block text-sm space-y-1">
          <span>E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <button type="submit" disabled={enviando} className={`${buttonClass} w-full`}>
          {enviando ? "Enviando..." : "Enviar link de recuperação"}
        </button>

        <MensagemInline mensagem={mensagem} />

        <p className="text-sm text-center">
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      </form>
    </PageContainer>
  );
}
