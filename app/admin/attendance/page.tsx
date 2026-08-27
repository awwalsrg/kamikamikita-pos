"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/admin/AdminSidebar";

type Attendance = { id: string; type: "CHECK_IN" | "CHECK_OUT"; timestamp: string; imageUrl?: string | null; hasImage?: boolean; status: string; user: { name: string; role: string; email: string } };

function getDateValue(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function AttendanceAdminPage() {
    const router = useRouter();
    const [from, setFrom] = useState(() => getDateValue(new Date()));
    const [to, setTo] = useState(() => getDateValue(new Date()));
    const [records, setRecords] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("kamikamikita-user");
            if (userStr) setUser(JSON.parse(userStr));
        } catch {
            setUser(null);
        }
        setMounted(true);
    }, []);

    function handleLogout() {
        localStorage.removeItem("kamikamikita-user");
        document.cookie = "kamikamikita-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
    }

    const [selected, setSelected] = useState<Attendance | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    async function openDetail(record: Attendance) {
        setSelected(record);
        setSelectedImage(null);
        if (record.hasImage) {
            setLoadingDetail(true);
            try {
                const res = await fetch(`/api/attendance?id=${record.id}`);
                const data = await res.json();
                setSelectedImage(data.attendance?.imageUrl || null);
            } catch {
                // ignore
            } finally {
                setLoadingDetail(false);
            }
        }
    }

    const loadAttendance = useCallback(async (startDate: string, endDate: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ startDate: `${startDate}T00:00:00`, endDate: `${endDate}T23:59:59`, limit: "200" });
            const res = await fetch(`/api/attendance?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setRecords(data.attendances || []);
        } catch (err) {
            console.error("Failed to load attendance:", err);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (mounted) {
            loadAttendance(from, to);
        }
    }, [mounted, from, to, loadAttendance]);

    async function handleDelete(id: string) {
        if (!confirm("Yakin ingin menghapus data absensi ini? Tindakan ini tidak dapat dibatalkan.")) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/attendance?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                setRecords((prev) => prev.filter((r) => r.id !== id));
                setToast({ type: "success", message: "Data absensi berhasil dihapus." });
                if (selected?.id === id) setSelected(null);
            } else {
                setToast({ type: "error", message: data.error || "Gagal menghapus data." });
            }
        } catch {
            setToast({ type: "error", message: "Terjadi kesalahan saat menghapus data." });
        } finally {
            setDeleting(null);
            setTimeout(() => setToast(null), 3000);
        }
    }

    const summary = useMemo(() => ({
        total: records.length,
        masuk: records.filter((r) => r.type === "CHECK_IN").length,
        pulang: records.filter((r) => r.type === "CHECK_OUT").length,
        people: new Set(records.map((r) => r.user.name)).size,
    }), [records]);

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-900"><AdminSidebar /><main className="min-w-0 flex-1">
            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-white">
                            <img src="/logo-kkk.png" alt="KamiKamiKita" className="h-full w-full object-contain p-0.5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[.2em] text-rose-600">Kamikamikita</p>
                            <p className="text-[11px] text-slate-400">Back Office</p>
                        </div>
                    </div>
                    <div className="hidden items-center gap-1 md:flex">
                        <a href="/admin" className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Dashboard</a>
                        <a href="/admin/attendance" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900">Absensi</a>
                        <a href="/admin/transactions" className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Transaksi</a>
                        <a href="/admin/karyawan" className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Karyawan</a>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden text-xs text-slate-500 md:block">{user?.name || "Admin"}</span>
                        <button onClick={handleLogout} className="rounded-lg bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100">Logout</button>
                        <a href="/kasir" className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">Kasir</a>
                    </div>
                </div>
            </nav>

            <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
                <header className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[.25em] text-rose-600">Manajemen Absensi</p>
                    <h1 className="mt-1 text-2xl font-black md:text-3xl">Data Absensi Karyawan</h1>
                    <p className="mt-1 text-sm text-slate-500">Pantau absensi masuk dan pulang beserta foto buktinya. Hapus data jika ada kesalahan.</p>
                </header>

                {/* Toast Notification */}
                {toast && (
                    <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${toast.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {toast.type === "success" ? "✓" : "⚠"} {toast.message}
                    </div>
                )}

                {/* Filter Section */}
                <section className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
                    <label className="text-xs font-bold text-slate-500">Dari
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                    </label>
                    <label className="text-xs font-bold text-slate-500">Sampai
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                    </label>
                    <button onClick={() => loadAttendance(from, to)} className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">Tampilkan</button>
                </section>

                {/* Summary Cards */}
                <section className="mb-5 grid gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Total Absensi</p><p className="mt-1 text-2xl font-black">{summary.total}</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Karyawan</p><p className="mt-1 text-2xl font-black">{summary.people}</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Masuk</p><p className="mt-1 text-2xl font-black text-emerald-600">{summary.masuk}</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Pulang</p><p className="mt-1 text-2xl font-black text-orange-600">{summary.pulang}</p></div>
                </section>

                {/* Table Section */}
                <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b px-5 py-4">
                        <h2 className="font-bold">Riwayat Absensi</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{records.length} data</span>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center p-8"><p className="text-slate-500">Memuat data...</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">Karyawan</th>
                                        <th className="px-5 py-3">Jabatan</th>
                                        <th className="px-5 py-3">Jenis</th>
                                        <th className="px-5 py-3">Waktu</th>
                                        <th className="px-5 py-3">Bukti Foto</th>
                                        <th className="px-5 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((record) => (
                                        <tr key={record.id} className="border-t hover:bg-slate-50">
                                            <td className="px-5 py-3 font-bold">{record.user.name}</td>
                                            <td className="px-5 py-3 text-slate-600">{record.user.role}</td>
                                            <td className="px-5 py-3">
                                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${record.type === "CHECK_IN" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                                                    {record.type === "CHECK_IN" ? "Masuk" : "Pulang"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{new Date(record.timestamp).toLocaleString("id-ID")}</td>
                                            <td className="px-5 py-3">{record.hasImage ? <span className="text-emerald-600">✓ Ada foto</span> : <span className="text-slate-400">Tidak ada</span>}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => openDetail(record)} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200">Detail</button>
                                                    <button
                                                        onClick={() => handleDelete(record.id)}
                                                        disabled={deleting === record.id}
                                                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                                    >
                                                        {deleting === record.id ? "Menghapus..." : "Hapus"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!records.length && (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada absensi pada periode ini.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Detail Modal */}
            {selected && (
                <div className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4" onClick={() => { setSelected(null); setSelectedImage(null); }}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between">
                            <h2 className="text-xl font-black">Detail Absensi</h2>
                            <button onClick={() => { setSelected(null); setSelectedImage(null); }} className="text-slate-400 hover:text-slate-900">✕</button>
                        </div>
                        <p className="mt-3 font-bold">{selected.user.name} · {selected.type === "CHECK_IN" ? "Masuk" : "Pulang"}</p>
                        <p className="text-sm text-slate-500">{new Date(selected.timestamp).toLocaleString("id-ID")}</p>
                        {loadingDetail ? (
                            <div className="mt-4 flex items-center justify-center rounded-xl bg-slate-50 p-8"><p className="text-sm text-slate-500">Memuat foto…</p></div>
                        ) : selectedImage ? (
                            <img src={selectedImage} alt={`Bukti absensi ${selected.user.name}`} className="mt-4 max-h-80 w-full rounded-xl object-contain" />
                        ) : selected.hasImage ? (
                            <div className="mt-4 flex items-center justify-center rounded-xl bg-slate-50 p-8"><p className="text-sm text-slate-500">Foto tidak tersedia</p></div>
                        ) : null}
                        <button onClick={() => { setSelected(null); setSelectedImage(null); }} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-bold text-white">Tutup</button>
                    </div>
                </div>
            )}
        </main></div>
    );
}
