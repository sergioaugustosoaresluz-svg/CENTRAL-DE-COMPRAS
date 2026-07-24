"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Notificacao } from "@/lib/supabase/types";

const LIMITE_LISTA = 20;

function tempoRelativo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.floor(diffH / 24)}d`;
}

export function NotificacoesSino() {
  const { user } = useAuth();
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);

  async function carregar(userId: string) {
    const [{ data: lista }, { count }] = await Promise.all([
      supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIMITE_LISTA),
      supabase
        .from("notificacoes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("lida", false),
    ]);
    setNotificacoes((lista as Notificacao[]) ?? []);
    setNaoLidas(count ?? 0);
  }

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => carregar(user.id));

    const canal = supabase
      .channel(`notificacoes-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const nova = payload.new as Notificacao;
          setNotificacoes((prev) => [nova, ...prev].slice(0, LIMITE_LISTA));
          setNaoLidas((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function abrirNotificacao(n: Notificacao) {
    setAberto(false);
    if (!n.lida) {
      setNotificacoes((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
      setNaoLidas((prev) => Math.max(0, prev - 1));
      await supabase.from("notificacoes").update({ lida: true }).eq("id", n.id);
    }
    if (n.link) router.push(n.link);
  }

  async function marcarTodasComoLidas() {
    if (!user) return;
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
  }

  async function limparLidas() {
    if (!user) return;
    if (!window.confirm("Excluir permanentemente todas as notificações lidas? Essa ação não pode ser desfeita.")) {
      return;
    }
    setNotificacoes((prev) => prev.filter((n) => !n.lida));
    await supabase.from("notificacoes").delete().eq("user_id", user.id).eq("lida", true);
  }

  if (!user) return null;

  const temLidas = notificacoes.some((n) => n.lida);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        className="relative rounded-md p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary"
        aria-label="Notificações"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 3.5 1 5.5 2 7H4c1-1.5 2-3.5 2-7Z" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-h-96 overflow-auto rounded-md border border-hairline bg-white shadow-lg dark:bg-surface-muted">
          <div className="flex items-center justify-between border-b border-hairline p-3">
            <span className="text-sm font-medium">Notificações</span>
            <div className="flex items-center gap-3">
              {naoLidas > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={marcarTodasComoLidas}
                  className="text-xs text-primary hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
              {temLidas && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={limparLidas}
                  className="text-xs text-muted hover:text-red-600 hover:underline dark:hover:text-red-400"
                >
                  Limpar notificações lidas
                </button>
              )}
              <Link
                href="/notificacoes/preferencias"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setAberto(false)}
                className="text-xs text-muted hover:text-primary hover:underline"
              >
                Preferências
              </Link>
            </div>
          </div>

          {notificacoes.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Nenhuma notificação ainda.</p>
          ) : (
            <ul>
              {notificacoes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => abrirNotificacao(n)}
                    className={`block w-full border-b border-hairline px-3 py-2.5 text-left text-sm hover:bg-surface-muted ${
                      !n.lida ? "bg-primary-soft/60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{n.titulo}</span>
                      {!n.lida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="text-muted">{n.mensagem}</p>
                    <p className="mt-1 text-xs text-muted">{tempoRelativo(n.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
