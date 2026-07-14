"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/solicitacao", label: "Solicitação" },
  { href: "/cotacao", label: "Cotação" },
  { href: "/cadastros", label: "Cadastros" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 px-8 py-3 flex gap-6">
      {LINKS.map((l) => {
        const ativo = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-medium ${
              ativo
                ? "text-black dark:text-white"
                : "text-zinc-500 hover:text-black dark:hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
