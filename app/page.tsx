import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center text-center">
        <div className="mb-6 text-5xl">☕</div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-rose-400">Kamikamikita Coffee</p>
        <h1 className="text-4xl font-black tracking-tight">Ruang seduh kopi santai</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Musik, kopi, dan tempat kumpul hangat di Medan.</p>

        <div className="mt-8 space-y-3">
          <Link href="/kasir" className="block rounded-2xl bg-rose-600 px-5 py-4 text-sm font-bold shadow-lg shadow-rose-950 transition hover:bg-rose-700">
            Buka Menu & Kasir
          </Link>
          <a href="https://wa.me/6280000000000" target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-bold transition hover:bg-slate-800">
            Reservasi Meja & Info Menu
          </a>
          <Link href="/admin" className="block rounded-2xl border border-slate-800 px-5 py-3 text-xs text-slate-400 transition hover:text-white">
            Back Office Admin
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left text-xs">
          <p className="font-bold text-slate-200">📍 Alamat Kedai</p>
          <p className="mt-1 text-slate-400">Medan</p>
        </div>
      </div>
    </main>
  );
}
