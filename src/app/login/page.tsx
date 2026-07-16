"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { inputClass, buttonClass, cardClass } from "@/components/ui";
import { PageContainer } from "@/components/PageContainer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <PageContainer variant="center">
      <form onSubmit={entrar} className={`${cardClass} w-full max-w-sm`}>
        <h1 className="text-xl font-semibold">Entrar</h1>

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

        <label className="block text-sm space-y-1">
          <span>Senha</span>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={inputClass}
          />
        </label>

        <button type="submit" disabled={entrando} className={`${buttonClass} w-full`}>
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
      </form>
    </PageContainer>
  );
}
