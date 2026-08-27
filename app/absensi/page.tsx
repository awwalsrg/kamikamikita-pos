"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; role: string };
type AttendanceType = "CHECK_IN" | "CHECK_OUT";

export default function AbsensiPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [type, setType] = useState<AttendanceType>("CHECK_IN");
    const [cameraReady, setCameraReady] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/users").then((res) => res.json()).then((data) => setUsers(data.users || [])).catch(() => setMessage("Gagal memuat karyawan."));
        return () => stopCamera();
    }, []);

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
            if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setCameraReady(true); setMessage("Kamera siap. Posisikan wajah di dalam lingkaran."); }
        } catch { setMessage("Kamera tidak bisa dibuka. Izinkan akses kamera di browser."); }
    }
    function stopCamera() {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraReady(false);
    }
    function capturePhoto() {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return "";
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.75);
    }
    async function submitAttendance() {
        if (!selectedUser || !cameraReady) { setMessage("Pilih karyawan dan aktifkan kamera terlebih dahulu."); return; }
        setProcessing(true); setMessage("Mengambil foto dan menyimpan absensi...");
        try {
            const res = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUser, type, imageUrl: capturePhoto(), deviceInfo: navigator.userAgent }) });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Gagal menyimpan absensi");
            setMessage(`${users.find((u) => u.id === selectedUser)?.name || "Karyawan"} berhasil absen ${type === "CHECK_IN" ? "masuk" : "pulang"}.`);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan absensi"); }
        finally { setProcessing(false); }
    }

    return <main className="min-h-screen bg-slate-100 p-5 text-slate-900 md:p-10"><div className="mx-auto max-w-5xl"><header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.25em] text-rose-600">KAMIKAMIKITA</p><h1 className="mt-2 text-3xl font-black">Absensi Foto Karyawan</h1><p className="text-sm text-slate-500">Pilih nama, ambil foto sebagai bukti, tanpa pendaftaran wajah.</p></div><button onClick={() => router.push("/kasir")} className="rounded-xl bg-slate-950 px-4 py-2 font-bold text-white">← Kembali ke Kasir</button></header>{message && <div className="mb-5 rounded-xl bg-blue-100 p-4 font-bold text-blue-800">{message}</div>}<div className="grid gap-5 lg:grid-cols-[1fr_350px]"><section className="rounded-2xl bg-white p-5 shadow-sm"><div className="relative overflow-hidden rounded-xl bg-slate-900"><video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" /><div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-56 w-56 rounded-full border-4 border-dashed border-emerald-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]" /></div><p className="absolute bottom-3 left-0 right-0 text-center text-sm font-bold text-white">Posisikan wajah di dalam lingkaran</p></div><div className="mt-3 flex gap-2"><button onClick={startCamera} disabled={cameraReady} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:bg-slate-300">📷 Aktifkan Kamera</button><button onClick={stopCamera} disabled={!cameraReady} className="rounded-xl border px-4 font-bold">Matikan</button></div></section><section className="rounded-2xl bg-white p-5 shadow-sm"><label className="text-sm font-bold">Nama Karyawan<select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3"><option value="">-- Pilih nama --</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</select></label><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setType("CHECK_IN")} className={`rounded-xl p-3 font-bold ${type === "CHECK_IN" ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>🟢 Masuk</button><button onClick={() => setType("CHECK_OUT")} className={`rounded-xl p-3 font-bold ${type === "CHECK_OUT" ? "bg-orange-500 text-white" : "bg-slate-100"}`}>🔴 Pulang</button></div><button onClick={submitAttendance} disabled={processing || !cameraReady || !selectedUser} className="mt-5 w-full rounded-xl bg-rose-600 py-4 font-black text-white disabled:bg-slate-300">{processing ? "Menyimpan..." : "📸 Ambil Foto & Absen"}</button><p className="mt-4 text-xs text-slate-500">Foto bukti disimpan pada catatan absensi. Data wajah/descriptor tidak disimpan dan tidak diperlukan.</p></section></div></div></main>;
}
