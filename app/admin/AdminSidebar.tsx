"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const items = [
    { href: "/admin", label: "Dashboard", icon: "▦" },
    { href: "/admin/transactions", label: "Penjualan & Closing", icon: "▤" },
    { href: "/admin/attendance", label: "Absensi Karyawan", icon: "◷" },
    { href: "/admin/karyawan", label: "Karyawan & Wajah", icon: "♙" },
    { href: "/admin/settings", label: "Profil & Password", icon: "⚙" },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    function logout() {
        localStorage.removeItem("kamikamikita-user");
        document.cookie = "kamikamikita-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
    }

    return (
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-white">
            <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
                    <img src="/logo-kkk.png" alt="KamiKamiKita" className="h-full w-full object-contain p-0.5" />
                </div>
                <div><p className="text-sm font-black tracking-wide">KamiKamiKita</p><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">Back Office</p></div>
            </div>
            <div className="px-4 pt-6"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Menu Utama</p><nav className="space-y-1">{items.map((item) => { const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-rose-600 text-white shadow-lg shadow-rose-950/30" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className="w-5 text-center text-lg">{item.icon}</span>{item.label}</Link>; })}</nav></div>
            <div className="mt-auto space-y-2 border-t border-white/10 p-4"><Link href="/kasir" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><span className="w-5 text-center">▣</span> Buka Kasir</Link><Link href="/absensi" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><span className="w-5 text-center">◉</span> Absen Wajah</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-500/10"><span className="w-5 text-center">↪</span> Keluar</button></div>
        </aside>
    );
}
