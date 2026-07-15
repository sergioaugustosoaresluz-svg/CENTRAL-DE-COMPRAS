"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/solicitacao", label: "Solicitação" },
  { href: "/cotacao", label: "Cotação" },
  { href: "/compras", label: "Compras" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/parametrizacao", label: "Parametrização" },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 px-8 py-3 flex items-center justify-between">
      <div className="flex gap-6">
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
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <button
            onClick={signOut}
            className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-white"
          >
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}
