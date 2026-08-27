"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/admin/AdminSidebar";

type Order = {
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    type: string;
    tableNumber: string | null;
    notes: string | null;
    createdAt: string;
    completedAt: string | null;
    cashier: { name: string } | null;
    items: { productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
};

const money = (value: number) => `Rp ${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;
const paymentLabel: Record<string, string> = {
    CASH: "Cash", QRIS: "QRIS", CARD: "Kartu",
    GOPAY: "GoPay", OVO: "OVO", DANA: "DANA",
    BANK_TRANSFER: "Transfer", OTHER: "Lainnya",
};
const typeLabel: Record<string, string> = {
    DINE_IN: "Dine In", TAKE_AWAY: "Takeaway", DELIVERY: "Delivery", ONLINE: "Online",
};

export default function TransactionsPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => {
        const d = new Date(); d.setHours(23, 59, 59, 999);
        return d.toISOString().slice(0, 10);
    });
    const [filterMethod, setFilterMethod] = useState("ALL");
    const [showDetail, setShowDetail] = useState<Order | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("kamikamikita-user");
            if (userStr) setUser(JSON.parse(userStr));
        } catch {
            setUser(null);
        }
    }, []);

    function handleLogout() {
        localStorage.removeItem("kamikamikita-user");
        document.cookie = "kamikamikita-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
    }

    async function fetchOrders() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) { params.set("startDate", new Date(dateFrom + "T00:00:00").toISOString()); }
            if (dateTo) { params.set("endDate", new Date(dateTo + "T23:59:59").toISOString()); }
            params.set("limit", "200");
            const res = await fetch(`/api/orders?${params.toString()}`);
            const data = await res.json();

            const formatted = (data.orders || []).map((o: any) => ({
                ...o,
                totalAmount: Number(o.totalAmount || 0),
                items: (o.items || []).map((i: any) => ({
                    ...i,
                    unitPrice: Number(i.unitPrice || 0),
                    totalPrice: Number(i.totalPrice || 0)
                }))
            }));
            setOrders(formatted);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchOrders(); }, []);

    async function handleDeleteOrder(id: string, orderNumber: string) {
        if (!confirm(`Yakin ingin menghapus transaksi ${orderNumber}? Data penjualan akan dikurangi.`)) return;
        try {
            const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
            if (res.ok) {
                setOrders(prev => prev.filter(o => o.id !== id));
                setShowDetail(null);
                alert("Transaksi berhasil dihapus.");
            } else {
                alert("Gagal menghapus transaksi.");
            }
        } catch (err) {
            alert("Terjadi kesalahan sistem.");
        }
    }

    const filtered = useMemo(() => {
        let result = orders;
        if (filterMethod !== "ALL") {
            result = result.filter((o) => o.paymentMethod === filterMethod);
        }
        return result;
    }, [orders, filterMethod]);

    const summary = useMemo(() => {
        const totalRevenue = filtered.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const totalOrders = filtered.length;
        const cashTotal = filtered.filter((o) => o.paymentMethod === "CASH").reduce((s, o) => s + Number(o.totalAmount || 0), 0);
        const qrisTotal = filtered.filter((o) => o.paymentMethod === "QRIS").reduce((s, o) => s + Number(o.totalAmount || 0), 0);
        const cardTotal = filtered.filter((o) => o.paymentMethod === "CARD" || o.paymentMethod === "GOPAY" || o.paymentMethod === "OVO" || o.paymentMethod === "DANA").reduce((s, o) => s + Number(o.totalAmount || 0), 0);
        return { totalRevenue, totalOrders, cashTotal, qrisTotal, cardTotal };
    }, [filtered]);

    function printClosing() {
        const lines = [
            `═══════════════════════════════════════════════════════════════`,
            `                    KAMI KAMI KITA COFFEE`,
            `                  Laporan Penjualan Harian`,
            `═══════════════════════════════════════════════════════════════`,
            ``,
            `Periode    : ${dateFrom === dateTo ? dateFrom : `${dateFrom} s/d ${dateTo}`}`,
            `Dicetak    : ${new Date().toLocaleString("id-ID")}`,
            `Kasir      : ${user?.name || "-"}`,
            ``,
            `───────────────────────────────────────────────────────────────`,
            `RINGKASAN PENJUALAN`,
            `───────────────────────────────────────────────────────────────`,
            ``,
            `Total Transaksi : ${summary.totalOrders} order`,
            `Total Pendapatan: ${money(summary.totalRevenue)}`,
            `  - Cash        : ${money(summary.cashTotal)}`,
            `  - QRIS        : ${money(summary.qrisTotal)}`,
            `  - Kartu/E-Wallet: ${money(summary.cardTotal)}`,
            ``,
            `───────────────────────────────────────────────────────────────`,
            `DETAIL TRANSAKSI (ITEM, HARGA, SUBTOTAL)`,
            `───────────────────────────────────────────────────────────────`,
            ``,
        ];
        filtered.forEach((o, i) => {
            lines.push(`${i + 1}. Order: ${o.orderNumber}`);
            lines.push(`   Waktu  : ${new Date(o.createdAt).toLocaleString("id-ID")}`);
            lines.push(`   Kasir  : ${o.cashier?.name || "-"}`);
            lines.push(`   Metode : ${paymentLabel[o.paymentMethod] || o.paymentMethod}`);
            o.items.forEach(item => {
                lines.push(`   - ${item.productName} (x${item.quantity}) @${money(item.unitPrice)} = ${money(item.totalPrice)}`);
            });
            lines.push(`   Total  : ${money(o.totalAmount)}`);
            lines.push(``);
        });
        lines.push(`═══════════════════════════════════════════════════════════════`,
            `              Terima kasih telah berbisnis`,
            `═══════════════════════════════════════════════════════════════`);

        const content = lines.join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `Laporan-Penjualan-${dateFrom}.txt`; a.click();
        URL.revokeObjectURL(url);
    }

    function exportToCSV() {
        const headers = ["Order #", "Tanggal", "Kasir", "Tipe", "Metode Bayar", "Item (Nama | Qty | Harga Satuan | Total)", "Total Keseluruhan"];
        const rows = filtered.map(o => [
            o.orderNumber,
            new Date(o.createdAt).toLocaleString("id-ID"),
            o.cashier?.name || "-",
            typeLabel[o.type] || o.type,
            paymentLabel[o.paymentMethod] || o.paymentMethod,
            `"${o.items.map(i => `${i.productName} | x${i.quantity} | ${i.unitPrice} | ${i.totalPrice}`).join(" || ")}"`,
            o.totalAmount
        ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `Laporan-Penjualan-${dateFrom}.csv`; a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-900"><AdminSidebar /><main className="min-w-0 flex-1">
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
                        <a href="/admin/attendance" className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Absensi</a>
                        <a href="/admin/transactions" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900">Transaksi</a>
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
                    <p className="text-xs font-black uppercase tracking-[.25em] text-rose-600">Laporan Penjualan</p>
                    <h1 className="mt-1 text-2xl font-black md:text-3xl">Riwayat Transaksi & Closing</h1>
                    <p className="mt-1 text-sm text-slate-500">Pantau semua transaksi, rincian item makanan/minuman, dan export closing.</p>
                </header>

                <section className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
                    <label className="text-xs font-bold text-slate-500">Dari Tanggal
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                    </label>
                    <label className="text-xs font-bold text-slate-500">Sampai Tanggal
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                    </label>
                    <label className="text-xs font-bold text-slate-500">Metode Bayar
                        <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100">
                            <option value="ALL">Semua</option>
                            <option value="CASH">Cash</option>
                            <option value="QRIS">QRIS</option>
                            <option value="CARD">Kartu</option>
                            <option value="GOPAY">GoPay</option>
                            <option value="OVO">OVO</option>
                            <option value="DANA">DANA</option>
                        </select>
                    </label>
                    <button onClick={fetchOrders} className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">🔍 Tampilkan</button>
                    <button onClick={printClosing} className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800">🖨️ Export Closing</button>
                    <button onClick={exportToCSV} className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">⬇️ CSV</button>
                </section>

                <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-100"><p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Total Pendapatan</p><p className="mt-2 text-2xl font-black">{money(summary.totalRevenue)}</p><p className="mt-1 text-xs text-emerald-100">Periode terpilih</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Order</p><p className="mt-2 text-2xl font-black">{summary.totalOrders}</p><p className="mt-1 text-xs text-slate-400">Rata-rata {summary.totalOrders ? money(summary.totalRevenue / summary.totalOrders) : money(0)} / order</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-500">Cash</p><p className="mt-2 text-2xl font-black text-blue-600">{money(summary.cashTotal)}</p><p className="mt-1 text-xs text-slate-400">Pembayaran tunai</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-purple-500">QRIS</p><p className="mt-2 text-2xl font-black text-purple-600">{money(summary.qrisTotal)}</p><p className="mt-1 text-xs text-slate-400">Pembayaran digital</p></div>
                </section>

                <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b px-5 py-4">
                        <h2 className="font-bold">Daftar Transaksi (Klik baris untuk rincian)</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{filtered.length} data</span>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center p-8"><p className="text-slate-500">Memuat transaksi...</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">Order #</th>
                                        <th className="px-5 py-3">Waktu</th>
                                        <th className="px-5 py-3">Kasir</th>
                                        <th className="px-5 py-3">Rincian Item (Makanan / Minuman & Harga)</th>
                                        <th className="px-5 py-3">Metode</th>
                                        <th className="px-5 py-3 text-right">Total</th>
                                        <th className="px-5 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((order) => (
                                        <tr key={order.id} onClick={() => setShowDetail(order)} className="border-t hover:bg-rose-50/50 cursor-pointer transition">
                                            <td className="px-5 py-3 font-bold">{order.orderNumber}</td>
                                            <td className="px-5 py-3 text-xs text-slate-600">{new Date(order.createdAt).toLocaleString("id-ID")}</td>
                                            <td className="px-5 py-3 text-slate-600">{order.cashier?.name || "-"}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {order.items.map((item, idx) => (
                                                        <span key={idx} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                                            {item.productName} <strong className="text-rose-600">x{item.quantity}</strong> ({money(item.totalPrice)})
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${order.paymentMethod === "CASH" ? "bg-blue-100 text-blue-700" : order.paymentMethod === "QRIS" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}`}>{paymentLabel[order.paymentMethod] || order.paymentMethod}</span></td>
                                            <td className="px-5 py-3 text-right font-black">{money(order.totalAmount)}</td>
                                            <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => setShowDetail(order)} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200">Detail</button>
                                                    <button onClick={() => handleDeleteOrder(order.id, order.orderNumber)} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-100" title="Hapus Transaksi">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-sm text-slate-500">Tidak ada transaksi di periode ini.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {showDetail && (
                <div className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4" onClick={() => setShowDetail(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-3"><h2 className="text-xl font-black">Detail Order</h2><button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-slate-900 font-bold text-xl">✕</button></div>
                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">Order #</span><b>{showDetail.orderNumber}</b></div>
                            <div className="flex justify-between"><span className="text-slate-500">Waktu</span><span>{new Date(showDetail.createdAt).toLocaleString("id-ID")}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Kasir</span><span>{showDetail.cashier?.name || "-"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Tipe</span><span>{typeLabel[showDetail.type] || showDetail.type}</span></div>
                            {showDetail.tableNumber && <div className="flex justify-between"><span className="text-slate-500">Meja</span><span>{showDetail.tableNumber}</span></div>}
                            <div className="flex justify-between"><span className="text-slate-500">Metode Bayar</span><span>{paymentLabel[showDetail.paymentMethod] || showDetail.paymentMethod}</span></div>
                        </div>
                        <div className="mt-4 border-t pt-3 max-h-48 overflow-y-auto">
                            <p className="mb-2 text-xs font-bold text-slate-500">Rincian Item, Qty, & Harga:</p>
                            {showDetail.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-50">
                                    <span>{item.productName} <strong className="text-rose-600">x{item.quantity}</strong> (@{money(item.unitPrice)})</span>
                                    <span className="font-medium">{money(item.totalPrice)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 border-t pt-3">
                            <div className="flex justify-between text-lg font-black"><span>Total</span><span className="text-emerald-600">{money(showDetail.totalAmount)}</span></div>
                        </div>
                        {showDetail.notes && <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Catatan: {showDetail.notes}</p>}

                        <div className="mt-5 flex gap-2">
                            <button onClick={() => handleDeleteOrder(showDetail.id, showDetail.orderNumber)} className="flex-1 rounded-xl bg-rose-50 py-3 font-bold text-rose-600 transition hover:bg-rose-100">Hapus Transaksi</button>
                            <button onClick={() => setShowDetail(null)} className="flex-1 rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:bg-slate-800">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </main></div>
    );
}