"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isComprador: boolean;
  isSolicitante: boolean;
  isAprovador: boolean;
  solicitanteId: string | null;
  compradorId: string | null;
  aprovadorId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState({
    isAdmin: false,
    isComprador: false,
    isSolicitante: false,
    isAprovador: false,
  });
  const [solicitanteId, setSolicitanteId] = useState<string | null>(null);
  const [compradorId, setCompradorId] = useState<string | null>(null);
  const [aprovadorId, setAprovadorId] = useState<string | null>(null);

  const carregarPerfil = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setRoles({ isAdmin: false, isComprador: false, isSolicitante: false, isAprovador: false });
      setSolicitanteId(null);
      setCompradorId(null);
      setAprovadorId(null);
      return;
    }

    const [admin, comprador, solicitante, aprovador, solicitanteIdAtual] = await Promise.all([
      supabase.rpc("is_admin"),
      supabase.rpc("is_comprador"),
      supabase.rpc("is_solicitante"),
      supabase.rpc("is_aprovador"),
      supabase.rpc("solicitante_id_atual"),
    ]);

    setRoles({
      isAdmin: Boolean(admin.data),
      isComprador: Boolean(comprador.data),
      isSolicitante: Boolean(solicitante.data),
      isAprovador: Boolean(aprovador.data),
    });
    setSolicitanteId((solicitanteIdAtual.data as string | null) ?? null);

    const [compradorRow, aprovadorRow] = await Promise.all([
      supabase.from("compradores").select("id").eq("user_id", currentUser.id).maybeSingle(),
      supabase.from("aprovadores").select("id").eq("user_id", currentUser.id).maybeSingle(),
    ]);
    setCompradorId((compradorRow.data as { id: string } | null)?.id ?? null);
    setAprovadorId((aprovadorRow.data as { id: string } | null)?.id ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      carregarPerfil(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      carregarPerfil(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [carregarPerfil]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, ...roles, solicitanteId, compradorId, aprovadorId, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
