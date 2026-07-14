import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-2xl font-semibold">Central de Compras</h1>
        <div className="flex gap-4">
          <Link
            href="/solicitacao"
            className="rounded-md bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 text-sm font-medium"
          >
            Solicitação
          </Link>
          <Link
            href="/cotacao"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium"
          >
            Cotação
          </Link>
        </div>
      </div>
    </main>
  );
}
