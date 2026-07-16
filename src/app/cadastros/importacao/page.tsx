"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { inputClass, buttonClass, cardClass, tableClass, theadRowClass, tbodyRowClass } from "@/components/ui";
import { PageContainer } from "@/components/PageContainer";

type Tabela = "compradores" | "solicitantes" | "aprovadores" | "fornecedores" | "itens";

function linha(n: number) {
  return n === 1 ? "linha" : "linhas";
}

const TITULOS: Record<Tabela, string> = {
  compradores: "Compradores",
  solicitantes: "Solicitantes",
  aprovadores: "Aprovadores",
  fornecedores: "Fornecedores",
  itens: "Itens",
};

const COLUNAS: Record<Tabela, string[]> = {
  compradores: ["codigo", "nome_completo", "nome_abreviado", "telefone", "email", "funcao"],
  solicitantes: ["codigo", "nome_completo", "nome_abreviado", "telefone", "email", "funcao"],
  aprovadores: ["codigo", "nome_completo", "nome_abreviado", "telefone", "email", "funcao"],
  fornecedores: ["codigo", "fornecedor", "contato", "telefone", "email", "uf"],
  itens: ["codigo_sugerido", "item", "unidade_medida", "custo_ideal", "marca", "modelo", "dimensoes"],
};

const CAMPOS_OBRIGATORIOS: Record<Tabela, string[]> = {
  compradores: ["codigo", "nome_completo"],
  solicitantes: ["codigo", "nome_completo"],
  aprovadores: ["codigo", "nome_completo"],
  fornecedores: ["codigo", "fornecedor"],
  itens: ["item"],
};

const CAMPO_CODIGO: Record<Tabela, string | null> = {
  compradores: "codigo",
  solicitantes: "codigo",
  aprovadores: "codigo",
  fornecedores: "codigo",
  itens: "codigo_sugerido",
};

const TEM_EMAIL: Record<Tabela, boolean> = {
  compradores: true,
  solicitantes: true,
  aprovadores: true,
  fornecedores: true,
  itens: false,
};

interface LinhaValidada {
  linha: number;
  dados: Record<string, string>;
  erros: string[];
  valido: boolean;
}

interface Ignorado {
  linha: number;
  motivo: string;
}

