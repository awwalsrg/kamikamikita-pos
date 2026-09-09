"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

type Product = {
    id: string;
    name: string;
    category: string;
    sellingPrice: number;
    stock: number;
    imageUrl?: string;
};

function formatRp(n: number) {
    return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function MenuPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("ALL");

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await fetch("/api/products");
                const data = await res.json();
                setProducts(data.products || []);
            } catch (err) {
                console.error("Gagal memuat menu", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMenu();
    }, []);

    const categories = ["ALL", "FOOD", "BEVERAGE", "SNACK", "GROCERY"];

    const filteredProducts = selectedCategory === "ALL"
        ? products
        : products.filter(p => p.category === selectedCategory);

    return (
        <div className="min-h-screen bg-[#4A1515] text-[#FDF8F6] p-4 md:p-8">
            {/* Header Navigasi */}
            <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 pb-4 border-b border-[#FDF8F6]/20">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm bg-[#5E1A1A] hover:bg-[#6e1f1f] px-4 py-2 rounded-xl transition border border-[#FDF8F6]/30"
                >
                    <ArrowLeft size={16} />
                    <span>Kembali</span>
                </Link>
                <h1 className="text-xl font-black tracking-wider">MENU KAMI KITA</h1>
                <Link
                    href="/kasir"
                    className="flex items-center gap-1.5 text-xs bg-[#FDF8F6] text-[#4A1515] px-3 py-2 rounded-xl font-bold hover:bg-white shadow"
                >
                    <ShoppingBag size={14} />
                    <span>Pesan</span>
                </Link>
            </div>

            {/* Filter Kategori */}
            <div className="max-w-4xl mx-auto flex overflow-x-auto gap-2 pb-4 mb-6 no-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat
                                ? "bg-[#FDF8F6] text-[#4A1515]"
                                : "bg-[#5E1A1A] text-[#FDF8F6]/80 border border-[#FDF8F6]/20 hover:bg-[#6e1f1f]"
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid Foto Menu */}
            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <div className="text-center py-20 text-[#FDF8F6]/60">Memuat daftar menu...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 text-[#FDF8F6]/60">Belum ada menu di kategori ini.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                className="bg-[#5E1A1A]/80 border border-[#FDF8F6]/20 rounded-2xl p-4 flex flex-col justify-between shadow-lg overflow-hidden"
                            >
                                {/* Bagian Foto / Placeholder Ilustrasi Menu */}
                                <div className="w-full h-36 bg-[#4A1515] rounded-xl mb-3 flex items-center justify-center border border-[#FDF8F6]/10 relative overflow-hidden">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-[#FDF8F6]/30">☕ KamiKita</span>
                                    )}
                                    <span className="absolute top-2 right-2 bg-black/40 text-[10px] px-2 py-0.5 rounded-full text-[#FDF8F6]">
                                        {product.category}
                                    </span>
                                </div>

                                {/* Info Menu */}
                                <div>
                                    <h3 className="font-bold text-sm md:text-base line-clamp-1 text-[#FDF8F6]">{product.name}</h3>
                                    <p className="text-amber-200 font-extrabold text-sm mt-1">{formatRp(product.sellingPrice)}</p>
                                </div>

                                {/* Status Stok */}
                                <div className="mt-3 pt-3 border-t border-[#FDF8F6]/10 flex items-center justify-between text-xs">
                                    <span className={product.stock > 0 ? "text-emerald-300" : "text-rose-300"}>
                                        {product.stock > 0 ? "Tersedia" : "Habis"}
                                    </span>
                                    <Link
                                        href="/kasir"
                                        className="text-xs bg-[#FDF8F6]/10 hover:bg-[#FDF8F6]/20 px-2.5 py-1 rounded-lg text-[#FDF8F6] transition font-medium"
                                    >
                                        Pesan
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}