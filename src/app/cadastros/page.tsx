import Link from "next/link";

const CADASTROS = [
  { href: "/cadastros/compradores", titulo: "Compradores" },
  { href: "/cadastros/solicitantes", titulo: "Solicitantes" },
  { href: "/cadastros/aprovadores", titulo: "Aprovadores" },
  { href: "/cadastros/fornecedores", titulo: "Fornecedores" },
  { href: "/cadastros/itens", titulo: "Itens" },
];

export default function CadastrosPage() {
  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Cadastros</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CADASTROS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            {c.titulo}
          </Link>
        ))}
      </div>
    </main>
  );
}