export default function ImportacaoPage() {
  const { loading, isAdmin } = useAuth();
  const [tabela, setTabela] = useState<Tabela>("compradores");
  const [linhas, setLinhas] = useState<LinhaValidada[]>([]);
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ importados: number; ignorados: Ignorado[] } | null>(
    null
  );
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);

  if (loading) return null;

  if (!isAdmin) {
    return (
      <PageContainer>
        <h1 className="text-2xl font-semibold">Importação</h1>
        <p className="text-sm text-zinc-500">Você não tem acesso a esta área.</p>
      </PageContainer>
    );
  }

  function mudarTabela(nova: Tabela) {
    setTabela(nova);
    setLinhas([]);
    setResultado(null);
    setNomeArquivo(null);
  }

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    setResultado(null);
    setValidando(true);

    Papa.parse<Record<string, string>>(arquivo, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: async (results) => {
        await validarLinhas(results.data);
        setValidando(false);
      },
    });
  }

  async function valoresExistentes(coluna: string): Promise<Set<string>> {
    const consultaCodigo = tabela === "itens" ? "codigo" : coluna;
    const { data } = await supabase.from(tabela).select(consultaCodigo);
    const set = new Set<string>();
    (data as Record<string, string | null>[] | null ?? []).forEach((row) => {
      const v = row[consultaCodigo];
      if (v) set.add(v.trim().toLowerCase());
    });
    return set;
  }

  async function validarLinhas(dados: Record<string, string>[]) {
    const campoCodigo = CAMPO_CODIGO[tabela];
    const temEmail = TEM_EMAIL[tabela];
    const obrigatorios = CAMPOS_OBRIGATORIOS[tabela];

    const codigosExistentes = campoCodigo ? await valoresExistentes(campoCodigo) : new Set<string>();
    const emailsExistentes = temEmail ? await valoresExistentes("email") : new Set<string>();

    const codigosNoArquivo = new Map<string, number[]>();
    const emailsNoArquivo = new Map<string, number[]>();

    dados.forEach((linha, idx) => {
      const numeroLinha = idx + 2; // +1 header, +1 base 1
      const codigo = campoCodigo ? (linha[campoCodigo] ?? "").trim().toLowerCase() : "";
      const email = temEmail ? (linha.email ?? "").trim().toLowerCase() : "";
      if (codigo) {
        codigosNoArquivo.set(codigo, [...(codigosNoArquivo.get(codigo) ?? []), numeroLinha]);
      }
      if (email) {
        emailsNoArquivo.set(email, [...(emailsNoArquivo.get(email) ?? []), numeroLinha]);
      }
    });

    const linhasValidadas: LinhaValidada[] = dados.map((linha, idx) => {
      const numeroLinha = idx + 2;
      const erros: string[] = [];

      obrigatorios.forEach((campo) => {
        if (!linha[campo] || !linha[campo].trim()) {
          erros.push(`campo "${campo}" vazio`);
        }
      });

      if (campoCodigo) {
        const codigo = (linha[campoCodigo] ?? "").trim().toLowerCase();
        if (codigo) {
          const ocorrencias = codigosNoArquivo.get(codigo) ?? [];
          if (ocorrencias.length > 1 && ocorrencias.indexOf(numeroLinha) > 0) {
            erros.push(`${campoCodigo} duplicado no arquivo`);
          }
          if (codigosExistentes.has(codigo)) {
            erros.push(`${campoCodigo} já existe na tabela`);
          }
        }
      }

      if (temEmail) {
        const email = (linha.email ?? "").trim().toLowerCase();
        if (email) {
          const ocorrencias = emailsNoArquivo.get(email) ?? [];
          if (ocorrencias.length > 1 && ocorrencias.indexOf(numeroLinha) > 0) {
            erros.push("email duplicado no arquivo");
          }
          if (emailsExistentes.has(email)) {
            erros.push("email já existe na tabela");
          }
        }
      }

      return { linha: numeroLinha, dados: linha, erros, valido: erros.length === 0 };
    });

    setLinhas(linhasValidadas);
  }

  function montarPayload(dados: Record<string, string>) {
    switch (tabela) {
      case "compradores":
      case "solicitantes":
      case "aprovadores":
        return {
          codigo: dados.codigo.trim(),
          nome_completo: dados.nome_completo.trim(),
          nome_abreviado: dados.nome_abreviado?.trim() || null,
          telefone: dados.telefone?.trim() || null,
          email: dados.email?.trim() || null,
          funcao: dados.funcao?.trim() || null,
        };
      case "fornecedores":
        return {
          codigo: dados.codigo.trim(),
          fornecedor: dados.fornecedor.trim(),
          contato: dados.contato?.trim() || null,
          telefone: dados.telefone?.trim() || null,
          email: dados.email?.trim() || null,
          uf: dados.uf?.trim() || null,
        };
      case "itens":
        return {
          item: dados.item.trim(),
          unidade_medida: dados.unidade_medida?.trim() || null,
          custo_ideal: dados.custo_ideal?.trim() ? Number(dados.custo_ideal) : null,
          marca: dados.marca?.trim() || null,
          modelo: dados.modelo?.trim() || null,
          dimensoes: dados.dimensoes?.trim() || null,
          codigo_sugerido: dados.codigo_sugerido?.trim() || null,
          status: "pendente_especificacao" as const,
        };
    }
  }

  async function importar() {
    setImportando(true);
    const validas = linhas.filter((l) => l.valido);
    const ignorados: Ignorado[] = linhas
      .filter((l) => !l.valido)
      .map((l) => ({ linha: l.linha, motivo: l.erros.join("; ") }));
    let importados = 0;

    for (const l of validas) {
      const payload = montarPayload(l.dados) as Record<string, unknown>;
      const { error } = await supabase.from(tabela).insert(payload);
      if (error) {
        ignorados.push({ linha: l.linha, motivo: error.message });
      } else {
        importados++;
      }
    }

    setResultado({ importados, ignorados });
    setImportando(false);
    setLinhas([]);
  }

  const validas = linhas.filter((l) => l.valido).length;
  const invalidas = linhas.length - validas;

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Importação</h1>

      <label className="block text-sm space-y-1 max-w-sm">
        <span>Cadastro</span>
        <select
          value={tabela}
          onChange={(e) => mudarTabela(e.target.value as Tabela)}
          className={inputClass}
        >
          {Object.entries(TITULOS).map(([valor, titulo]) => (
            <option key={valor} value={valor}>
              {titulo}
            </option>
          ))}
        </select>
      </label>

      <div className={cardClass}>
        <h2 className="font-medium">Colunas esperadas no CSV</h2>
        <p className="text-sm text-zinc-500">{COLUNAS[tabela].join(", ")}</p>

        <input type="file" accept=".csv" onChange={selecionarArquivo} className={inputClass} />
        {nomeArquivo && <p className="text-sm text-zinc-500">Arquivo: {nomeArquivo}</p>}
      </div>

      {validando && <p className="text-sm text-zinc-500">Validando arquivo...</p>}

      {linhas.length > 0 && (
        <section className="space-y-4">
          <p className="text-sm font-medium">
            {validas} {linha(validas)} válida{validas === 1 ? "" : "s"}, {invalidas} {linha(invalidas)}{" "}
            com erro
          </p>

          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr className={theadRowClass}>
                  <th>Linha</th>
                  {COLUNAS[tabela].map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr
                    key={l.linha}
                    className={`${tbodyRowClass} ${
                      l.valido ? "" : "bg-red-50 dark:bg-red-900/20"
                    }`}
                  >
                    <td>{l.linha}</td>
                    {COLUNAS[tabela].map((c) => (
                      <td key={c}>{l.dados[c] ?? ""}</td>
                    ))}
                    <td>
                      {l.valido ? (
                        <span className="text-green-700 dark:text-green-400">OK</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{l.erros.join("; ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={importar}
            disabled={importando || validas === 0}
            className={buttonClass}
          >
            {importando ? "Importando..." : `Importar (${validas})`}
          </button>
        </section>
      )}

      {resultado && (
        <section className={cardClass}>
          <h2 className="font-medium">
            {resultado.importados} importado{resultado.importados === 1 ? "" : "s"},{" "}
            {resultado.ignorados.length} ignorado{resultado.ignorados.length === 1 ? "" : "s"}
          </h2>
          {resultado.ignorados.length > 0 && (
            <table className={tableClass}>
              <thead>
                <tr className={theadRowClass}>
                  <th>Linha</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {resultado.ignorados.map((i) => (
                  <tr key={i.linha} className={tbodyRowClass}>
                    <td>{i.linha}</td>
                    <td>{i.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </PageContainer>
  );
}
