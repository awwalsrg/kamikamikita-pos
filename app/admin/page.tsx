"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/admin/AdminSidebar";
import SalesChart from "@/app/admin/components/SalesChart";
import {
    TrendingUp, DollarSign, ShoppingCart, Package,
    BarChart3, Plus, RefreshCw, X, AlertTriangle, Download, Calendar, CreditCard, Trophy
} from "lucide-react";

type Product = { id: string; sku: string; name: string; category: string; sellingPrice: number; costPrice: number; stock: number; isAvailable: boolean };
type OrderItem = { productName: string; quantity: number; unitPrice: number; totalPrice: number; costPrice: number };
type Order = { id: string; orderNumber: string; customerName: string; totalAmount: number; paymentMethod: string; profit: number; createdAt: string; items: OrderItem[] };

const CATEGORIES = ["FOOD", "BEVERAGE", "SNACK", "GROCERY", "OTHER"];

function formatRp(n: number) {
    return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function AdminPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [toast, setToast] = useState("");

    // Date Filter State
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(firstDay);
    const [dateTo, setDateTo] = useState(lastDay);

    // Modals & Forms
    const [addOpen, setAddOpen] = useState(false);
    const [addSku, setAddSku] = useState("");
    const [addName, setAddName] = useState("");
    const [addCategory, setAddCategory] = useState("BEVERAGE");
    const [addCostPrice, setAddCostPrice] = useState("");
    const [addSellingPrice, setAddSellingPrice] = useState("");
    const [addStock, setAddStock] = useState("0");
    const [addLoading, setAddLoading] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editCostPrice, setEditCostPrice] = useState("");
    const [editSellingPrice, setEditSellingPrice] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("kamikamikita-user");
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);
                if (userData.role !== "ADMIN") router.push("/login");
            } else { router.push("/login"); }
        } catch { router.push("/login"); }
    }, []);

    useEffect(() => { fetchData(); }, []);

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

    async function fetchData() {
        setLoading(true);
        try {
            const resProd = await fetch("/api/products");
            const dataProd = await resProd.json();
            setProducts(dataProd.products || []);

            const resOrd = await fetch("/api/orders?limit=2000");
            const dataOrd = await resOrd.json();

            const formattedOrders = (dataOrd.orders || []).map((o: any) => {
                const items = (o.items || []).map((i: any) => ({
                    productName: i.productName, quantity: i.quantity,
                    unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice),
                    costPrice: i.product ? Number(i.product.costPrice) : Number(i.unitPrice)
                }));
                const totalCost = items.reduce((sum: number, i: any) => sum + (i.costPrice * i.quantity), 0);
                return {
                    id: o.id, orderNumber: o.orderNumber, customerName: o.customerName || "-",
                    totalAmount: Number(o.totalAmount), paymentMethod: o.paymentMethod || "CASH",
                    profit: Number(o.totalAmount) - totalCost, createdAt: o.createdAt, items
                };
            });
            setOrders(formattedOrders);
        } catch { showToast("Gagal memuat data"); }
        setLoading(false);
    }

    // Handlers for Products
    async function handleAddProduct(e: React.FormEvent) {
        e.preventDefault();
        setAddLoading(true);
        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sku: addSku, name: addName, category: addCategory, costPrice: Number(addCostPrice), sellingPrice: Number(addSellingPrice), initialStock: Number(addStock) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menambah produk");
            showToast("✓ Produk berhasil ditambahkan!");
            setAddOpen(false); setAddSku(""); setAddName(""); setAddCostPrice(""); setAddSellingPrice(""); setAddStock("0");
            fetchData();
        } catch (err) { showToast(err instanceof Error ? err.message : "Gagal"); }
        setAddLoading(false);
    }

    function openEdit(product: Product) {
        setEditProduct(product);
        setEditName(product.name);
        setEditCategory(product.category);
        setEditCostPrice(String(product.costPrice || 0));
        setEditSellingPrice(String(product.sellingPrice));
        setEditOpen(true);
    }

    async function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editProduct) return;
        setEditLoading(true);
        try {
            const res = await fetch(`/api/products/${editProduct.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, category: editCategory, costPrice: Number(editCostPrice), sellingPrice: Number(editSellingPrice) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal update");
            showToast("✓ Produk diupdate!");
            setEditOpen(false); fetchData();
        } catch (err) { showToast(err instanceof Error ? err.message : "Gagal"); }
        setEditLoading(false);
    }

    async function handleDelete(product: Product) {
        if (!confirm(`Hapus "${product.name}"?`)) return;
        try {
            const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast("✓ Produk dihapus"); fetchData();
        } catch (err) { showToast(err instanceof Error ? err.message : "Gagal"); }
    }

    // Analytics Engine & Date Filtering
    const filteredOrders = useMemo(() => {
        const start = new Date(dateFrom); start.setHours(0, 0, 0, 0);
        const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
        return orders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= start && orderDate <= end;
        });
    }, [orders, dateFrom, dateTo]);

    const summary = useMemo(() => {
        const totalOmzet = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const totalProfit = filteredOrders.reduce((sum, o) => sum + o.profit, 0);
        const totalOrders = filteredOrders.length;

        const payment: Record<string, number> = {};
        filteredOrders.forEach(o => {
            payment[o.paymentMethod] = (payment[o.paymentMethod] || 0) + o.totalAmount;
        });

        return { totalOmzet, totalProfit, totalOrders, payment };
    }, [filteredOrders]);

    const bestSellers = useMemo(() => {
        const itemsMap: Record<string, { name: string; qty: number; revenue: number }> = {};
        filteredOrders.forEach(o => {
            o.items.forEach(i => {
                if (!itemsMap[i.productName]) itemsMap[i.productName] = { name: i.productName, qty: 0, revenue: 0 };
                itemsMap[i.productName].qty += i.quantity;
                itemsMap[i.productName].revenue += i.totalPrice;
            });
        });
        return Object.values(itemsMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
    }, [filteredOrders]);

    const chartData = useMemo(() => {
        const days: Record<string, { label: string, omzet: number, hpp: number, profit: number }> = {};
        filteredOrders.forEach(o => {
            const dateLabel = new Date(o.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            if (!days[dateLabel]) days[dateLabel] = { label: dateLabel, omzet: 0, hpp: 0, profit: 0 };
            days[dateLabel].omzet += o.totalAmount;
            days[dateLabel].profit += o.profit;
            days[dateLabel].hpp += (o.totalAmount - o.profit);
        });
        return Object.values(days);
    }, [filteredOrders]);

    const handleExportCSV = () => {
        const headers = ["Tanggal", "No Order", "Customer", "Item", "Metode Bayar", "Omzet", "Profit"];
        const rows = filteredOrders.map(o => {
            const date = new Date(o.createdAt).toLocaleString('id-ID').replace(/,/g, '');
            const items = o.items.map(i => `${i.productName} (x${i.quantity})`).join(" + ");
            return `"${date}","${o.orderNumber}","${o.customerName}","${items}","${o.paymentMethod}","${o.totalAmount}","${o.profit}"`;
        });
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Rekap_${dateFrom}_sd_${dateTo}.csv`);
        document.body.appendChild(link); link.click(); link.remove();
    };

    const lowStockProducts = products.filter(p => p.stock <= 5);

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-900">
            <AdminSidebar />
            <main className="min-w-0 flex-1">
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
                        <a href="/kasir" className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">Buka Kasir</a>
                    </div>
                </nav>

                <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
                    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black md:text-3xl">Dashboard Admin</h1>
                            <p className="text-sm text-slate-500 mt-1">Laporan rekapitulasi penjualan kedai.</p>
                        </div>

                        {/* FILTER KALENDER */}
                        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                            <Calendar size={18} className="text-slate-400 ml-2" />
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm font-bold border-none outline-none bg-transparent" />
                            <span className="text-slate-400">-</span>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm font-bold border-none outline-none bg-transparent" />
                        </div>
                    </header>

                    {/* Low Stock Alert */}
                    {lowStockProducts.length > 0 && (
                        <div className="mb-6 rounded-2xl bg-orange-50 p-5 border border-orange-100">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={18} className="text-orange-600" />
                                <h3 className="font-bold text-orange-800 text-sm">Peringatan Stok Tipis</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {lowStockProducts.map(p => (
                                    <span key={p.id} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-orange-200">
                                        {p.name} <span className="bg-orange-100 px-1.5 rounded font-bold text-orange-600">{p.stock}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ====== ANALYTICS ====== */}
                    <section className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={20} className="text-rose-600" />
                                <h2 className="text-lg font-black">Laporan Penjualan</h2>
                            </div>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm">
                                <Download size={14} /> Download Excel
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 mb-4">
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <p className="text-xs font-bold uppercase text-slate-400">Total Omzet</p>
                                <p className="mt-1 text-3xl font-black text-slate-800">{formatRp(summary.totalOmzet)}</p>
                                <p className="mt-1 text-xs text-slate-400">{summary.totalOrders} Transaksi</p>
                            </div>
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <p className="text-xs font-bold uppercase text-slate-400">Modal Terjual</p>
                                <p className="mt-1 text-3xl font-black text-rose-600">{formatRp(summary.totalOmzet - summary.totalProfit)}</p>
                            </div>
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <p className="text-xs font-bold uppercase text-slate-400">Profit Kotor</p>
                                <p className="mt-1 text-3xl font-black text-emerald-600">{formatRp(summary.totalProfit)}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 mb-4">
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <CreditCard size={18} className="text-blue-600" />
                                    <h3 className="font-bold">Metode Pembayaran (Mutasi)</h3>
                                </div>
                                <div className="space-y-3">
                                    {["CASH", "QRIS", "TRANSFER"].map(method => {
                                        const amount = summary.payment[method] || 0;
                                        const percentage = summary.totalOmzet ? Math.round((amount / summary.totalOmzet) * 100) : 0;
                                        return (
                                            <div key={method} className="flex flex-col">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-bold text-slate-600">{method}</span>
                                                    <span className="font-bold">{formatRp(amount)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Trophy size={18} className="text-amber-500" />
                                    <h3 className="font-bold">Menu Terlaris (Top 5)</h3>
                                </div>
                                {bestSellers.length > 0 ? (
                                    <div className="space-y-3">
                                        {bestSellers.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{index + 1}</div>
                                                    <div>
                                                        <p className="text-sm font-bold">{item.name}</p>
                                                        <p className="text-xs text-slate-400">{item.qty} porsi</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-bold text-emerald-600">{formatRp(item.revenue)}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-400">Belum ada data</p>}
                            </div>
                        </div>

                        {/* Chart */}
                        {chartData.length > 0 && (
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-600 mb-2">Grafik Tren Penjualan</h3>
                                <SalesChart data={chartData} />
                            </div>
                        )}
                    </section>

                    {/* ====== MANAJEMEN PRODUK ====== */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={20} className="text-rose-600" />
                                <h2 className="text-lg font-black">Manajemen Produk</h2>
                            </div>
                            <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700">
                                <Plus size={14} /> Tambah Menu
                            </button>
                        </div>

                        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">SKU</th>
                                            <th className="px-4 py-3">Nama Menu</th>
                                            <th className="px-4 py-3">Kategori</th>
                                            <th className="px-4 py-3">HPP</th>
                                            <th className="px-4 py-3">Jual</th>
                                            <th className="px-4 py-3 text-center">Stok</th>
                                            <th className="px-4 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {products.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                                <td className="px-4 py-3 text-xs">{p.category}</td>
                                                <td className="px-4 py-3 text-rose-600">{formatRp(p.costPrice || 0)}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-medium">{formatRp(p.sellingPrice)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${p.stock <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                                        {p.stock}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => openEdit(p)} className="text-blue-600 mr-3">Edit</button>
                                                    <button onClick={() => handleDelete(p)} className="text-rose-600">Hapus</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* MODALS */}
            {addOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6">
                        <div className="flex justify-between mb-4"><h3 className="text-lg font-bold">Tambah Menu</h3><button onClick={() => setAddOpen(false)}><X size={20} /></button></div>
                        <form onSubmit={handleAddProduct} className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-500">SKU</label><input required type="text" value={addSku} onChange={e => setAddSku(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500">Nama Menu</label><input required type="text" value={addName} onChange={e => setAddName(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500">Kategori</label><select value={addCategory} onChange={e => setAddCategory(e.target.value)} className="w-full border p-2 rounded-lg">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500">Modal/HPP</label><input required type="number" value={addCostPrice} onChange={e => setAddCostPrice(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                <div><label className="text-xs font-bold text-slate-500">Harga Jual</label><input required type="number" value={addSellingPrice} onChange={e => setAddSellingPrice(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-slate-500">Stok Awal</label><input required type="number" value={addStock} onChange={e => setAddStock(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                            <button disabled={addLoading} type="submit" className="w-full bg-rose-600 text-white font-bold py-2 rounded-lg">{addLoading ? "Menyimpan..." : "Simpan"}</button>
                        </form>
                    </div>
                </div>
            )}

            {editOpen && editProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6">
                        <div className="flex justify-between mb-4"><h3 className="text-lg font-bold">Edit Menu</h3><button onClick={() => setEditOpen(false)}><X size={20} /></button></div>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-500">Nama Menu</label><input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500">Kategori</label><select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="w-full border p-2 rounded-lg">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500">Modal/HPP</label><input required type="number" value={editCostPrice} onChange={e => setEditCostPrice(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                                <div><label className="text-xs font-bold text-slate-500">Harga Jual</label><input required type="number" value={editSellingPrice} onChange={e => setEditSellingPrice(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                            </div>
                            <button disabled={editLoading} type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">{editLoading ? "Menyimpan..." : "Update"}</button>
                        </form>
                    </div>
                </div>
            )}

            {toast && <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>}
        </div>
    );
}
