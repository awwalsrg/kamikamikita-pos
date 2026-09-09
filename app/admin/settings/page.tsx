"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/admin/AdminSidebar";

type User = { id: string; name: string; email: string; role: string };

export default function AdminSettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // State untuk Pengaturan PIN Kasir
    const [cashierPin, setCashierPin] = useState("");
    const [pinLoading, setPinLoading] = useState(false);
    const [pinMessage, setPinMessage] = useState("");
    const [pinError, setPinError] = useState("");

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("kamikamikita-user");
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);
                if (userData.role !== "ADMIN") router.push("/login");
            } else {
                router.push("/login");
            }
        } catch { router.push("/login"); }

        // Fetch PIN kasir yang aktif saat ini dari database VPS
        fetch("/api/settings/pin")
            .then(res => res.json())
            .then(data => {
                if (data.success && data.pin) {
                    setCashierPin(data.pin);
                }
            })
            .catch(() => { });
    }, [router]);

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        if (newPassword !== confirmPassword) {
            setError("Password baru dan konfirmasi tidak cocok");
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError("Password baru minimal 6 karakter");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id, currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
            setMessage("✓ Password berhasil diubah!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal mengubah password");
        } finally {
            setLoading(false);
        }
    }

    async function handleSavePin(e: React.FormEvent) {
        e.preventDefault();
        setPinLoading(true);
        setPinError("");
        setPinMessage("");

        if (cashierPin.length !== 4) {
            setPinError("PIN kasir harus tepat 4 digit angka");
            setPinLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/settings/pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: cashierPin }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menyimpan PIN");
            setPinMessage("✓ PIN Kasir berhasil diperbarui secara global di database VPS!");
        } catch (err) {
            setPinError(err instanceof Error ? err.message : "Gagal menyimpan PIN");
        } finally {
            setPinLoading(false);
        }
    }

    async function handleResetData() {
        if (!confirm("⚠️ PERINGATAN: Yakin ingin menghapus seluruh riwayat transaksi dummy dan absensi? Data tidak bisa dikembalikan!")) {
            return;
        }

        setResetLoading(true);
        try {
            const res = await fetch("/api/admin/reset-data", {
                method: "POST",
                headers: { "Cache-Control": "no-cache" }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert("✓ Berhasil! Semua data transaksi dummy sudah bersih dari database.");
                window.location.reload();
            } else {
                alert("Gagal mereset data: " + (data.error || "Unknown error"));
            }
        } catch {
            alert("Terjadi kesalahan sistem saat mereset data.");
        } finally {
            setResetLoading(false);
        }
    }

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
                        <div className="flex items-center gap-2">
                            <span className="hidden text-xs text-slate-500 md:block">{user?.name || "Admin"}</span>
                            <a href="/admin" className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">Dashboard</a>
                        </div>
                    </div>
                </nav>

                <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
                    <header className="mb-6">
                        <p className="text-xs font-black uppercase tracking-[.25em] text-rose-600">Pengaturan</p>
                        <h1 className="mt-1 text-2xl font-black md:text-3xl">Profil & Keamanan</h1>
                        <p className="mt-1 text-sm text-slate-500">Kelola akun admin, ubah password, PIN kasir, dan pembersihan data uji coba.</p>
                    </header>

                    {/* Profile Info */}
                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-bold">👤 Profil Akun</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Nama</label>
                                <p className="mt-1 rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold">{user?.name || "-"}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Email</label>
                                <p className="mt-1 rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold">{user?.email || "-"}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Role</label>
                                <p className="mt-1 rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold">{user?.role || "-"}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">ID Akun</label>
                                <p className="mt-1 rounded-xl border bg-slate-50 px-4 py-3 text-xs font-mono text-slate-400">{user?.id || "-"}</p>
                            </div>
                        </div>
                    </section>

                    {/* Pengaturan PIN Kasir */}
                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-bold">🔐 Pengaturan PIN Kasir</h2>
                        <p className="mb-4 text-xs text-slate-500">Ubah PIN 4 digit untuk membuka halaman kasir di seluruh perangkat secara sinkron.</p>

                        {pinMessage && <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700">{pinMessage}</div>}
                        {pinError && <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-bold text-red-700">⚠️ {pinError}</div>}

                        <form onSubmit={handleSavePin} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-500">PIN Kasir Baru (4 Digit)</label>
                                <input
                                    type="password"
                                    maxLength={4}
                                    inputMode="numeric"
                                    value={cashierPin}
                                    onChange={e => setCashierPin(e.target.value)}
                                    placeholder="Contoh: 1818"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                />
                            </div>
                            <button type="submit" disabled={pinLoading || cashierPin.length !== 4} className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:bg-slate-300">
                                {pinLoading ? "Menyimpan..." : "💾 Simpan PIN Kasir"}
                            </button>
                        </form>
                    </section>

                    {/* Change Password */}
                    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-bold">🔒 Ubah Password Admin</h2>

                        {message && <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700">{message}</div>}
                        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-bold text-red-700">⚠️ {error}</div>}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-500">Password Lama</label>
                                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Masukkan password lama" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-500">Password Baru</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-500">Konfirmasi Password Baru</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                            </div>
                            <button type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword} className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:bg-slate-300">
                                {loading ? "Menyimpan..." : "💾 Simpan Password Baru"}
                            </button>
                        </form>
                    </section>

                    {/* Danger Zone: Reset Data Dummy */}
                    <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                        <h2 className="text-base font-black text-red-700">⚠️ Zona Bahaya / Reset Data Trial</h2>
                        <p className="mt-1 text-xs text-red-600 leading-relaxed">
                            Gunakan tombol ini untuk menghapus seluruh riwayat transaksi dummy dan absensi sebelum kedai resmi dibuka. Daftar menu produk dan data karyawan tetap aman.
                        </p>
                        <button
                            onClick={handleResetData}
                            disabled={resetLoading}
                            className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:bg-red-300"
                        >
                            {resetLoading ? "Sedang Membersihkan..." : "🗑️ Reset Semua Data Dummy Transaksi"}
                        </button>
                    </section>
                </div>
            </main>
        </div>
    );
}