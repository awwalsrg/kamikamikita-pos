"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Camera, Coffee, Cookie, History, LayoutGrid, Minus, Plus, Printer, Trash2, Utensils, X, Search, LogOut, UserCircle, ShoppingBag } from "lucide-react";
import { formatRp, CartItem, HeldBill, TransactionRecord } from "./constants";

const POLL_INTERVAL = 5000;

interface ProductMenuItem {
    sku: string;
    name: string;
    category: string;
    price: number;
    icon: string;
    imageUrl?: string | null;
    stock: number;
    isAvailable: boolean;
}

const getCategoryIcon = (category: string): string => {
    switch (category) {
        case "BEVERAGE": return "☕";
        case "FOOD": return "🍛";
        case "SNACK": return "🥟";
        default: return "📦";
    }
};

// ==========================================
// KOMPONEN PIN OVERLAY (GEMBOK KASIR)
// ==========================================
function PinOverlay({ onSuccess }: { onSuccess: () => void }) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const CORRECT_PIN = "1818"; // PIN kasir diubah ke 1818

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d{0,4}$/.test(value)) {
            setPin(value);
            setError(false);
            if (value.length === 4) {
                if (value === CORRECT_PIN) {
                    onSuccess();
                } else {
                    setError(true);
                    setPin("");
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center w-96 border-2 border-rose-950">
                <h2 className="text-2xl font-black mb-2 text-rose-950 uppercase tracking-widest">
                    Masukan PIN Kasir
                </h2>
                <p className="text-slate-500 mb-6 text-sm font-bold">
                    Untuk keamanan shift, silakan masukkan PIN Anda.
                </p>
                <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={pin}
                    onChange={handlePinChange}
                    className={`w-full text-center text-4xl tracking-[1em] p-4 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all font-black ${error
                        ? "border-red-500 focus:ring-red-200 bg-red-50 text-red-500"
                        : "border-rose-950 focus:border-rose-950 focus:ring-rose-100 bg-white text-rose-950"
                        }`}
                    placeholder="••••"
                />
                {error && (
                    <p className="text-red-500 mt-4 text-sm animate-bounce font-black uppercase tracking-wider">
                        PIN salah, silakan coba lagi!
                    </p>
                )}
            </div>
        </div>
    );
}

export default function KasirPage() {
    // State Gembok PIN Kasir
    const [isUnlocked, setIsUnlocked] = useState(false);

    const [tab, setTab] = useState<"kasir" | "history" | "attendance">("kasir");
    const [category, setCategory] = useState("SEMUA");
    const [query, setQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customer, setCustomer] = useState("");
    const [table, setTable] = useState("");
    const [discount, setDiscount] = useState<number | "">("");

    // State untuk Bill Gantung & Riwayat
    const [held, setHeld] = useState<HeldBill[]>([]);
    const [history, setHistory] = useState<TransactionRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // UI States
    const [sidebar, setSidebar] = useState(true);
    const [mobileCart, setMobileCart] = useState(false);
    const [toast, setToast] = useState("");
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paidAmount, setPaidAmount] = useState("");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [lastOrder, setLastOrder] = useState<any>(null);
    const [successModal, setSuccessModal] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [qrisWaiting, setQrisWaiting] = useState(false);

    // Tab Navigasi Kolom Kanan (Pesanan vs Tahan Bill)
    const [rightTab, setRightTab] = useState<"ORDER" | "HELD">("ORDER");

    // Order Type (Dine In / Takeaway)
    const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");

    // Attendance States
    const videoRef = useRef<HTMLVideoElement>(null);
    const [camera, setCamera] = useState(false);
    const [attendanceType, setAttendanceType] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");
    const [attendanceMessage, setAttendanceMessage] = useState("");
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState("");

    // Menu States
    const [menuItems, setMenuItems] = useState<ProductMenuItem[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeUser, setActiveUser] = useState<any>(null);

    // ==========================================
    // DATA FETCHING (PRODUK & BILL GANTUNG CLOUD)
    // ==========================================

    const fetchProducts = useCallback(async (showRefreshIndicator = false) => {
        try {
            if (showRefreshIndicator) setIsRefreshing(true);
            const response = await fetch("/api/products", {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache"
                },
            });
            if (!response.ok) throw new Error("Failed to fetch products");

            const data = await response.json();
            const items: ProductMenuItem[] = (data.products || []).map((product: any) => ({
                sku: product.sku,
                name: product.name,
                category: product.category || "OTHER",
                price: product.sellingPrice,
                icon: getCategoryIcon(product.category),
                imageUrl: product.imageUrl,
                stock: product.stock || 0,
                isAvailable: product.isAvailable ?? true,
            }));

            setMenuItems(items);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            if (showRefreshIndicator) setIsRefreshing(false);
        }
    }, []);

    const loadHeldBills = useCallback(async () => {
        try {
            const res = await fetch("/api/held-bills");
            if (res.ok) {
                const data = await res.json();
                setHeld(data.heldBills || []);
            }
        } catch (e) {
            console.error("Gagal load bill gantung dari server", e);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
        loadHeldBills();
        fetch("/api/users")
            .then(res => res.json())
            .then(data => setStaff(data.users || []))
            .catch(() => setStaff([]));

        try {
            setActiveUser(JSON.parse(localStorage.getItem("kamikamikita-user") || "null"));
        } catch { }

        const intervalId = setInterval(() => {
            fetchProducts(true);
            loadHeldBills();
        }, POLL_INTERVAL);

        return () => {
            clearInterval(intervalId);
            stopCamera();
        };
    }, [fetchProducts, loadHeldBills]);

    // ==========================================
    // KASIR LOGIC
    // ==========================================

    const filtered = useMemo(() => menuItems.filter(item =>
        (category === "SEMUA" || item.category === category) &&
        `${item.name} ${item.sku}`.toLowerCase().includes(query.toLowerCase())
    ), [category, query, menuItems]);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = Math.max(0, subtotal - Number(discount || 0));

    const add = (product: any) => setCart(prev => {
        const existing = prev.find(item => item.sku === product.sku);
        if (existing) {
            return prev.map(item =>
                item.sku === product.sku
                    ? { ...item, qty: item.qty + 1 }
                    : item
            );
        }
        return [...prev, { ...product, qty: 1 }];
    });

    const changeQty = (sku: string, amount: number) => setCart(prev =>
        prev.map(item =>
            item.sku === sku
                ? { ...item, qty: Math.max(1, item.qty + amount) }
                : item
        )
    );

    const clearCart = () => {
        setCart([]);
        setCustomer("");
        setTable("");
        setDiscount("");
    };

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(""), 2500);
    };

    // ==========================================
    // LOGIKA BILL GANTUNG SINKRON SERVER
    // ==========================================

    const holdBill = async () => {
        if (!cart.length) {
            showToast("Keranjang kosong!");
            return;
        }

        try {
            const res = await fetch("/api/held-bills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: customer || "Tanpa Nama",
                    tableNumber: table || "-",
                    items: cart
                })
            });

            if (!res.ok) throw new Error();

            await loadHeldBills();
            clearCart();
            showToast("Bill sukses disinkronisasi ☁️");
            setRightTab("HELD"); // Langsung buka tab "Tahan Bill" setelah menyimpan
        } catch (error) {
            showToast("Gagal sinkron bill ke server");
        }
    };

    const resumeBill = async (bill: any) => {
        setCart(bill.items);
        setCustomer(bill.customerName === "Tanpa Nama" ? "" : bill.customerName);
        setTable(bill.tableNumber === "-" ? "" : bill.tableNumber);
        setDiscount("");

        setHeld(prev => prev.filter(x => x.id !== bill.id));
        setRightTab("ORDER"); // Balik ke tab "Pesanan" saat bill ditarik

        try {
            await fetch(`/api/held-bills/${bill.id}`, { method: "DELETE" });
        } catch (e) {
            console.error("Gagal hapus bill di server");
        }
    };

    const deleteHeldBill = async (id: string) => {
        setHeld(prev => prev.filter(x => x.id !== id));
        try {
            await fetch(`/api/held-bills/${id}`, { method: "DELETE" });
        } catch (e) {
            console.error("Gagal hapus bill");
        }
    };

    // ==========================================
    // LOGIKA PEMBAYARAN & CETAK
    // ==========================================

    const openPayment = () => {
        if (!cart.length) {
            showToast("Keranjang kosong");
            return;
        }
        setPaidAmount(String(Math.ceil(total)));
        setPaymentMethod("CASH");
        setPaymentOpen(true);
    };

    async function completePayment(inputPaid?: number) {
        const paid = inputPaid ?? Number(paidAmount);

        if (!Number.isFinite(paid) || paid < total) {
            showToast("Nominal pembayaran kurang");
            return;
        }

        setPaymentLoading(true);

        try {
            let cashierId: string | undefined;
            try {
                cashierId = JSON.parse(localStorage.getItem("kamikamikita-user") || "null")?.id;
            } catch { /* ignore */ }

            const payloadItems = cart.map(item => ({
                productId: item.sku,
                quantity: item.qty,
                price: item.price
            }));

            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: customer || undefined,
                    tableNumber: table || undefined,
                    cashierId,
                    items: payloadItems,
                    subtotal,
                    taxAmount: 0,
                    totalAmount: total,
                    paymentMethod,
                    paidAmount: paid,
                    changeAmount: paid - total
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Pembayaran gagal");

            const orderData = {
                orderNumber: data.order?.orderNumber || "KKK-" + Date.now().toString().slice(-6),
                customerName: customer || "Umum",
                tableNumber: table || "-",
                items: [...cart],
                subtotal,
                discount: Number(discount || 0),
                total,
                paidAmount: paid,
                changeAmount: paid - total,
                paymentMethod,
                date: new Date().toLocaleString("id-ID"),
            };

            setLastOrder(orderData);
            clearCart();
            setPaymentOpen(false);
            setPaidAmount("");
            setSuccessModal(true);

        } catch (error) {
            showToast(error instanceof Error ? error.message : "Pembayaran gagal");
        } finally {
            setPaymentLoading(false);
        }
    }

    function printReceiptData(orderObj: any) {
        setPrinting(true);
        try {
            const printWindow = window.open('', '_blank', 'width=350,height=600');
            if (!printWindow) {
                alert("Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak struk.");
                setPrinting(false);
                return;
            }

            const htmlContent = `
                <html>
                <head>
                    <title>Struk - ${orderObj.orderNumber}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; width: 58mm; margin: 0; padding: 5px; font-size: 12px; color: #000; background: #fff; }
                        .center { text-align: center; }
                        .bold { font-weight: bold; }
                        .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                        .flex { display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <div class="center bold" style="font-size: 14px;">KAMI KITA COFFEE</div>
                    <div class="center" style="font-size: 10px;">Slow Bar & Mini Coffee Shop</div>
                    <div class="line"></div>
                    <div>No Order : ${orderObj.orderNumber}</div>
                    <div>Tanggal  : ${orderObj.date}</div>
                    <div>Customer : ${orderObj.customerName}</div>
                    ${orderObj.tableNumber && orderObj.tableNumber !== "-" ? `<div>Meja     : ${orderObj.tableNumber}</div>` : ""}
                    <div class="line"></div>
                    <div>
                        ${orderObj.items.map((i: any) => `
                            <div>${i.productName || i.name}</div>
                            <div class="flex">
                                <span>&nbsp;${i.quantity || i.qty}x @${(i.unitPrice || i.price).toLocaleString("id-ID")}</span>
                                <span>${((i.quantity || i.qty) * (i.unitPrice || i.price)).toLocaleString("id-ID")}</span>
                            </div>
                        `).join("")}
                    </div>
                    <div class="line"></div>
                    <div class="flex">
                        <span>Subtotal</span>
                        <span>Rp ${orderObj.subtotal.toLocaleString("id-ID")}</span>
                    </div>
                    ${orderObj.discount > 0 ? `
                    <div class="flex">
                        <span>Diskon</span>
                        <span>Rp ${orderObj.discount.toLocaleString("id-ID")}</span>
                    </div>` : ""}
                    <div class="flex bold" style="font-size: 13px;">
                        <span>TOTAL</span>
                        <span>Rp ${(orderObj.totalAmount ?? orderObj.total).toLocaleString("id-ID")}</span>
                    </div>
                    <div class="flex">
                        <span>Bayar (${orderObj.paymentMethod})</span>
                        <span>Rp ${orderObj.paidAmount.toLocaleString("id-ID")}</span>
                    </div>
                    <div class="flex">
                        <span>Kembali</span>
                        <span>Rp ${orderObj.changeAmount.toLocaleString("id-ID")}</span>
                    </div>
                    <div class="line"></div>
                    <div class="center" style="margin-top: 10px;">Terima Kasih!</div>
                    <div class="center">Silakan Datang Kembali</div>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
                setPrinting(false);
                setSuccessModal(false);
                showToast("✓ Membuka menu cetak struk");
            }, 500);
        } catch (err) {
            console.error(err);
            setPrinting(false);
        }
    }

    // ==========================================
    // ABSENSI
    // ==========================================

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCamera(true);
                setAttendanceMessage("Kamera siap.");
            }
        } catch {
            setAttendanceMessage("Kamera tidak bisa dibuka. Izinkan akses kamera.");
        }
    }

    function stopCamera() {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setCamera(false);
    }

    function capturePhoto() {
        const video = videoRef.current;
        if (!video?.videoWidth) return "";
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.75);
    }

    async function submitAttendance() {
        if (!camera) {
            setAttendanceMessage("Aktifkan kamera terlebih dahulu.");
            return;
        }

        const userId = selectedStaffId || (() => {
            try {
                return JSON.parse(localStorage.getItem("kamikamikita-user") || "null")?.id || "";
            } catch { return ""; }
        })();

        if (!userId) {
            setAttendanceMessage("Pilih nama karyawan terlebih dahulu.");
            return;
        }

        setAttendanceLoading(true);
        setAttendanceMessage("Menyimpan foto absensi...");

        try {
            const response = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    type: attendanceType,
                    imageUrl: capturePhoto(),
                    deviceInfo: navigator.userAgent
                })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Gagal menyimpan absensi");
            }

            setAttendanceMessage(`Berhasil absen ${attendanceType === "CHECK_IN" ? "masuk" : "pulang"}.`);
            showToast("Foto absensi tersimpan");
        } catch (error) {
            setAttendanceMessage(error instanceof Error ? error.message : "Gagal menyimpan absensi");
        }

        setAttendanceLoading(false);
    }

    // ==========================================
    // RENDER HALAMAN
    // ==========================================

    return (
        <div className="flex h-screen w-full overflow-hidden bg-white text-slate-800 font-sans">

            {/* GEMBOK PIN KASIR */}
            {!isUnlocked && <PinOverlay onSuccess={() => setIsUnlocked(true)} />}

            {/* KONTEN UTAMA KASIR */}
            <div className={`flex flex-1 overflow-hidden transition-opacity duration-500 w-full ${!isUnlocked ? "opacity-0 pointer-events-none" : "opacity-100"}`}>

                {/* TEMA FIGMA: Sidebar Kiri Maroon */}
                {/* RESPONSIVE FIX: Sidebar jadi lebih kecil (w-56) di layar iPad, w-64 di laptop */}
                <aside className={`${sidebar ? "w-56 xl:w-64" : "w-0"} hidden shrink-0 flex-col overflow-hidden bg-rose-950 text-white shadow-xl transition-all duration-300 md:flex z-10 relative`}>

                    <div className="flex items-center gap-3 p-5 xl:p-6 border-b border-rose-900">
                        <div className="flex flex-col min-w-0 pt-2">
                            <span className="font-black text-xl xl:text-2xl tracking-widest text-white uppercase drop-shadow-md">
                                KAMIKAMIKITA
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-5 xl:px-6 py-5 border-b border-rose-900 mb-2">
                        <div className="h-9 w-9 rounded-full bg-rose-800 flex items-center justify-center border border-rose-700 shrink-0">
                            <UserCircle size={20} className="text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white truncate">
                                {activeUser?.name || "Kasir"}
                            </span>
                            <span className="text-[10px] text-rose-300 uppercase tracking-wider">
                                {activeUser?.role || "Staff"}
                            </span>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-2">
                        <SidebarItem
                            icon={<LayoutGrid size={20} />}
                            label="POS / Kasir"
                            active={tab === "kasir"}
                            onClick={() => setTab("kasir")}
                        />
                        <SidebarItem
                            icon={<History size={20} />}
                            label="Riwayat Transaksi"
                            active={tab === "history"}
                            onClick={() => setTab("history")}
                        />
                        <SidebarItem
                            icon={<Camera size={20} />}
                            label="Absensi Wajah"
                            active={tab === "attendance"}
                            onClick={() => setTab("attendance")}
                        />
                    </nav>

                    <div className="p-4 border-t border-rose-900">
                        <button
                            onClick={() => { localStorage.removeItem("kamikamikita-user"); window.location.href = "/login"; }}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-900 hover:text-white"
                        >
                            <LogOut size={20} /> Keluar Akun
                        </button>
                    </div>
                </aside>

                {/* RESPONSIVE FIX: Ditambah pb-24 untuk mobile agar konten tidak tertutup Floating Bottom Nav */}
                <main className="flex min-w-0 flex-1 flex-col overflow-hidden relative bg-white pb-24 md:pb-0">

                    {/* Header Desktop Clean */}
                    <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-rose-100 bg-white px-6 md:flex">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebar(!sidebar)}
                                className="rounded-lg p-2 text-rose-900 hover:bg-rose-50 hidden md:block transition"
                            >
                                <MenuIcon />
                            </button>
                            <h1 className="text-xl font-black text-rose-950">
                                {tab === "kasir" ? "Kasir Utama" : tab === "history" ? "Riwayat Transaksi" : "Absensi Staf"}
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block text-sm">
                                <div className="font-bold text-rose-950">
                                    {new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="text-xs font-bold text-rose-900/60">
                                    {new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Header Mobile */}
                    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-rose-100 bg-white px-4 shadow-sm md:hidden">
                        <button
                            onClick={() => setTab("kasir")}
                            className="rounded-lg p-2 text-rose-950 font-black text-xs uppercase tracking-widest"
                        >
                            KAMIKAMIKITA
                        </button>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Cari menu..."
                            className="flex-1 rounded-full border-2 border-rose-900 bg-white px-4 py-2 text-sm font-bold text-rose-950 outline-none"
                        />
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">

                        {/* Tampilan Menu / Kasir */}
                        {tab === "kasir" && (
                            <div className="flex flex-col h-full">

                                {/* TEMA FIGMA: Pencarian & Kategori dengan Border Maroon */}
                                {/* RESPONSIVE FIX: Layout barisan atas jadi responsif biar gak kepotong di iPad */}
                                <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                                    {/* Kolom Pencarian */}
                                    <div className="relative w-full max-w-[200px] lg:max-w-xs xl:max-w-sm hidden md:block shrink-0">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-900" size={20} />
                                        <input
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            placeholder="Cari nama menu atau SKU..."
                                            className="w-full rounded-full border-2 border-rose-950 bg-white py-3 pl-12 pr-5 text-sm font-bold text-rose-950 placeholder-rose-900/50 outline-none transition focus:ring-4 focus:ring-rose-100"
                                        />
                                    </div>

                                    {/* Kategori Bentuk Pil Border Maroon */}
                                    {/* RESPONSIVE FIX: Flex-1 dan justify-end biar tombol menyesuaikan layar */}
                                    <div className="flex gap-3 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar flex-1 xl:justify-end">
                                        {[{ label: "Semua Menu", cat: "SEMUA" }, { label: "BEVERAGE", cat: "BEVERAGE" }, { label: "FOOD", cat: "FOOD" }, { label: "SNACK", cat: "SNACK" }].map(c => (
                                            <button
                                                key={c.cat}
                                                onClick={() => setCategory(c.cat)}
                                                className={`whitespace-nowrap rounded-full px-5 lg:px-6 py-2.5 text-xs lg:text-sm font-black border-2 border-rose-950 transition uppercase tracking-wider ${category === c.cat
                                                    ? "bg-rose-950 text-white shadow-md"
                                                    : "bg-white text-rose-950 hover:bg-rose-50"
                                                    }`}
                                            >
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* TEMA FIGMA: Grid Menu Kotak Rounded Border Maroon */}
                                {/* RESPONSIVE FIX: Jumlah kolom disesuaikan ukuran layar iPad */}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-20 md:pb-0">
                                    {filtered.map(item => (
                                        <button
                                            key={item.sku}
                                            onClick={() => add(item)}
                                            className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-rose-950 bg-white text-center shadow-sm transition hover:bg-rose-50 active:scale-95 aspect-square sm:aspect-[4/5] p-3"
                                        >
                                            <div className="relative flex-1 w-full bg-white flex items-center justify-center overflow-hidden rounded-xl">
                                                {item.imageUrl ? (
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-110 rounded-xl"
                                                    />
                                                ) : (
                                                    <span className="text-6xl drop-shadow-sm transition duration-300 group-hover:scale-110">
                                                        {item.icon}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col justify-end pt-3 pb-1 w-full">
                                                <b className="line-clamp-2 text-xs md:text-sm font-black text-rose-950 uppercase tracking-tight leading-tight">
                                                    {item.name}
                                                </b>
                                                <strong className="mt-1 text-sm md:text-base font-bold text-rose-800">
                                                    {formatRp(item.price)}
                                                </strong>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tampilan Riwayat Transaksi */}
                        {tab === "history" && (
                            <HistoryPanel
                                onReprint={(tx) => {
                                    printReceiptData({
                                        orderNumber: tx.orderNumber,
                                        customerName: tx.customerName || "Umum",
                                        tableNumber: tx.tableNumber || "-",
                                        items: tx.items,
                                        subtotal: tx.subtotal,
                                        discount: 0,
                                        totalAmount: tx.totalAmount,
                                        paidAmount: tx.paidAmount,
                                        changeAmount: tx.changeAmount,
                                        paymentMethod: tx.paymentMethod,
                                        date: new Date(tx.createdAt).toLocaleString("id-ID")
                                    });
                                }}
                                printing={printing}
                            />
                        )}

                        {/* Tampilan Absensi */}
                        {tab === "attendance" && (
                            <AttendancePanel
                                videoRef={videoRef}
                                camera={camera}
                                startCamera={startCamera}
                                stopCamera={stopCamera}
                                type={attendanceType}
                                setType={setAttendanceType}
                                submit={submitAttendance}
                                loading={attendanceLoading}
                                message={attendanceMessage}
                                staff={staff}
                                selectedStaffId={selectedStaffId}
                                setSelectedStaffId={setSelectedStaffId}
                            />
                        )}
                    </div>
                </main>

                {/* TEMA FIGMA: Sidebar Keranjang Kanan Maroon */}
                {/* RESPONSIVE FIX: Lebar sidebar kanan disesuaikan jadi 300px/340px untuk layar medium (iPad) */}
                <aside className="hidden w-[300px] lg:w-[340px] xl:w-[400px] shrink-0 flex-col border-l border-rose-900 bg-rose-950 shadow-2xl md:flex z-20 text-white">

                    <div className="flex items-center justify-between border-b border-rose-900 px-6 py-5 bg-rose-950">
                        <h2 className="text-lg xl:text-xl font-black text-white flex items-center gap-2">
                            <ShoppingBag size={22} className="text-rose-300" />
                            {rightTab === "ORDER" ? "Pesanan Saat Ini" : "Daftar Tahan Bill"}
                        </h2>
                    </div>

                    {/* NAVIGASI 3 KOLOM: Dine In | Takeaway | Tahan Bill */}
                    <div className="border-b border-rose-900 bg-rose-950 p-4 xl:p-5 space-y-4">
                        <div className="flex rounded-xl bg-rose-900/50 p-1.5 border border-rose-800">
                            <button
                                onClick={() => { setRightTab("ORDER"); setOrderType("DINE_IN"); }}
                                className={`flex-1 rounded-lg py-2.5 text-[10px] xl:text-xs font-black transition uppercase tracking-wider ${rightTab === "ORDER" && orderType === "DINE_IN" ? "bg-white text-rose-950 shadow-sm" : "text-rose-200 hover:text-white"
                                    }`}
                            >
                                Di Tempat
                            </button>
                            <button
                                onClick={() => { setRightTab("ORDER"); setOrderType("TAKEAWAY"); }}
                                className={`flex-1 rounded-lg py-2.5 text-[10px] xl:text-xs font-black transition uppercase tracking-wider ${rightTab === "ORDER" && orderType === "TAKEAWAY" ? "bg-white text-rose-950 shadow-sm" : "text-rose-200 hover:text-white"
                                    }`}
                            >
                                Bawa Pulang
                            </button>
                            <button
                                onClick={() => setRightTab("HELD")}
                                className={`flex-1 rounded-lg py-2.5 text-[10px] xl:text-xs font-black transition uppercase tracking-wider flex justify-center items-center gap-1 ${rightTab === "HELD" ? "bg-white text-orange-600 shadow-sm" : "text-rose-200 hover:text-white"
                                    }`}
                            >
                                Tahan Bill
                                {held.length > 0 && (
                                    <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md text-[10px]">{held.length}</span>
                                )}
                            </button>
                        </div>

                        {/* Input Customer di Tab Pesanan (Tema Maroon) */}
                        {rightTab === "ORDER" && (
                            <div className="flex gap-2">
                                <input
                                    value={customer}
                                    onChange={e => setCustomer(e.target.value)}
                                    placeholder="Nama pelanggan..."
                                    className="flex-1 rounded-xl border border-rose-800 bg-rose-900/50 px-4 py-3 text-sm font-bold text-white placeholder-rose-400 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                                />
                                {orderType === "DINE_IN" && (
                                    <input
                                        value={table}
                                        onChange={e => setTable(e.target.value)}
                                        placeholder="Meja"
                                        className="w-16 xl:w-20 rounded-xl border border-rose-800 bg-rose-900/50 px-3 py-3 text-center text-sm font-bold text-white placeholder-rose-400 outline-none focus:border-rose-300"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* DAFTAR ITEM KERANJANG ATAU DAFTAR BILL GANTUNG */}
                    {rightTab === "HELD" ? (
                        <div className="flex-1 overflow-y-auto p-5 bg-rose-950">
                            {held.length > 0 ? (
                                <div className="space-y-4">
                                    {held.map(bill => (
                                        <div key={bill.id} className="rounded-xl border border-orange-500/30 bg-orange-900/20 p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-sm font-black text-orange-50 uppercase tracking-wider">
                                                    {bill.customerName || "Tanpa nama"}
                                                    {bill.tableNumber && bill.tableNumber !== "-" && ` • Meja ${bill.tableNumber}`}
                                                </div>
                                            </div>
                                            <div className="mb-4 text-xs text-orange-300 font-bold">
                                                {(bill.items as CartItem[])?.reduce((sum, i) => sum + i.qty, 0) || 0} item • {formatRp((bill.items as CartItem[])?.reduce((sum, i) => sum + i.price * i.qty, 0) || 0)}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => resumeBill(bill)}
                                                    className="flex-1 rounded-lg bg-orange-500 py-2.5 text-xs font-black text-white transition hover:bg-orange-600 active:scale-95 uppercase tracking-wider"
                                                >
                                                    Lanjut Transaksi
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteHeldBill(bill.id)}
                                                    className="rounded-lg bg-rose-900/50 border border-rose-800 px-4 text-xs font-black text-rose-300 transition hover:bg-rose-900 active:scale-95"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-rose-400/50 space-y-3">
                                    <p className="text-sm font-bold tracking-widest uppercase">Belum ada bill ☁️</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 xl:p-5 bg-rose-950">
                            {cart.length > 0 ? (
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.sku} className="flex items-center justify-between p-3 xl:p-4 bg-rose-900/40 rounded-2xl border border-rose-800/50">
                                            <div className="flex-1 pr-2 xl:pr-4">
                                                <h4 className="text-xs xl:text-sm font-black text-white leading-tight uppercase tracking-wide">
                                                    {item.name}
                                                </h4>
                                                <div className="mt-1 text-xs font-bold text-rose-300">
                                                    {formatRp(item.price)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3">
                                                <div className="flex items-center rounded-lg border border-rose-800 bg-rose-900/50 p-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeQty(item.sku, -1)}
                                                        className="flex h-6 w-6 xl:h-7 xl:w-7 items-center justify-center rounded-md text-white hover:bg-rose-800 transition"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-6 xl:w-8 text-center text-xs xl:text-sm font-black text-white">
                                                        {item.qty}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => changeQty(item.sku, 1)}
                                                        className="flex h-6 w-6 xl:h-7 xl:w-7 items-center justify-center rounded-md text-white hover:bg-rose-800 transition"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setCart(cart.filter(x => x.sku !== item.sku))}
                                                    className="text-[10px] font-black tracking-wider uppercase text-rose-400 hover:text-white transition"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-rose-400/50 space-y-4">
                                    <ShoppingBag size={48} className="opacity-50" />
                                    <p className="text-sm font-bold tracking-widest uppercase">Belum ada pesanan.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bagian Bawah hanya muncul kalau di Tab Pesanan (ORDER) */}
                    {rightTab === "ORDER" && (
                        <div className="border-t border-rose-900 bg-rose-950 p-5 xl:p-6 space-y-4 z-10">
                            <div className="flex justify-between text-sm text-rose-200 font-bold">
                                <span>Subtotal</span>
                                <span className="text-white">{formatRp(subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-rose-200 font-bold">
                                <span>Diskon (Rp)</span>
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={e => setDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-24 rounded-lg border border-rose-800 bg-rose-900/50 px-3 py-1.5 text-right font-black text-white placeholder-rose-500 outline-none focus:border-rose-400 transition"
                                />
                            </div>
                            <div className="flex justify-between border-t border-rose-900 pt-4 text-lg xl:text-xl font-black text-white">
                                <span>Total Tagihan</span>
                                <span className="text-rose-300">{formatRp(total)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={holdBill}
                                    className="rounded-xl bg-rose-900/50 border border-rose-800 py-3.5 text-[10px] xl:text-xs font-black text-white transition hover:bg-rose-800 active:scale-95 uppercase tracking-wider"
                                >
                                    Simpan Bill ☁️
                                </button>
                                <button
                                    type="button"
                                    onClick={clearCart}
                                    className="rounded-xl bg-rose-950 border border-rose-800 py-3.5 text-[10px] xl:text-xs font-black text-rose-400 transition hover:bg-rose-900 active:scale-95 uppercase tracking-wider"
                                >
                                    Batalkan
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={openPayment}
                                className="mt-2 w-full rounded-xl bg-white py-3.5 xl:py-4 text-sm xl:text-base font-black text-rose-950 shadow-lg transition hover:bg-rose-50 active:scale-95 uppercase tracking-widest"
                            >
                                Proses Pembayaran
                            </button>
                        </div>
                    )}
                </aside>
            </div>

            {/* Mobile Cart Overlay - Disesuaikan dengan Tema Maroon */}
            {mobileCart && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-rose-950 md:hidden pb-24">
                    <div className="flex items-center justify-between border-b border-rose-900 px-5 py-4">
                        <h2 className="font-black flex items-center gap-2 text-white uppercase tracking-wider">
                            <ShoppingBag size={18} /> {rightTab === "ORDER" ? `Keranjang (${cart.reduce((s, i) => s + i.qty, 0)})` : "Tahan Bill"}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setMobileCart(false)}
                            className="rounded-lg p-2 text-rose-300 hover:bg-rose-900"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="border-b border-rose-900 bg-rose-950 p-4 space-y-4">
                        <div className="flex rounded-xl bg-rose-900/50 border border-rose-800 p-1.5">
                            <button
                                onClick={() => { setRightTab("ORDER"); setOrderType("DINE_IN"); }}
                                className={`flex-1 rounded-lg py-2.5 text-[10px] font-black transition uppercase tracking-wider ${rightTab === "ORDER" && orderType === "DINE_IN" ? "bg-white text-rose-950 shadow-sm" : "text-rose-200"
                                    }`}
                            >
                                Di Tempat
                            </button>
                            <button
                                onClick={() => { setRightTab("ORDER"); setOrderType("TAKEAWAY"); }}
                                className={`flex-1 rounded-lg py-2.5 text-[10px] font-black transition uppercase tracking-wider ${rightTab === "ORDER" && orderType === "TAKEAWAY" ? "bg-white text-rose-950 shadow-sm" : "text-rose-200"
                                    }`}
                            >
                                Bawa Pulang
                            </button>
                            <button
                                onClick={() => setRightTab("HELD")}
                                className={`flex-1 rounded-lg py-2.5 text-[10px] font-black transition flex justify-center items-center gap-1 uppercase tracking-wider ${rightTab === "HELD" ? "bg-white text-orange-600 shadow-sm" : "text-rose-200"
                                    }`}
                            >
                                Tahan Bill {held.length > 0 && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md text-[9px]">{held.length}</span>}
                            </button>
                        </div>

                        {rightTab === "ORDER" && (
                            <div className="flex gap-2">
                                <input
                                    value={customer}
                                    onChange={e => setCustomer(e.target.value)}
                                    placeholder="Nama pelanggan..."
                                    className="flex-1 rounded-xl border border-rose-800 bg-rose-900/50 px-3 py-2.5 text-sm font-bold text-white placeholder-rose-400 outline-none focus:border-rose-300"
                                />
                                {orderType === "DINE_IN" && (
                                    <input
                                        value={table}
                                        onChange={e => setTable(e.target.value)}
                                        placeholder="Meja"
                                        className="w-16 rounded-xl border border-rose-800 bg-rose-900/50 px-2 py-2.5 text-center text-sm font-bold text-white placeholder-rose-400 outline-none focus:border-rose-300"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {rightTab === "HELD" ? (
                        <div className="flex-1 overflow-y-auto p-4 bg-rose-950">
                            {held.length > 0 ? (
                                <div className="space-y-4">
                                    {held.map(bill => (
                                        <div key={bill.id} className="rounded-xl border border-orange-500/30 bg-orange-900/20 p-4 shadow-sm">
                                            <div className="text-sm font-black text-orange-50 uppercase tracking-wider mb-2">
                                                {bill.customerName || "Tanpa nama"}
                                                {bill.tableNumber && bill.tableNumber !== "-" && ` • Meja ${bill.tableNumber}`}
                                            </div>
                                            <div className="mb-4 text-xs text-orange-300 font-bold">
                                                {(bill.items as CartItem[])?.reduce((sum, i) => sum + i.qty, 0) || 0} item • {formatRp((bill.items as CartItem[])?.reduce((sum, i) => sum + i.price * i.qty, 0) || 0)}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { resumeBill(bill); setMobileCart(false); }}
                                                    className="flex-1 rounded-lg bg-orange-500 py-2.5 text-xs font-black text-white uppercase tracking-wider"
                                                >
                                                    Lanjut
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteHeldBill(bill.id)}
                                                    className="rounded-lg bg-rose-900/50 border border-rose-800 px-4 text-xs font-black text-rose-300"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-10 text-center text-sm font-bold text-rose-400/50 uppercase tracking-widest">
                                    Belum ada bill ☁️
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 bg-rose-950">
                            {cart.length ? cart.map(item => (
                                <div key={item.sku} className="mb-3 rounded-2xl border border-rose-800/50 bg-rose-900/40 p-4 shadow-sm">
                                    <div className="flex justify-between items-center text-sm font-black text-white gap-2 uppercase tracking-wide">
                                        <span className="line-clamp-2 w-full" title={item.name}>{item.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setCart(cart.filter(x => x.sku !== item.sku))}
                                            className="shrink-0"
                                        >
                                            <Trash2 size={16} className="text-rose-400" />
                                        </button>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <b className="text-sm text-rose-300">{formatRp(item.price * item.qty)}</b>
                                        <span className="flex items-center rounded-lg border border-rose-800 bg-rose-900/50 p-1">
                                            <button
                                                type="button"
                                                onClick={() => changeQty(item.sku, -1)}
                                                className="flex h-6 w-6 items-center justify-center rounded text-white"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center text-xs font-black text-white">{item.qty}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeQty(item.sku, 1)}
                                                className="flex h-6 w-6 items-center justify-center rounded text-white"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <p className="py-10 text-center text-sm font-bold text-rose-400/50 uppercase tracking-widest">
                                    Keranjang masih kosong
                                </p>
                            )}
                        </div>
                    )}

                    {rightTab === "ORDER" && (
                        <div className="border-t border-rose-900 bg-rose-950 p-5 z-10">
                            <div className="mb-2 flex justify-between text-sm text-rose-200 font-bold">
                                <span>Subtotal</span>
                                <span className="text-white">{formatRp(subtotal)}</span>
                            </div>
                            <div className="mb-4 flex items-center justify-between text-sm text-rose-200 font-bold">
                                <span>Diskon (Rp)</span>
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={e => setDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-24 rounded-lg border border-rose-800 bg-rose-900/50 px-3 py-1.5 text-right text-white font-black outline-none focus:border-rose-400"
                                />
                            </div>
                            <div className="mb-5 flex justify-between text-xl font-black text-white">
                                <span>Total</span>
                                <span className="text-rose-300">{formatRp(total)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={holdBill}
                                    className="rounded-xl bg-rose-900/50 border border-rose-800 py-3.5 text-xs font-black text-white uppercase tracking-wider"
                                >
                                    Tahan Bill
                                </button>
                                <button
                                    type="button"
                                    onClick={clearCart}
                                    className="rounded-xl bg-rose-950 border border-rose-800 py-3.5 text-xs font-black text-rose-400 uppercase tracking-wider"
                                >
                                    Batalkan
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setMobileCart(false); openPayment(); }}
                                className="w-full rounded-xl bg-white py-4 text-base font-black text-rose-950 shadow-lg uppercase tracking-widest"
                            >
                                BAYAR {formatRp(total)}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================== */}
            {/* FLOATING BOTTOM NAV ANIMASI - KHUSUS MOBILE */}
            {/* ========================================== */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[65] w-[90%] max-w-[360px] bg-rose-950 rounded-full shadow-2xl border-2 border-rose-800 flex justify-between items-center px-2 py-2">
                {[
                    { id: "kasir", icon: <LayoutGrid size={22} />, label: "Kasir" },
                    { id: "history", icon: <History size={22} />, label: "Riwayat" },
                    { id: "cart", icon: <ShoppingBag size={22} />, label: "Pesanan", badge: cart.reduce((s, i) => s + i.qty, 0) },
                    { id: "attendance", icon: <Camera size={22} />, label: "Absen" }
                ].map((item) => {
                    const isActive = item.id === "cart" ? mobileCart : (!mobileCart && tab === item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === "cart") {
                                    setMobileCart(true);
                                } else {
                                    setMobileCart(false);
                                    setTab(item.id as any);
                                }
                            }}
                            className="relative flex flex-col items-center justify-center w-[72px] h-14 rounded-full transition-all duration-300"
                        >
                            {/* Animasi Bouncy Background */}
                            <div className={`absolute inset-0 rounded-full transition-all duration-300 ease-out ${isActive ? "bg-white scale-100 shadow-md" : "bg-transparent scale-0"}`}></div>

                            {/* Ikon dan Label (Naik ke atas kalau aktif) */}
                            <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-300 ${isActive ? "-translate-y-1 text-rose-950" : "text-rose-300 hover:text-white"}`}>
                                {item.icon}
                                {isActive && (
                                    <span className="absolute -bottom-4 text-[9px] font-black uppercase tracking-wider whitespace-nowrap animate-in fade-in zoom-in duration-300">
                                        {item.label}
                                    </span>
                                )}
                            </div>

                            {/* Badge merah kecil khusus keranjang kalau ada isinya */}
                            {item.id === "cart" && item.badge !== undefined && item.badge > 0 && !isActive && (
                                <span className="absolute top-1 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white border border-rose-950 z-20">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Modal Pembayaran dengan Tampilan Elegan */}
            {paymentOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => !qrisWaiting && setPaymentOpen(false)}>
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>

                        {/* JIKA STATUS MENUNGGU QRIS */}
                        {qrisWaiting ? (
                            <div className="py-8 space-y-4">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-800 animate-pulse">
                                    <span className="text-4xl">📱</span>
                                </div>
                                <h2 className="text-xl font-black text-rose-950 uppercase tracking-wider">Menunggu Pembayaran QRIS</h2>
                                <p className="text-sm font-bold text-rose-900/60">
                                    Silakan scan QR code di EDC / layar customer.<br />
                                    Sistem sedang memverifikasi transaksi...
                                </p>
                                <div className="mt-6 flex justify-center items-center gap-2 text-rose-950 font-black text-sm">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-950 border-t-transparent"></span>
                                    Mengecek status pembayaran...
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-5 flex items-center justify-between">
                                    <h2 className="text-xl font-black text-rose-950 text-left uppercase tracking-wider">Proses Pembayaran</h2>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentOpen(false)}
                                        className="rounded-xl p-2 text-rose-900/50 hover:bg-rose-50 transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 p-5 text-center">
                                    <p className="text-xs font-black text-rose-900/60 uppercase tracking-widest mb-1">Total Tagihan</p>
                                    <p className="text-4xl font-black text-rose-950">{formatRp(total)}</p>
                                </div>

                                <div className="mb-5 text-left">
                                    <label className="mb-3 block text-xs font-black text-rose-900/60 uppercase tracking-widest">Metode Pembayaran</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["CASH", "QRIS", "TRANSFER"].map(m => (
                                            <button
                                                type="button"
                                                key={m}
                                                onClick={() => setPaymentMethod(m)}
                                                className={`rounded-xl py-3.5 text-sm font-black transition-all border-2 uppercase tracking-wider ${paymentMethod === m ? "bg-rose-950 border-rose-950 text-white shadow-lg shadow-rose-900/30" : "bg-white border-rose-100 text-rose-950 hover:border-rose-950"
                                                    }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {paymentMethod === "QRIS" ? (
                                    <div className="mb-6 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/80 p-6 text-center">
                                        <p className="text-sm font-black text-rose-950 mb-3 uppercase tracking-wider">Scan QRIS KAMI KITA</p>
                                        <div className="mx-auto h-32 w-32 bg-white p-2 rounded-2xl border-2 border-rose-950 shadow-sm flex items-center justify-center">
                                            <span className="text-5xl">📷</span>
                                        </div>
                                        <p className="text-[10px] text-rose-900/60 mt-4 uppercase tracking-widest font-bold">Nominal otomatis sesuai total tagihan</p>
                                    </div>
                                ) : (
                                    <div className="mb-6 text-left">
                                        <label className="mb-3 block text-xs font-black text-rose-900/60 uppercase tracking-widest">Nominal Uang Diterima</label>
                                        <input
                                            type="number"
                                            value={paidAmount}
                                            onChange={e => setPaidAmount(e.target.value)}
                                            className="w-full rounded-2xl border-2 border-rose-950 bg-white px-5 py-4 text-3xl font-black text-rose-950 outline-none focus:ring-4 focus:ring-rose-100 transition"
                                            placeholder="0"
                                        />
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {[Math.ceil(total), Math.ceil(total / 1000) * 1000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000]
                                                .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                                                .map(amt => (
                                                    <button
                                                        type="button"
                                                        key={amt}
                                                        onClick={() => setPaidAmount(String(amt))}
                                                        className="rounded-xl border-2 border-rose-100 bg-white px-4 py-2 text-sm font-black text-rose-950 hover:border-rose-950 transition"
                                                    >
                                                        {formatRp(amt)}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}

                                {paymentMethod !== "QRIS" && Number(paidAmount) >= total && (
                                    <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-center border-2 border-emerald-500">
                                        <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">Uang Kembalian</p>
                                        <p className="text-3xl font-black text-emerald-600">{formatRp(Number(paidAmount) - total)}</p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (paymentMethod === "QRIS") {
                                            setQrisWaiting(true);
                                            setTimeout(async () => { setQrisWaiting(false); await completePayment(total); }, 3000);
                                        } else {
                                            completePayment();
                                        }
                                    }}
                                    disabled={paymentLoading}
                                    className="w-full rounded-2xl bg-rose-950 py-4.5 text-lg font-black text-white shadow-xl shadow-rose-900/30 transition hover:bg-rose-900 active:scale-95 disabled:bg-slate-300 disabled:shadow-none uppercase tracking-widest"
                                >
                                    {paymentLoading ? "Memproses..." : paymentMethod === "QRIS" ? "Cek Status Pembayaran" : "Konfirmasi Pembayaran"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Sukses */}
            {successModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center border-t-8 border-emerald-500">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 text-5xl font-black border-4 border-emerald-100">
                            ✓
                        </div>
                        <h2 className="text-2xl font-black mb-2 text-rose-950 uppercase tracking-wide">Pembayaran Diterima</h2>
                        <p className="text-xs font-black text-emerald-600 mb-4 uppercase tracking-widest">Transaksi Berhasil & Tercatat</p>

                        <p className="text-sm font-bold text-rose-900/60 mb-8 bg-rose-50 p-3 rounded-xl border border-rose-100">
                            Metode: <b className="text-rose-950">{lastOrder?.paymentMethod}</b>
                            {lastOrder?.changeAmount > 0 ? ` • Kembali: ${formatRp(lastOrder?.changeAmount)}` : ""}
                        </p>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => printReceiptData(lastOrder)}
                                disabled={printing}
                                className="w-full rounded-2xl bg-rose-950 py-4 text-sm font-black text-white shadow-lg flex items-center justify-center gap-2 hover:bg-rose-900 disabled:opacity-50 transition active:scale-95 uppercase tracking-widest"
                            >
                                <Printer size={18} /> {printing ? "Mempersiapkan..." : "Cetak Struk Kasir"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSuccessModal(false)}
                                className="w-full rounded-2xl bg-white border-2 border-rose-100 py-4 text-sm font-black text-rose-950 hover:border-rose-950 transition active:scale-95 uppercase tracking-widest"
                            >
                                Selesai / Transaksi Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifikasi Toast */}
            {toast && (
                <div className="fixed top-5 right-1/2 translate-x-1/2 md:translate-x-0 md:right-5 z-[90] rounded-2xl bg-rose-950 border-2 border-rose-800 px-6 py-4 text-sm font-black tracking-wider uppercase text-white shadow-2xl transition-all">
                    {toast}
                </div>
            )}
        </div>
    );
}

// ==========================================
// KOMPONEN PENDUKUNG (UI)
// ==========================================

function MenuIcon() {
    return <span className="text-2xl font-black text-rose-950">☰</span>;
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-sm font-black transition-all duration-200 uppercase tracking-wider ${active ? "bg-white text-rose-950 shadow-lg" : "text-rose-100 hover:bg-rose-900 hover:text-white"
                }`}
        >
            {icon}<span>{label}</span>
        </button>
    );
}

function HistoryPanel({ onReprint, printing }: { onReprint: (tx: TransactionRecord) => void; printing: boolean }) {
    const [history, setHistory] = useState<TransactionRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<TransactionRecord | null>(null);

    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d.toISOString().slice(0, 10);
    });

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.set("startDate", new Date(dateFrom + "T00:00:00").toISOString());
            if (dateTo) params.set("endDate", new Date(dateTo + "T23:59:59").toISOString());
            params.set("limit", "200");

            const response = await fetch(`/api/orders?${params.toString()}`);
            const data = await response.json();

            setHistory((data.orders || []).map((order: any) => {
                const items = (order.items || []).map((item: any) => ({
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    totalPrice: Number(item.totalPrice),
                    costPrice: item.product ? Number(item.product.costPrice) : Number(item.unitPrice),
                }));
                const totalCost = items.reduce((sum: number, i: any) => sum + i.costPrice * i.quantity, 0);
                const totalRev = Number(order.totalAmount);
                return {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    tableNumber: order.tableNumber,
                    items,
                    subtotal: Number(order.subtotal || totalRev),
                    taxAmount: Number(order.taxAmount || 0),
                    totalAmount: totalRev,
                    paidAmount: Number(order.paidAmount || totalRev),
                    changeAmount: Number(order.changeAmount || 0),
                    paymentMethod: order.paymentMethod,
                    profit: totalRev - totalCost,
                    createdAt: order.createdAt,
                };
            }));
        } catch {
            console.error("Gagal memuat riwayat transaksi");
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const totalRevenue = history.reduce((s, tx) => s + tx.totalAmount, 0);
    const totalProfit = history.reduce((s, tx) => s + tx.profit, 0);

    return (
        <div className="mx-auto max-w-5xl bg-white rounded-3xl shadow-sm border-2 border-rose-950 p-6">
            <div className="mb-6 flex flex-wrap items-end gap-4 border-b-2 border-rose-100 pb-6">
                <label className="text-xs font-black text-rose-900/60 uppercase tracking-widest">
                    Dari Tanggal
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-2 block rounded-xl border-2 border-rose-950 bg-white px-4 py-2.5 text-sm font-bold text-rose-950 outline-none focus:ring-4 focus:ring-rose-100 transition"
                    />
                </label>
                <label className="text-xs font-black text-rose-900/60 uppercase tracking-widest">
                    Sampai Tanggal
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-2 block rounded-xl border-2 border-rose-950 bg-white px-4 py-2.5 text-sm font-bold text-rose-950 outline-none focus:ring-4 focus:ring-rose-100 transition"
                    />
                </label>
                <button
                    type="button"
                    onClick={loadHistory}
                    className="rounded-xl bg-rose-950 px-8 py-3 text-sm font-black text-white transition hover:bg-rose-900 shadow-lg uppercase tracking-wider"
                >
                    Tampilkan
                </button>
            </div>

            {history.length > 0 && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border-2 border-rose-100 bg-rose-50 p-5">
                        <p className="text-xs font-black text-rose-900/60 uppercase tracking-widest">Pendapatan Kotor</p>
                        <p className="mt-2 text-3xl font-black text-rose-950">{formatRp(totalRevenue)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-5">
                        <p className="text-xs font-black text-emerald-700/60 uppercase tracking-widest">Total Keuntungan</p>
                        <p className="mt-2 text-3xl font-black text-emerald-600">{formatRp(totalProfit)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-rose-100 bg-rose-50 p-5">
                        <p className="text-xs font-black text-rose-900/60 uppercase tracking-widest">Jumlah Transaksi</p>
                        <p className="mt-2 text-3xl font-black text-rose-950">{history.length} Order</p>
                    </div>
                </div>
            )}

            {loading ? (
                <p className="py-10 text-center text-rose-900/50 font-bold uppercase tracking-widest">Memuat data riwayat...</p>
            ) : history.length === 0 ? (
                <p className="py-16 text-center text-rose-900/50 font-bold uppercase tracking-widest">Tidak ada transaksi di rentang tanggal ini.</p>
            ) : (
                <div className="overflow-x-auto rounded-2xl border-2 border-rose-100">
                    <table className="w-full text-left text-sm text-rose-950">
                        <thead className="bg-rose-50 text-xs font-black uppercase tracking-wider text-rose-900/60 border-b-2 border-rose-100">
                            <tr>
                                <th className="px-5 py-5">Waktu & Order #</th>
                                <th className="px-5 py-5">Nama Pelanggan</th>
                                <th className="px-5 py-5">Metode Bayar</th>
                                <th className="px-5 py-5">Total Nominal</th>
                                <th className="px-5 py-5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-rose-50">
                            {history.map(tx => (
                                <tr key={tx.id} onClick={() => setSelectedDetail(tx)} className="hover:bg-rose-50/50 transition cursor-pointer">
                                    <td className="px-5 py-5">
                                        <div className="font-black text-rose-950">{tx.orderNumber}</div>
                                        <div className="text-xs font-bold text-rose-900/50 mt-1">{new Date(tx.createdAt).toLocaleString("id-ID")}</div>
                                    </td>
                                    <td className="px-5 py-5 font-bold uppercase">
                                        {tx.customerName || "Umum"} {tx.tableNumber && tx.tableNumber !== "-" && `(Meja ${tx.tableNumber})`}
                                    </td>
                                    <td className="px-5 py-5">
                                        <span className="rounded-lg bg-rose-100 border border-rose-200 px-3 py-1.5 text-[10px] font-black text-rose-950 uppercase tracking-widest">
                                            {tx.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-5 py-5 font-black text-rose-900">
                                        {formatRp(tx.totalAmount)}
                                    </td>
                                    <td className="px-5 py-5 text-right">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onReprint(tx); }}
                                            disabled={printing}
                                            className="inline-flex items-center gap-2 rounded-xl border-2 border-rose-950 bg-white px-4 py-2 text-xs font-black text-rose-950 hover:bg-rose-950 hover:text-white transition disabled:opacity-50 uppercase tracking-wider"
                                        >
                                            <Printer size={14} /> Cetak
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Detail Riwayat */}
            {selectedDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm" onClick={() => setSelectedDetail(null)}>
                    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border-2 border-rose-950" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b-2 border-rose-100 pb-5 mb-5">
                            <div>
                                <h3 className="font-black text-xl text-rose-950 uppercase">{selectedDetail.orderNumber}</h3>
                                <p className="text-xs font-bold text-rose-900/50 mt-1">{new Date(selectedDetail.createdAt).toLocaleString("id-ID")}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedDetail(null)} className="text-rose-900/50 hover:bg-rose-50 p-2 rounded-xl transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                            <p className="text-[10px] font-black text-rose-900/50 uppercase tracking-widest mb-3">Rincian Menu:</p>
                            {selectedDetail.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b border-rose-50 pb-4">
                                    <div>
                                        <p className="font-black text-rose-950 uppercase tracking-wide">{item.productName}</p>
                                        <p className="text-xs font-bold text-rose-900/60 mt-1">{item.quantity}x @ {formatRp(item.unitPrice)}</p>
                                    </div>
                                    <p className="font-black text-rose-900">{formatRp(item.totalPrice)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t-2 border-rose-100 pt-5 mt-2 space-y-3">
                            <div className="flex justify-between text-sm text-rose-900/60 font-bold uppercase tracking-wider">
                                <span>Metode Bayar</span>
                                <span className="text-rose-950 font-black">{selectedDetail.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between font-black text-xl text-rose-950 pt-2 uppercase tracking-wider">
                                <span>Total Bersih</span>
                                <span className="text-rose-900">{formatRp(selectedDetail.totalAmount)}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSelectedDetail(null)}
                            className="mt-8 w-full rounded-2xl bg-rose-950 py-4 font-black text-white transition hover:bg-rose-900 uppercase tracking-widest"
                        >
                            Tutup Rincian
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function AttendancePanel({ videoRef, camera, startCamera, stopCamera, type, setType, submit, loading, message, staff, selectedStaffId, setSelectedStaffId }: any) {
    return (
        <div className="mx-auto max-w-2xl bg-white p-6 md:p-10 rounded-3xl shadow-sm border-2 border-rose-950">
            <h2 className="text-2xl font-black text-rose-950 mb-6 border-b-2 border-rose-100 pb-5 uppercase tracking-wider">Absensi Biometrik</h2>

            <div className="relative aspect-video overflow-hidden rounded-2xl border-4 border-rose-950 bg-slate-900 shadow-inner">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                {!camera && (
                    <span className="absolute inset-0 grid place-items-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Kamera belum aktif
                    </span>
                )}
            </div>

            <div className="mt-6 flex gap-4">
                <button
                    type="button"
                    onClick={startCamera}
                    disabled={camera}
                    className="flex-1 rounded-2xl bg-rose-950 py-4 text-sm font-black text-white transition hover:bg-rose-900 disabled:bg-slate-200 disabled:text-slate-400 uppercase tracking-wider"
                >
                    Aktifkan Kamera
                </button>
                <button
                    type="button"
                    onClick={stopCamera}
                    disabled={!camera}
                    className="rounded-2xl border-2 border-rose-950 px-8 text-sm font-black text-rose-950 hover:bg-rose-50 transition disabled:opacity-50 uppercase tracking-wider"
                >
                    Matikan
                </button>
            </div>

            <div className="mt-8 space-y-6 border-t-2 border-rose-100 pt-8">
                <div>
                    <label className="text-xs font-black text-rose-900/60 uppercase tracking-widest mb-3 block">
                        Identitas Karyawan
                    </label>
                    <select
                        value={selectedStaffId}
                        onChange={e => setSelectedStaffId(e.target.value)}
                        className="w-full rounded-2xl border-2 border-rose-950 bg-white px-5 py-4 text-sm font-black text-rose-950 outline-none focus:ring-4 focus:ring-rose-100 transition uppercase tracking-wider"
                    >
                        <option value="">-- PILIH NAMA STAF --</option>
                        {staff.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setType("CHECK_IN")}
                        className={`rounded-2xl py-4 text-sm font-black transition border-2 uppercase tracking-wider ${type === "CHECK_IN"
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md"
                                : "border-rose-100 bg-white text-rose-900/50 hover:border-rose-300"
                            }`}
                    >
                        Masuk (Check In)
                    </button>
                    <button
                        type="button"
                        onClick={() => setType("CHECK_OUT")}
                        className={`rounded-2xl py-4 text-sm font-black transition border-2 uppercase tracking-wider ${type === "CHECK_OUT"
                                ? "bg-orange-50 border-orange-500 text-orange-700 shadow-md"
                                : "border-rose-100 bg-white text-rose-900/50 hover:border-rose-300"
                            }`}
                    >
                        Pulang (Check Out)
                    </button>
                </div>

                <button
                    type="button"
                    onClick={submit}
                    disabled={!camera || loading || !selectedStaffId}
                    className="w-full rounded-2xl bg-rose-950 py-5 text-base font-black text-white shadow-xl shadow-rose-900/30 transition hover:bg-rose-900 active:scale-95 disabled:bg-slate-300 disabled:shadow-none mt-4 uppercase tracking-widest"
                >
                    {loading ? "Menyimpan..." : "Ambil Foto & Simpan"}
                </button>

                {message && (
                    <p className="text-center text-sm font-black text-rose-950 bg-rose-50 p-4 rounded-xl border-2 border-rose-200 mt-4 animate-pulse uppercase tracking-wider">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}