"use client";

import { useEffect, useState } from "react";

type Product = { id: string; sku: string; name: string; category: string; sellingPrice: number; stock: number; isActive: boolean };

export default function AdminPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/products")
            .then((res) => res.json())
            .then((data) => setProducts(data.products || []))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen bg-slate-100 p-5 text-slate-900 md:p-10">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-600">Kamikamikita Coffee</p>
                        <h1 className="mt-2 text-3xl font-black">Back Office Admin</h1>
                        <p className="mt-1 text-sm text-slate-500">Kelola produk dan pantau stok kedai.</p>
                    </div>
                    <a href="/kasir" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Buka Kasir</a>
                </div>

                <section className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Total Produk</p><p className="mt-2 text-3xl font-black">{loading ? "-" : products.length}</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Produk Aktif</p><p className="mt-2 text-3xl font-black">{loading ? "-" : products.filter((p) => p.isActive).length}</p></div>
                    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Stok Menipis</p><p className="mt-2 text-3xl font-black">{loading ? "-" : products.filter((p) => p.stock <= 5).length}</p></div>
                </section>

                <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Daftar Produk</h2></div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Produk</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Harga</th><th className="px-5 py-3">Stok</th></tr></thead>
                            <tbody>{products.map((product) => <tr key={product.id} className="border-t border-slate-100"><td className="px-5 py-3">{product.sku}</td><td className="px-5 py-3 font-semibold">{product.name}</td><td className="px-5 py-3">{product.category}</td><td className="px-5 py-3">Rp {product.sellingPrice.toLocaleString("id-ID")}</td><td className={`px-5 py-3 font-bold ${product.stock <= 5 ? "text-rose-600" : "text-emerald-600"}`}>{product.stock}</td></tr>)}</tbody>
                        </table>
                    </div>
                    {!loading && products.length === 0 && <p className="p-6 text-sm text-slate-500">Belum ada produk atau database belum terhubung.</p>}
                </section>
            </div>
        </main>
    );
}
