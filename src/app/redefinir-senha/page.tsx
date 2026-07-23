"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { inputClass, buttonClass, cardClass } from "@/components/ui";
import { PageContainer } from "@/components/PageContainer";

type Estado = "verificando" | "valido" | "invalido";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      // Link expirado/invalido volta do Supabase com error/error_code na URL
      // (como hash, ex: #error=access_denied&error_code=otp_expired).
      const params = new URLSearchParams(
        window.location.hash ? window.location.hash.slice(1) : window.location.search
      );
      if (params.get("error") || params.get("error_code")) {
        setEstado("invalido");
        return;
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setEstado((atual) => (atual === "verificando" ? "valido" : atual));
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setEstado("valido");
    });

    const timeout = setTimeout(() => {
      setEstado((atual) => (atual === "verificando" ? "invalido" : atual));
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function redefinir(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      await supabase.auth.signOut();
      router.push("/login?redefinida=1");
    } catch (e) {
      setErro("Não foi possível redefinir a senha: " + (e as Error).message);
      setSalvando(false);
    }
  }

  if (estado === "verificando") {
    return (
      <PageContainer variant="center">
        <p className="text-sm text-zinc-500">Verificando link...</p>
      </PageContainer>
    );
  }

  if (estado === "invalido") {
    return (
      <PageContainer variant="center">
        <div className={`${cardClass} w-full max-w-sm`}>
          <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted">
            Este link de redefinição de senha não é mais válido. Solicite um novo link para
            continuar.
          </p>
          <p className="text-sm">
            <Link href="/esqueci-senha" className="text-primary hover:underline">
              Solicitar novo link
            </Link>
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="center">
      <form onSubmit={redefinir} className={`${cardClass} w-full max-w-sm`}>
        <h1 className="text-xl font-semibold">Redefinir senha</h1>

        <label className="block text-sm space-y-1">
          <span>Nova senha</span>
          <input
            type="password"
            required
            minLength={8}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-sm space-y-1">
          <span>Confirmar nova senha</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className={inputClass}
          />
        </label>

        <button type="submit" disabled={salvando} className={`${buttonClass} w-full`}>
          {salvando ? "Salvando..." : "Redefinir senha"}
        </button>

        {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
      </form>
    </PageContainer>
  );
}
