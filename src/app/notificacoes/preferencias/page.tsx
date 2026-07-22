"use client";

import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TipoNotificacao, PreferenciaNotificacao } from "@/lib/supabase/types";
import { cardClass, ToggleSwitch } from "@/components/ui";
import { PageContainer } from "@/components/PageContainer";
import { MensagemInline, type MensagemState } from "@/components/Mensagem";

interface PreferenciaEstado {
  canal_sistema: boolean;
  canal_email: boolean;
}

const PADRAO: PreferenciaEstado = { canal_sistema: true, canal_email: true };

export default function PreferenciasNotificacaoPage() {
  const { user, loading } = useAuth();
  const [tipos, setTipos] = useState<TipoNotificacao[]>([]);
  const [prefs, setPrefs] = useState<Record<string, PreferenciaEstado>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<MensagemState | null>(null);

  async function carregar(userId: string) {
    setCarregando(true);
    const [{ data: tiposData }, { data: prefsData }] = await Promise.all([
      supabase.from("tipos_notificacao").select("*").order("descricao"),
      supabase.from("preferencias_notificacao").select("*").eq("user_id", userId),
    ]);
    const tiposLista = (tiposData as TipoNotificacao[]) ?? [];
    setTipos(tiposLista);

    const mapa: Record<string, PreferenciaEstado> = {};
    for (const t of tiposLista) {
      mapa[t.chave] = PADRAO;
    }
    for (const p of (prefsData as PreferenciaNotificacao[] | null) ?? []) {
      mapa[p.tipo_chave] = { canal_sistema: p.canal_sistema, canal_email: p.canal_email };
    }
    setPrefs(mapa);
    setCarregando(false);
  }

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => carregar(user.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function alterar(tipoChave: string, campo: keyof PreferenciaEstado, valor: boolean) {
    if (!user) return;
    const atual = prefs[tipoChave] ?? PADRAO;
    const novo = { ...atual, [campo]: valor };
    setPrefs((prev) => ({ ...prev, [tipoChave]: novo }));
    setSalvandoChave(tipoChave);
    setMensagem(null);
    const { error } = await supabase.from("preferencias_notificacao").upsert(
      {
        user_id: user.id,
        tipo_chave: tipoChave,
        canal_sistema: novo.canal_sistema,
        canal_email: novo.canal_email,
      },
      { onConflict: "user_id,tipo_chave" }
    );
    setSalvandoChave(null);
    if (error) {
      setPrefs((prev) => ({ ...prev, [tipoChave]: atual }));
      setMensagem({ tipo: "erro", texto: "Erro ao salvar preferência: " + error.message });
    }
  }

  if (loading || carregando) return null;

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Preferências de notificação</h1>
      <MensagemInline mensagem={mensagem} />

      {tipos.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum tipo de notificação cadastrado.</p>
      ) : (
        <section className={cardClass}>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-8 gap-y-4">
            <span></span>
            <span className="text-xs font-medium text-muted">No sistema</span>
            <span className="text-xs font-medium text-muted">Por e-mail</span>

            {tipos.map((t) => {
              const p = prefs[t.chave] ?? PADRAO;
              const salvando = salvandoChave === t.chave;
              return (
                <Fragment key={t.chave}>
                  <span className="text-sm" data-tipo-chave={t.chave}>
                    {t.descricao}
                  </span>
                  <ToggleSwitch
                    checked={p.canal_sistema}
                    onChange={(v) => alterar(t.chave, "canal_sistema", v)}
                    disabled={salvando}
                    label={`Notificar no sistema: ${t.descricao}`}
                    data-tipo-chave={t.chave}
                    data-campo="canal_sistema"
                  />
                  <ToggleSwitch
                    checked={p.canal_email}
                    onChange={(v) => alterar(t.chave, "canal_email", v)}
                    disabled={salvando}
                    label={`Notificar por e-mail: ${t.descricao}`}
                    data-tipo-chave={t.chave}
                    data-campo="canal_email"
                  />
                </Fragment>
              );
            })}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
