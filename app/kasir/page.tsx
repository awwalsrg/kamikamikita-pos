"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Camera, Coffee, Cookie, History, LayoutGrid, Minus, Plus, Printer, Trash2, Utensils, X } from "lucide-react";
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

export default function KasirPage() {
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
    const [qrisWaiting, setQrisWaiting] = useState(false); // TAMBAHAN: State Loading QRIS

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

    // ==========================================
    // DATA FETCHING (PRODUK & BILL GANTUNG CLOUD)
    // ==========================================

    const fetchProducts = useCallback(async (showRefreshIndicator = false) => {
        try {
            if (showRefreshIndicator) setIsRefreshing(true);
            const response = await fetch("/api/products", {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache" },
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
        fetch("/api/users").then(res => res.json()).then(data => setStaff(data.users || [])).catch(() => setStaff([]));

        const intervalId = setInterval(() => {
            fetchProducts(true);
            loadHeldBills(); // Sync bill tiap 5 detik
        }, POLL_INTERVAL);

        return () => { clearInterval(intervalId); stopCamera(); };
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
        return existing ? prev.map(item => item.sku === product.sku ? { ...item, qty: item.qty + 1 } : item) : [...prev, { ...product, qty: 1 }];
    });

    const changeQty = (sku: string, amount: number) => setCart(prev =>
        prev.map(item => item.sku === sku ? { ...item, qty: Math.max(1, item.qty + amount) } : item)
    );

    const clearCart = () => { setCart([]); setCustomer(""); setTable(""); setDiscount(""); };
    const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2500); };

    // ==========================================
    // LOGIKA BILL GANTUNG SINKRON SERVER
    // ==========================================

    const holdBill = async () => {
        if (!cart.length) { showToast("Keranjang kosong!"); return; }

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

            await loadHeldBills(); // Tarik data terbaru dari server
            clearCart();
            showToast("Bill sukses disinkronisasi ☁️");
        } catch (error) {
            showToast("Gagal sinkron bill ke server");
        }
    };

    const resumeBill = async (bill: any) => {
        setCart(bill.items);
        setCustomer(bill.customerName === "Tanpa Nama" ? "" : bill.customerName);
        setTable(bill.tableNumber === "-" ? "" : bill.tableNumber);
        setDiscount("");

        setHeld(prev => prev.filter(x => x.id !== bill.id)); // Hapus di UI seketika

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
        if (!cart.length) { showToast("Keranjang kosong"); return; }
        setPaidAmount(String(Math.ceil(total)));
        setPaymentMethod("CASH");
        setPaymentOpen(true);
    };

    async function completePayment(inputPaid?: number) {
        const paid = inputPaid ?? Number(paidAmount);
        if (!Number.isFinite(paid) || paid < total) { showToast("Nominal pembayaran kurang"); return; }
        setPaymentLoading(true);
        try {
            let cashierId: string | undefined;
            try { cashierId = JSON.parse(localStorage.getItem("kamikamikita-user") || "null")?.id; } catch { /* ignore */ }

            const payloadItems = cart.map(item => ({ productId: item.sku, quantity: item.qty, price: item.price }));
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
        } catch (error) { showToast(error instanceof Error ? error.message : "Pembayaran gagal"); }
        finally { setPaymentLoading(false); }
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
                    <div class="flex"><span>Subtotal</span><span>Rp ${orderObj.subtotal.toLocaleString("id-ID")}</span></div>
                    ${orderObj.discount > 0 ? `<div class="flex"><span>Diskon</span><span>Rp ${orderObj.discount.toLocaleString("id-ID")}</span></div>` : ""}
                    <div class="flex bold" style="font-size: 13px;"><span>TOTAL</span><span>Rp ${(orderObj.totalAmount ?? orderObj.total).toLocaleString("id-ID")}</span></div>
                    <div class="flex"><span>Bayar (${orderObj.paymentMethod})</span><span>Rp ${orderObj.paidAmount.toLocaleString("id-ID")}</span></div>
                    <div class="flex"><span>Kembali</span><span>Rp ${orderObj.changeAmount.toLocaleString("id-ID")}</span></div>
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
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
            if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setCamera(true); setAttendanceMessage("Kamera siap."); }
        } catch { setAttendanceMessage("Kamera tidak bisa dibuka. Izinkan akses kamera."); }
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
        const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0); return canvas.toDataURL("image/jpeg", 0.75);
    }

    async function submitAttendance() {
        if (!camera) { setAttendanceMessage("Aktifkan kamera terlebih dahulu."); return; }
        const userId = selectedStaffId || (() => {
            try { return JSON.parse(localStorage.getItem("kamikamikita-user") || "null")?.id || ""; } catch { return ""; }
        })();
        if (!userId) { setAttendanceMessage("Pilih nama karyawan terlebih dahulu."); return; }

        setAttendanceLoading(true); setAttendanceMessage("Menyimpan foto absensi...");
        try {
            const response = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, type: attendanceType, imageUrl: capturePhoto(), deviceInfo: navigator.userAgent }) });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || "Gagal menyimpan absensi");

            setAttendanceMessage(`Berhasil absen ${attendanceType === "CHECK_IN" ? "masuk" : "pulang"}.`); showToast("Foto absensi tersimpan");
        } catch (error) { setAttendanceMessage(error instanceof Error ? error.message : "Gagal menyimpan absensi"); }
        setAttendanceLoading(false);
    }

    // ==========================================
    // RENDER HALAMAN
    // ==========================================

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-800">
            {/* Navigasi Sidebar Desktop */}
            <nav className={`${sidebar ? "w-20 lg:w-24" : "w-0 overflow-hidden"} hidden shrink-0 flex-col items-center border-r border-gray-200 bg-white py-6 shadow-sm transition-all md:flex`}>
                <div className="mb-8 min-w-max text-center text-xs font-bold tracking-widest text-rose-600">KAMI<br />KITA</div>
                <div className="flex w-full min-w-max flex-1 flex-col gap-3 px-3">
                    <Nav icon={<LayoutGrid size={22} />} label="Kasir" active={tab === "kasir"} onClick={() => setTab("kasir")} />
                    <Nav icon={<Coffee size={22} />} label="Minum" active={tab === "kasir" && category === "BEVERAGE"} onClick={() => { setTab("kasir"); setCategory("BEVERAGE"); }} />
                    <Nav icon={<Utensils size={22} />} label="Makan" active={tab === "kasir" && category === "FOOD"} onClick={() => { setTab("kasir"); setCategory("FOOD"); }} />
                    <Nav icon={<Cookie size={22} />} label="Snack" active={tab === "kasir" && category === "SNACK"} onClick={() => { setTab("kasir"); setCategory("SNACK"); }} />
                </div>
                <div className="flex w-full min-w-max flex-col gap-3 px-3">
                    <Nav icon={<History size={22} />} label="Riwayat" active={tab === "history"} onClick={() => setTab("history")} />
                    <Nav icon={<Camera size={22} />} label="Absen" active={tab === "attendance"} onClick={() => setTab("attendance")} />
                    <Nav icon={<X size={22} />} label="Keluar" active={false} onClick={() => { localStorage.removeItem("kamikamikita-user"); window.location.href = "/login"; }} />
                </div>
            </nav>

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {/* Header Desktop */}
                <header className="hidden h-20 shrink-0 items-center gap-4 border-b bg-white px-6 shadow-sm md:flex">
                    <button onClick={() => setSidebar(!sidebar)} className="rounded-xl p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600">
                        {sidebar ? <X size={24} /> : <MenuIcon />}
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{tab === "kasir" ? "Kasir Profesional" : tab === "history" ? "Riwayat Transaksi" : "Absen Foto"}</h1>
                        <p className="text-xs text-gray-500">Closingan karyawan dan operasional toko</p>
                    </div>
                    {tab === "kasir" && (
                        <div className="ml-auto flex items-center gap-3">
                            {isRefreshing && (
                                <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></span>Sync...
                                </span>
                            )}
                            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari menu atau SKU..." className="w-72 rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                        </div>
                    )}
                </header>

                {/* Header Mobile */}
                <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-4 shadow-sm md:hidden">
                    <button onClick={() => setTab("kasir")} className="rounded-lg p-2 text-rose-600 font-bold text-xs">KAMI KITA</button>
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari menu..." className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none" />
                    <button onClick={() => setMobileCart(true)} className="relative rounded-lg bg-rose-600 p-2 text-white">
                        <Trash2 size={18} />
                        {cart.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">{cart.reduce((s, i) => s + i.qty, 0)}</span>}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {/* Filter Kategori Mobile */}
                    {tab === "kasir" && (
                        <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
                            {[{ label: "Semua", cat: "SEMUA" }, { label: "Minum", cat: "BEVERAGE" }, { label: "Makan", cat: "FOOD" }, { label: "Snack", cat: "SNACK" }].map(c => (
                                <button key={c.cat} onClick={() => setCategory(c.cat)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${category === c.cat ? "bg-rose-600 text-white" : "bg-white text-gray-600 shadow-sm"}`}>{c.label}</button>
                            ))}
                        </div>
                    )}

                    {/* Tampilan Menu / Kasir */}
                    {tab === "kasir" && (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {filtered.map(item => (
                                <button key={item.sku} onClick={() => add(item)} className="relative flex min-h-[175px] flex-col justify-between overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:border-rose-400 hover:shadow-md active:scale-95 sm:min-h-[200px]">
                                    {item.imageUrl ? (
                                        <div className="h-28 w-full bg-gray-100 sm:h-36"><img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /></div>
                                    ) : (
                                        <div className="flex h-28 w-full items-center justify-center bg-gray-50 sm:h-36"><span className="text-5xl drop-shadow-sm">{item.icon}</span></div>
                                    )}
                                    <div className="p-3 sm:px-4 sm:pb-3 sm:pt-2">
                                        <b className="line-clamp-2 w-full block text-xs sm:text-sm font-bold leading-tight min-h-[2rem]" title={item.name}>{item.name}</b>
                                        <strong className="text-xs sm:text-sm text-rose-600 mt-1 block">{formatRp(item.price)}</strong>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tampilan Riwayat Transaksi dengan Filter Tanggal */}
                    {tab === "history" && (
                        <HistoryPanel onReprint={(tx) => {
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
                        }} printing={printing} />
                    )}

                    {/* Tampilan Absensi */}
                    {tab === "attendance" && (
                        <AttendancePanel videoRef={videoRef} camera={camera} startCamera={startCamera} stopCamera={stopCamera} type={attendanceType} setType={setAttendanceType} submit={submitAttendance} loading={attendanceLoading} message={attendanceMessage} staff={staff} selectedStaffId={selectedStaffId} setSelectedStaffId={setSelectedStaffId} />
                    )}
                </div>
            </main>

            {/* Sidebar Keranjang Desktop */}
            <aside className="hidden w-[350px] shrink-0 flex-col border-l bg-white shadow-lg lg:w-[400px] md:flex">
                <div className="flex items-center gap-3 border-b p-5">
                    <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nama customer..." className="min-w-0 flex-1 rounded-xl border bg-gray-50 px-3 py-2 text-sm" />
                    <input value={table} onChange={e => setTable(e.target.value)} placeholder="Meja" className="w-20 rounded-xl border bg-gray-50 px-2 py-2 text-center text-sm" />
                </div>

                {/* Panel Bill Gantung */}
                <div className="border-b bg-orange-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-black text-orange-700">Bill Gantung ☁️</h2>
                        <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-black text-orange-800">{held.length}</span>
                    </div>
                    {held.length === 0 ? (
                        <p className="text-xs text-orange-700/70">Belum ada bill.</p>
                    ) : (
                        <div className="max-h-48 space-y-2 overflow-y-auto">
                            {held.map(bill => (
                                <div key={bill.id} className="rounded-xl border border-orange-200 bg-white p-3 shadow-sm">
                                    <div className="text-xs font-bold">{bill.customerName || "Tanpa nama"}{bill.tableNumber && ` • Meja ${bill.tableNumber}`}</div>
                                    <div className="my-1 text-xs text-orange-700">{(bill.items as CartItem[])?.reduce((sum, i) => sum + i.qty, 0) || 0} item • {formatRp((bill.items as CartItem[])?.reduce((sum, i) => sum + i.price * i.qty, 0) || 0)}</div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => resumeBill(bill)} className="flex-1 rounded-lg bg-orange-500 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600 active:scale-95">Ambil</button>
                                        <button type="button" onClick={() => deleteHeldBill(bill.id)} className="rounded-lg bg-red-100 px-2 text-xs text-red-600 transition hover:bg-red-200 active:scale-95">Hapus</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5">
                    {cart.length ? cart.map(item => (
                        <div key={item.sku} className="mb-3 rounded-xl border bg-white p-3 shadow-sm">
                            <div className="flex justify-between items-center text-sm font-semibold gap-2">
                                <span className="line-clamp-2 w-full" title={item.name}>{item.name}</span>
                                <button type="button" onClick={() => setCart(cart.filter(x => x.sku !== item.sku))} className="shrink-0"><Trash2 size={16} className="text-gray-400 hover:text-red-500" /></button>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <b className="text-sm text-rose-600">{formatRp(item.price * item.qty)}</b>
                                <span className="flex items-center gap-3 rounded-lg border bg-gray-50 p-1">
                                    <button type="button" onClick={() => changeQty(item.sku, -1)}><Minus size={14} /></button>
                                    {item.qty}
                                    <button type="button" onClick={() => changeQty(item.sku, 1)}><Plus size={14} /></button>
                                </span>
                            </div>
                        </div>
                    )) : <div className="flex h-full items-center justify-center text-sm text-gray-400">Pilih menu untuk memulai bill</div>}
                </div>

                <div className="border-t p-6">
                    <div className="flex justify-between text-sm"><span>Subtotal</span><b>{formatRp(subtotal)}</b></div>
                    <div className="my-3 flex items-center justify-between text-sm">
                        <span>Diskon (Rp)</span>
                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" className="w-28 rounded-lg border bg-gray-50 px-3 py-1.5 text-right outline-none focus:border-rose-500" />
                    </div>
                    <div className="mb-5 flex justify-between text-xl font-black"><span>Total</span><span className="text-rose-600">{formatRp(total)}</span></div>

                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={holdBill} className="rounded-xl bg-orange-100 py-3 text-sm font-bold text-orange-600 transition hover:bg-orange-200 active:scale-95">Tahan (F4) ☁️</button>
                        <button type="button" onClick={clearCart} className="rounded-xl bg-gray-100 py-3 text-sm font-bold transition hover:bg-gray-200 active:scale-95">Batal (Esc)</button>
                    </div>

                    <button type="button" onClick={openPayment} className="mt-3 w-full rounded-xl bg-rose-600 py-4 text-lg font-bold text-white shadow-md transition hover:bg-rose-700 active:scale-95">BAYAR</button>
                </div>
            </aside>

            {/* Mobile Cart Overlay */}
            {mobileCart && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
                    <div className="flex items-center justify-between border-b p-4"><h2 className="font-black">Cart ({cart.reduce((s, i) => s + i.qty, 0)})</h2><button type="button" onClick={() => setMobileCart(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X size={20} /></button></div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="mb-3 flex gap-2"><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nama customer..." className="flex-1 rounded-xl border bg-gray-50 px-3 py-2 text-sm" /><input value={table} onChange={e => setTable(e.target.value)} placeholder="Meja" className="w-16 rounded-xl border bg-gray-50 px-2 py-2 text-center text-sm" /></div>
                        {cart.length ? cart.map(item => (
                            <div key={item.sku} className="mb-3 rounded-xl border bg-gray-50 p-3">
                                <div className="flex justify-between items-center text-sm font-semibold gap-2">
                                    <span className="line-clamp-2 w-full" title={item.name}>{item.name}</span>
                                    <button type="button" onClick={() => setCart(cart.filter(x => x.sku !== item.sku))} className="shrink-0"><Trash2 size={16} className="text-gray-400" /></button>
                                </div>
                                <div className="mt-2 flex items-center justify-between"><b className="text-sm text-rose-600">{formatRp(item.price * item.qty)}</b><span className="flex items-center gap-3 rounded-lg border bg-white p-1"><button type="button" onClick={() => changeQty(item.sku, -1)}><Minus size={14} /></button>{item.qty}<button type="button" onClick={() => changeQty(item.sku, 1)}><Plus size={14} /></button></span></div>
                            </div>
                        )) : <p className="py-10 text-center text-sm text-gray-400">Kosong</p>}
                    </div>
                    <div className="border-t p-4">
                        <div className="mb-2 flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatRp(subtotal)}</span></div>
                        <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
                            <span>Diskon (Rp)</span>
                            <input type="number" value={discount} onChange={e => setDiscount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" className="w-24 rounded-lg border bg-gray-50 px-2 py-1 text-right outline-none focus:border-rose-500" />
                        </div>
                        <div className="mb-3 flex justify-between text-lg font-black"><span>Total</span><span className="text-rose-600">{formatRp(total)}</span></div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={holdBill} className="rounded-xl bg-orange-100 py-3 text-sm font-bold text-orange-600 active:scale-95 transition">Tahan ☁️</button>
                            <button type="button" onClick={clearCart} className="rounded-xl bg-gray-100 py-3 text-sm font-bold active:scale-95 transition">Batal</button>
                        </div>
                        <button type="button" onClick={() => { setMobileCart(false); openPayment(); }} className="mt-2 w-full rounded-xl bg-rose-600 py-4 text-lg font-bold text-white active:scale-95 transition">BAYAR {formatRp(total)}</button>
                    </div>
                </div>
            )}

            {/* Modal Pembayaran dengan Animasi Profesional */}
            {paymentOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !qrisWaiting && setPaymentOpen(false)}>
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>

                        {/* JIKA STATUS MENUNGGU QRIS */}
                        {qrisWaiting ? (
                            <div className="py-8 space-y-4">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600 animate-pulse">
                                    <span className="text-4xl">📱</span>
                                </div>
                                <h2 className="text-xl font-black">Menunggu Pembayaran QRIS</h2>
                                <p className="text-xs text-gray-500">Silakan scan QR code di EDC / layar customer.<br />Sistem sedang memverifikasi transaksi...</p>
                                <div className="mt-6 flex justify-center items-center gap-2 text-rose-600 font-bold text-sm">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent"></span>
                                    Mengecek status pembayaran...
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-5 flex items-center justify-between">
                                    <h2 className="text-lg font-black text-left">Pembayaran</h2>
                                    <button type="button" onClick={() => setPaymentOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
                                </div>
                                <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-center">
                                    <p className="text-xs text-rose-600">Total yang harus dibayar</p>
                                    <p className="text-3xl font-black text-rose-600">{formatRp(total)}</p>
                                </div>
                                <div className="mb-4 text-left">
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Metode Pembayaran</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {["CASH", "QRIS", "TRANSFER"].map(m => (
                                            <button type="button" key={m} onClick={() => setPaymentMethod(m)} className={`rounded-xl py-3 text-sm font-bold ${paymentMethod === m ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-600"}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>

                                {paymentMethod === "QRIS" ? (
                                    <div className="mb-6 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/50 p-4 text-center">
                                        <p className="text-xs font-bold text-rose-700 mb-2">Scan QRIS KAMI KAMI KITA</p>
                                        <div className="mx-auto h-32 w-32 bg-white p-2 rounded-xl shadow-sm flex items-center justify-center">
                                            <span className="text-4xl">📷</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2">Nominal otomatis sesuai total tagihan</p>
                                    </div>
                                ) : (
                                    <div className="mb-4 text-left">
                                        <label className="mb-1 block text-xs font-bold text-gray-500">Nominal Bayar</label>
                                        <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-2xl font-bold outline-none focus:border-rose-500" placeholder="0" />
                                        <div className="mt-2 flex gap-2">
                                            {[Math.ceil(total), Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000].filter((v, i, a) => a.indexOf(v) === i).map(amt => (
                                                <button type="button" key={amt} onClick={() => setPaidAmount(String(amt))} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200">{formatRp(amt)}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {paymentMethod !== "QRIS" && Number(paidAmount) >= total && (
                                    <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-center">
                                        <p className="text-xs text-emerald-600">Kembalian</p>
                                        <p className="text-xl font-black text-emerald-600">{formatRp(Number(paidAmount) - total)}</p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (paymentMethod === "QRIS") {
                                            setQrisWaiting(true);
                                            // Simulasi tunggu pembayaran QRIS masuk (3 detik)
                                            setTimeout(async () => {
                                                setQrisWaiting(false);
                                                await completePayment(total); // Bayar lunas pas untuk QRIS
                                            }, 3000);
                                        } else {
                                            completePayment();
                                        }
                                    }}
                                    disabled={paymentLoading}
                                    className="w-full rounded-2xl bg-rose-600 py-4 text-lg font-bold text-white disabled:bg-gray-300 transition hover:bg-rose-700 active:scale-95"
                                >
                                    {paymentLoading ? "Memproses..." : paymentMethod === "QRIS" ? "Cek Status Pembayaran QRIS" : "✓ Konfirmasi Bayar"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Sukses & Cetak Struk */}
            {successModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-4xl font-bold shadow-inner">✓</div>
                        <h2 className="text-2xl font-black mb-1 text-slate-800">Pembayaran Diterima</h2>
                        <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wider">Transaksi Berhasil & Tercatat</p>
                        <p className="text-xs text-gray-500 mb-6">Metode: <b className="text-slate-700">{lastOrder?.paymentMethod}</b> {lastOrder?.changeAmount > 0 ? `• Kembalian: ${formatRp(lastOrder?.changeAmount)}` : ""}</p>
                        <div className="space-y-2">
                            <button type="button" onClick={() => printReceiptData(lastOrder)} disabled={printing} className="w-full rounded-2xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-md flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition active:scale-95">
                                <Printer size={18} /> {printing ? "Mempersiapkan Cetak..." : "🖨️ Cetak Struk Kasir"}
                            </button>
                            <button type="button" onClick={() => setSuccessModal(false)} className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200 transition active:scale-95">
                                Selesai / Transaksi Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifikasi Toast */}
            {toast && (
                <div className="fixed right-5 top-5 z-50 rounded-xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700 shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}

// ==========================================
// KOMPONEN PENDUKUNG (UI)
// ==========================================

function MenuIcon() { return <span className="text-2xl">☰</span>; }

function Nav({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={`flex flex-col items-center rounded-2xl p-3 text-[10px] font-bold transition active:scale-90 ${active ? "border border-rose-100 bg-rose-50 text-rose-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}>
            {icon}<span className="mt-1">{label}</span>
        </button>
    );
}

// HistoryPanel dengan Filter Tanggal (Dari & Sampai)
function HistoryPanel({ onReprint, printing }: { onReprint: (tx: TransactionRecord) => void; printing: boolean }) {
    const [history, setHistory] = useState<TransactionRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<TransactionRecord | null>(null);

    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => {
        const d = new Date(); d.setHours(23, 59, 59, 999);
        return d.toISOString().slice(0, 10);
    });

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) { params.set("startDate", new Date(dateFrom + "T00:00:00").toISOString()); }
            if (dateTo) { params.set("endDate", new Date(dateTo + "T23:59:59").toISOString()); }
            params.set("limit", "200");

            const response = await fetch(`/api/orders?${params.toString()}`);
            const data = await response.json();
            setHistory((data.orders || []).map((order: any) => {
                const items = (order.items || []).map((item: any) => ({
                    productName: item.productName, quantity: item.quantity,
                    unitPrice: Number(item.unitPrice), totalPrice: Number(item.totalPrice),
                    costPrice: item.product ? Number(item.product.costPrice) : Number(item.unitPrice),
                }));
                const totalCost = items.reduce((sum: number, i: any) => sum + i.costPrice * i.quantity, 0);
                const totalRev = Number(order.totalAmount);
                return {
                    id: order.id, orderNumber: order.orderNumber, customerName: order.customerName, tableNumber: order.tableNumber,
                    items,
                    subtotal: Number(order.subtotal || totalRev), taxAmount: Number(order.taxAmount || 0), totalAmount: totalRev,
                    paidAmount: Number(order.paidAmount || totalRev), changeAmount: Number(order.changeAmount || 0), paymentMethod: order.paymentMethod,
                    profit: totalRev - totalCost, createdAt: order.createdAt,
                };
            }));
        } catch {
            console.error("Gagal memuat riwayat transaksi");
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const totalRevenue = history.reduce((s, tx) => s + tx.totalAmount, 0);
    const totalProfit = history.reduce((s, tx) => s + tx.profit, 0);

    return (
        <div className="mx-auto max-w-4xl">
            {/* Filter Tanggal Riwayat Kasir */}
            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-500">Dari Tanggal
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400" />
                </label>
                <label className="text-xs font-bold text-slate-500">Sampai Tanggal
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400" />
                </label>
                <button type="button" onClick={loadHistory} className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">🔍 Tampilkan</button>
            </div>

            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">{history.length} transaksi tercatat</p>
            </div>
            {history.length > 0 && (
                <div className="mb-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm text-center"><p className="text-xs text-gray-500">Total Pendapatan</p><p className="mt-1 text-xl font-black text-rose-600">{formatRp(totalRevenue)}</p></div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm text-center"><p className="text-xs text-gray-500">Total Keuntungan</p><p className="mt-1 text-xl font-black text-emerald-600">{formatRp(totalProfit)}</p></div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm text-center"><p className="text-xs text-gray-500">Total Transaksi</p><p className="mt-1 text-xl font-black">{history.length}</p></div>
                </div>
            )}
            {loading ? <p className="py-10 text-center text-gray-400">Memuat riwayat...</p> : history.length === 0 ? <p className="py-16 text-center text-gray-400">Tidak ada transaksi di rentang tanggal ini</p> : history.map(tx => (
                <div key={tx.id} onClick={() => setSelectedDetail(tx)} className="mb-3 rounded-2xl border bg-white p-5 shadow-sm hover:border-rose-400 cursor-pointer transition">
                    <div className="flex justify-between items-center">
                        <div>
                            <b>{tx.orderNumber}</b>
                            <span className="ml-2 text-xs text-gray-500">{tx.customerName && `• ${tx.customerName}`}</span>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button type="button" onClick={() => onReprint(tx)} disabled={printing} className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 disabled:opacity-50">
                                <Printer size={14} /> Cetak Struk
                            </button>
                        </div>
                    </div>
                    <p className="my-2 text-xs text-gray-600">{tx.items.map(item => `${item.productName} x${item.quantity}`).join(", ")}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 mt-2">
                        <div className="flex items-center gap-2">
                            <strong className="text-rose-600">{formatRp(tx.totalAmount)}</strong>
                            <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{tx.paymentMethod || "-"}</span>
                            <span className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString("id-ID")}</span>
                        </div>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${tx.profit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>Untung: {formatRp(tx.profit)}</span>
                    </div>
                </div>
            ))}
            {/* Modal Detail */}
            {selectedDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedDetail(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-3">
                            <div><h3 className="font-black text-lg">{selectedDetail.orderNumber}</h3><p className="text-xs text-gray-500">{new Date(selectedDetail.createdAt).toLocaleString("id-ID")}</p></div>
                            <button type="button" onClick={() => setSelectedDetail(null)} className="text-gray-400 hover:text-gray-900 font-bold text-xl">✕</button>
                        </div>
                        <div className="my-4 max-h-60 overflow-y-auto space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rincian Menu Pesanan:</p>
                            {selectedDetail.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed pb-2">
                                    <div><p className="font-medium text-gray-800">{item.productName}</p><p className="text-xs text-gray-500">{item.quantity}x @ {formatRp(item.unitPrice)}</p></div>
                                    <p className="font-bold text-gray-900">{formatRp(item.totalPrice)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-3 mb-5 space-y-1">
                            <div className="flex justify-between text-sm text-gray-600"><span>Metode Pembayaran</span><span className="font-bold">{selectedDetail.paymentMethod}</span></div>
                            <div className="flex justify-between font-black text-base text-gray-900"><span>Total Pembayaran</span><span className="text-rose-600">{formatRp(selectedDetail.totalAmount)}</span></div>
                        </div>
                        <button type="button" onClick={() => setSelectedDetail(null)} className="w-full rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:bg-slate-800">Tutup</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function AttendancePanel({ videoRef, camera, startCamera, stopCamera, type, setType, submit, loading, message, staff, selectedStaffId, setSelectedStaffId }: any) {
    return (
        <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    {!camera && <span className="absolute inset-0 grid place-items-center text-sm text-white">Kamera belum aktif</span>}
                </div>
                <div className="mt-3 flex gap-2">
                    <button type="button" onClick={startCamera} disabled={camera} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:bg-gray-300">📷 Aktifkan Kamera</button>
                    <button type="button" onClick={stopCamera} disabled={!camera} className="rounded-xl border px-4 font-bold">Matikan</button>
                </div>
            </div>
            <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
                <label className="text-sm font-bold">Nama Karyawan
                    <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="mt-2 w-full rounded-xl border bg-gray-50 px-3 py-3 text-sm">
                        <option value="">-- Pilih nama --</option>
                        {staff.map((s: any) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
                    </select>
                </label>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setType("CHECK_IN")} className={`rounded-xl p-3 font-bold ${type === "CHECK_IN" ? "bg-emerald-600 text-white" : "bg-gray-100"}`}>🟢 Masuk</button>
                    <button type="button" onClick={() => setType("CHECK_OUT")} className={`rounded-xl p-3 font-bold ${type === "CHECK_OUT" ? "bg-orange-500 text-white" : "bg-gray-100"}`}>🔴 Pulang</button>
                </div>
                <button type="button" onClick={submit} disabled={!camera || loading || !selectedStaffId} className="mt-4 w-full rounded-xl bg-rose-600 py-4 font-bold text-white disabled:bg-gray-300">
                    {loading ? "Menyimpan..." : "📸 Ambil Foto & Absen"}
                </button>
                {message && <p className="mt-3 text-center text-sm text-gray-600">{message}</p>}
            </div>
        </div>
    );
}