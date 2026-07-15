import Link from "next/link";
import { buttonClass, secondaryButtonClass } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-2xl font-semibold">Central de Compras</h1>
        <div className="flex gap-4">
          <Link href="/solicitacao" className={buttonClass}>
            Solicitação
          </Link>
          <Link href="/cotacao" className={secondaryButtonClass}>
            Cotação
          </Link>
        </div>
      </div>
    </main>
  );
}
