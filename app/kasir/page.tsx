"use client";

import { useState, useEffect } from "react";

// Types
interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    sellingPrice: number;
    imageUrl?: string | null;
    stock: number;
}

interface CartItem {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    imageUrl?: string | null;
}

export default function KasirPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
    const [paidAmount, setPaidAmount] = useState("");
    const [processing, setProcessing] = useState(false);
    const [successOrder, setSuccessOrder] = useState<any>(null);

    // Fetch products
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/products?available=true");
            const data = await res.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter products
    const categories = ["ALL", ...new Set(products.map((p) => p.category))];
    const filteredProducts = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        const matchCategory = selectedCategory === "ALL" || p.category === selectedCategory;
        return matchSearch && matchCategory && p.stock > 0;
    });

    // Cart functions
    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.productId === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    alert("Stok tidak cukup!");
                    return prev;
                }
                return prev.map((item) =>
                    item.productId === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1,
                            subtotal: (item.quantity + 1) * item.price,
                        }
                        : item
                );
            }
            return [
                ...prev,
                {
                    id: Math.random().toString(36).substring(7),
                    productId: product.id,
                    name: product.name,
                    price: product.sellingPrice,
                    quantity: 1,
                    subtotal: product.sellingPrice,
                    imageUrl: product.imageUrl,
                },
            ];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.productId !== productId));
    };

    const updateQuantity = (productId: string, qty: number) => {
        if (qty <= 0) {
            removeFromCart(productId);
            return;
        }
        const product = products.find((p) => p.id === productId);
        if (product && qty > product.stock) {
            alert("Stok tidak cukup!");
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.productId === productId
                    ? { ...item, quantity: qty, subtotal: qty * item.price }
                    : item
            )
        );
    };

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const taxRate = 0.11; // PPN 11%
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    const paid = parseFloat(paidAmount) || 0;
    const changeAmount = paid > totalAmount ? paid - totalAmount : 0;

    // Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert("Keranjang kosong!");
            return;
        }
        if (paymentMethod === "CASH" && paid < totalAmount) {
            alert("Uang pembayaran kurang!");
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                    subtotal,
                    taxAmount,
                    totalAmount,
                    paymentMethod,
                    paidAmount: paid,
                    changeAmount,
                    type: "DINE_IN",
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccessOrder(data.order);
            setCart([]);
            setPaidAmount("");
            fetchProducts(); // Refresh stock
        } catch (error) {
            alert(error instanceof Error ? error.message : "Checkout failed");
        } finally {
            setProcessing(false);
        }
    };

    if (successOrder) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <div className="text-green-500 text-6xl mb-4">✓</div>
                        <h2 className="text-2xl font-bold">Pesanan Berhasil!</h2>
                        <p className="text-gray-600">Order #{successOrder.orderNumber}</p>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>Rp {subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>PPN (11%)</span>
                            <span>Rp {taxAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>Rp {totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Dibayar</span>
                            <span>Rp {successOrder.paidAmount?.toLocaleString() || "-"}</span>
                        </div>
                        {successOrder.changeAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Kembalian</span>
                                <span>Rp {successOrder.changeAmount?.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setSuccessOrder(null)}
                        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                    >
                        Transaksi Baru
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Products Section */}
            <div className="flex-1 p-4">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold mb-2">POS Kasir</h1>
                    <input
                        type="text"
                        placeholder="Cari produk..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-2 mb-4 overflow-x-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === cat
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-700 border"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProducts.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white p-3 rounded-lg shadow hover:shadow-md text-left"
                            >
                                <div className="aspect-square bg-gray-200 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-gray-400 text-4xl">📦</span>
                                    )}
                                </div>
                                <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                <p className="text-blue-600 font-bold">
                                    Rp {product.sellingPrice.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">Stok: {product.stock}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Section */}
            <div className="w-96 bg-white border-l flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Keranjang</h2>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">Keranjang kosong</p>
                    ) : (
                        cart.map((item) => (
                            <div key={item.productId} className="border-b pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-sm">{item.name}</h4>
                                        <p className="text-blue-600 text-sm">
                                            Rp {item.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.productId)}
                                        className="text-red-500 text-sm"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        onClick={() =>
                                            updateQuantity(item.productId, item.quantity - 1)
                                        }
                                        className="w-8 h-8 bg-gray-200 rounded"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() =>
                                            updateQuantity(item.productId, item.quantity + 1)
                                        }
                                        className="w-8 h-8 bg-gray-200 rounded"
                                    >
                                        +
                                    </button>
                                    <span className="ml-auto font-medium">
                                        Rp {item.subtotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Payment Section */}
                {cart.length > 0 && (
                    <div className="p-4 border-t space-y-3">
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>Rp {subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>PPN (11%)</span>
                                <span>Rp {taxAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>Rp {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Metode Pembayaran</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full mt-1 p-2 border rounded-lg"
                            >
                                <option value="CASH">Cash</option>
                                <option value="QRIS">QRIS</option>
                                <option value="CARD">Card</option>
                                <option value="GOPAY">GoPay</option>
                                <option value="OVO">OVO</option>
                                <option value="DANA">DANA</option>
                            </select>
                        </div>

                        {paymentMethod === "CASH" && (
                            <div>
                                <label className="text-sm font-medium">Uang Dibayar</label>
                                <input
                                    type="number"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full mt-1 p-2 border rounded-lg"
                                />
                                {paid > totalAmount && (
                                    <p className="text-sm text-green-600 mt-1">
                                        Kembalian: Rp {changeAmount.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleCheckout}
                            disabled={processing}
                            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                        >
                            {processing ? "Processing..." : `Bayar Rp ${totalAmount.toLocaleString()}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
