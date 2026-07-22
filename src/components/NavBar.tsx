"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NotificacoesSino } from "@/components/NotificacoesSino";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/solicitacao", label: "Solicitação" },
  { href: "/cotacao", label: "Cotação" },
  { href: "/compras", label: "Compras" },
  { href: "/variacao", label: "Variação" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/parametrizacao", label: "Parametrização" },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, isAdmin, signOut } = useAuth();

  if (pathname === "/login") return null;

  const links = isAdmin ? [...LINKS, { href: "/dashboard", label: "Dashboard" }] : LINKS;

  return (
    <nav className="bg-surface-muted border-b border-hairline px-8 flex items-center justify-between">
      <div className="flex items-stretch gap-1">
        {links.map((l) => {
          const ativo = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center border-b-2 px-3 py-4 text-sm transition-colors ${
                ativo
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent font-medium text-muted hover:border-primary/30 hover:text-primary"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="flex items-center gap-4 border-l border-hairline pl-4">
          <NotificacoesSino />
          <span className="text-sm text-muted">{user.email}</span>
          <button
            onClick={signOut}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
          >
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}
