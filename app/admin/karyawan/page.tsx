"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/admin/AdminSidebar";
import { loadFaceApiModels, startVideoStream, stopVideoStream, detectFaceFromVideo, captureFromVideo, descriptorToArray } from "@/lib/face-recognition";

type User = { id: string; name: string; email: string; role: string; faceRegistered: boolean };

export default function EmployeeFacePage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [cameraReady, setCameraReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Form Tambah Karyawan Baru
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [addingStaff, setAddingStaff] = useState(false);

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

    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState("");
    const [autoDescriptor, setAutoDescriptor] = useState<Float32Array | null>(null);

    useEffect(() => {
        async function init() {
            setLoading(true);
            const [modelReady] = await Promise.all([loadFaceApiModels(), loadUsers()]);
            if (!modelReady) setMessage("Model face recognition gagal dimuat.");
            setLoading(false);
        }
        init();
        return () => { if (videoRef.current) stopVideoStream(videoRef.current); };
    }, []);

    async function loadUsers() {
        try {
            const res = await fetch("/api/users");
            const data = await res.json();
            setUsers(data.users || []);
        } catch { setMessage("Gagal memuat daftar karyawan."); }
    }

    async function enableCamera() {
        if (!videoRef.current) return;
        const ready = await startVideoStream(videoRef.current);
        setCameraReady(ready);
        if (!ready) setMessage("Kamera tidak dapat dibuka. Izinkan akses kamera di browser.");
    }

    useEffect(() => {
        if (!cameraReady || !selectedUser) return;
        let stopped = false;
        const scan = async () => {
            if (stopped || processing || !videoRef.current) return;
            const descriptor = await detectFaceFromVideo(videoRef.current);
            if (stopped) return;
            if (descriptor) {
                setAutoDescriptor(descriptor);
                setMessage("Wajah terdeteksi otomatis. Klik Simpan Wajah.");
            } else {
                setAutoDescriptor(null);
                setMessage("Mencari wajah otomatis...");
            }
        };
        const timer = window.setInterval(scan, 700);
        scan();
        return () => { stopped = true; window.clearInterval(timer); };
    }, [cameraReady, selectedUser, processing]);

    async function registerFace() {
        if (!selectedUser || !videoRef.current || !cameraReady) {
            setMessage("Pilih karyawan dan aktifkan kamera terlebih dahulu.");
            return;
        }
        setProcessing(true); setMessage("Menyimpan wajah yang sudah terdeteksi...");
        try {
            const descriptor = autoDescriptor || await detectFaceFromVideo(videoRef.current);
            if (!descriptor) { setMessage("Wajah belum terdeteksi otomatis. Hadapkan wajah ke kamera lalu tunggu indikator hijau."); return; }
            setMessage("Wajah terdeteksi, menyimpan data...");
            const res = await fetch("/api/employee-face", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser, faceDescriptor: descriptorToArray(descriptor), faceImageUrl: captureFromVideo(videoRef.current), confidence: 0.8 }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Pendaftaran gagal");
            setMessage("Wajah berhasil didaftarkan. Karyawan sekarang bisa absen masuk/pulang.");
            await loadUsers();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Pendaftaran wajah gagal."); }
        finally { setProcessing(false); }
    }

    async function handleAddStaff(e: React.FormEvent) {
        e.preventDefault();
        if (!newName || !newEmail) {
            alert("Nama dan Email wajib diisi!");
            return;
        }

        setAddingStaff(true);
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, email: newEmail, role: "STAFF", password: "password123" }),
            });
            const data = await res.json();
            if (res.ok) {
                alert("✓ Karyawan baru berhasil ditambahkan! (Password awal: password123)");
                setNewName("");
                setNewEmail("");
                await loadUsers();
            } else {
                alert("Gagal menambah karyawan: " + (data.error || "Unknown error"));
            }
        } catch {
            alert("Terjadi kesalahan sistem.");
        } finally {
            setAddingStaff(false);
        }
    }

    async function handleDeleteUser(id: string, name: string) {
        if (!confirm(`⚠️ Yakin ingin menghapus/memecat "${name}"? Akun dan data terkait akan dihapus permanen.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                alert("✓ Karyawan berhasil dihapus.");
                await loadUsers();
            } else {
                alert("Gagal menghapus karyawan.");
            }
        } catch {
            alert("Terjadi kesalahan sistem.");
        }
    }

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
                        <a href="/admin/attendance" className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Absensi</a>
                        <a href="/admin/transactions" className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Transaksi</a>
                        <a href="/admin/karyawan" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900">Karyawan</a>
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
                    <p className="text-xs font-black uppercase tracking-[.25em] text-rose-600">Manajemen Karyawan</p>
                    <h1 className="mt-1 text-2xl font-black md:text-3xl">Kelola Karyawan & Wajah Absensi</h1>
                    <p className="mt-1 text-sm text-slate-500">Tambah akun staf baru, hapus karyawan lama, dan daftarkan wajah untuk absensi face recognition.</p>
                </header>

                {message && (
                    <div className={`mb-5 rounded-xl p-4 text-sm font-bold ${message.includes("berhasil") || message.includes("terdeteksi") ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"}`}>
                        {message}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Left Panel - Registration & Add Staff */}
                    <div className="space-y-5">
                        {/* Form Tambah Karyawan */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm">
                            <h2 className="mb-3 text-lg font-black">➕ Tambah Karyawan Baru</h2>
                            <form onSubmit={handleAddStaff} className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Nama Lengkap</label>
                                    <input type="text" placeholder="Contoh: Budi Staf" value={newName} onChange={e => setNewName(e.target.value)} className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Email Karyawan</label>
                                    <input type="email" placeholder="budi@kamikamikita.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                                </div>
                                <button type="submit" disabled={addingStaff} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300">
                                    {addingStaff ? "Menambahkan..." : "💾 Simpan Karyawan Baru"}
                                </button>
                            </form>
                            <p className="mt-2 text-[11px] text-slate-400">*Password awal otomatis: <b>password123</b> (karyawan bisa mengubahnya nanti).</p>
                        </section>

                        {/* Pendaftaran Wajah */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm">
                            <h2 className="mb-4 text-lg font-black">1. Pilih Karyawan untuk Wajah</h2>
                            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100">
                                <option value="">-- Pilih karyawan --</option>
                                {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email} {user.faceRegistered ? "(sudah terdaftar)" : "(belum terdaftar)"}</option>)}
                            </select>

                            <h2 className="mb-4 mt-6 text-lg font-black">2. Kamera & Pendaftaran</h2>
                            <div className="relative overflow-hidden rounded-xl bg-slate-900">
                                <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="h-56 w-56 rounded-full border-4 border-dashed border-emerald-300/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.42)]" />
                                </div>
                                <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs font-bold text-white drop-shadow">Posisikan wajah di dalam lingkaran</div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={enableCamera} disabled={cameraReady || loading} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300">📷 Aktifkan Kamera</button>
                                <button onClick={() => { if (videoRef.current) stopVideoStream(videoRef.current); setCameraReady(false); }} disabled={!cameraReady} className="rounded-xl border px-4 py-3 text-sm font-bold transition hover:bg-slate-50 disabled:opacity-50">Matikan</button>
                            </div>
                            <button onClick={registerFace} disabled={processing || !cameraReady || !selectedUser || !autoDescriptor} className="mt-4 w-full rounded-xl bg-emerald-600 py-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-300">
                                {processing ? "Menyimpan..." : autoDescriptor ? "✅ Simpan Wajah Terdeteksi" : "⏳ Mencari Wajah Otomatis..."}
                            </button>
                        </section>
                    </div>

                    {/* Right Panel - Status & Delete Staff */}
                    <section className="rounded-2xl bg-white p-5 shadow-sm h-fit">
                        <h2 className="mb-4 text-lg font-black">Daftar Karyawan Aktif</h2>
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 transition hover:bg-slate-50">
                                    <div>
                                        <p className="font-bold text-sm">{user.name}</p>
                                        <p className="text-xs text-slate-500">{user.role} · {user.email}</p>
                                        <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${user.faceRegistered ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                            {user.faceRegistered ? "Wajah Terdaftar" : "Wajah Belum Terdaftar"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteUser(user.id, user.name)}
                                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                                        title="Hapus / Pecat Karyawan"
                                    >
                                        🗑️ Pecat
                                    </button>
                                </div>
                            ))}
                            {!users.length && <p className="text-sm text-slate-500">Belum ada data karyawan aktif.</p>}
                        </div>
                    </section>
                </div>
            </div>
        </main></div>
    );
}
