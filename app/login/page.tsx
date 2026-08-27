"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [usePin, setUsePin] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    useEffect(() => {
        // Check if already logged in
        const user = localStorage.getItem("kamikamikita-user");
        if (user) {
            const userData = JSON.parse(user);
            if (userData.role === "CASHIER") {
                router.push("/kasir");
            } else {
                router.push("/admin");
            }
        }
    }, []);

    function setAuthCookie(user: any, remember: boolean) {
        // Admin: cookie bertahan 15 jam (54000 detik) jika "Ingat Saya" dicentang
        // Kasir: cookie biasa 7 hari
        const maxAge = (user.role === "ADMIN" && remember) ? 60 * 60 * 15 : 60 * 60 * 24 * 7;
        document.cookie = `kamikamikita-auth=${btoa(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + maxAge * 1000 }))}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: usePin ? undefined : email,
                    pin: usePin ? pin : undefined,
                    password: usePin ? undefined : password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login gagal");
            }

            // Store user session
            localStorage.setItem("kamikamikita-user", JSON.stringify(data.user));
            setAuthCookie(data.user, rememberMe);

            // Redirect based on role
            if (data.user.role === "CASHIER") {
                router.push("/kasir");
            } else {
                router.push("/admin");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login gagal");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-4">
            <div className="w-full max-w-sm">
                {/* Logo & Brand */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg shadow-rose-900/50">
                        <img src="/logo-kkk.png" alt="KamiKamiKita" className="h-full w-full object-contain p-1" />
                    </div>
                    <h1 className="text-2xl font-black text-white">KamiKamiKita</h1>
                    <p className="mt-1 text-sm text-slate-400">Sistem POS & Manajemen Kedai</p>
                </div>

                {/* Login Card */}
                <div className="rounded-3xl bg-white p-6 shadow-2xl">
                    <div className="mb-5 text-center">
                        <h2 className="text-xl font-black text-slate-900">Masuk ke Sistem</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            {usePin ? "Masukkan PIN kasir" : "Masukkan email & password"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-bold text-red-700">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        {!usePin && (
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="remember" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                                <label htmlFor="remember" className="text-xs text-slate-600">Ingat saya selama 15 jam</label>
                            </div>
                        )}
                        {usePin ? (
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-500">PIN Kasir</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                    placeholder="••••"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-500">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@kamikamikita.com"
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-500">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (usePin ? pin.length < 4 : !email || !password)}
                            className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:bg-slate-300"
                        >
                            {loading ? "Memproses..." : "🚀 Masuk"}
                        </button>
                    </form>

                    <button
                        onClick={() => {
                            setUsePin(!usePin);
                            setError("");
                            setPin("");
                            setPassword("");
                        }}
                        className="mt-4 w-full text-center text-xs text-slate-500 transition hover:text-rose-600"
                    >
                        {usePin ? "🔑 Login dengan Email & Password" : "🔢 Login dengan PIN Kasir"}
                    </button>

                    {/* Demo Credentials */}
                    <div className="mt-5 rounded-xl bg-slate-50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Demo Credentials:</p>
                        <div className="space-y-1 text-[11px] text-slate-500">
                            <p><b>Admin:</b> boki@kamikamikita.com / admin123</p>
                            <p><b>Admin:</b> partner@kamikamikita.com / admin123</p>
                            <p><b>Kasir:</b> PIN: 1234</p>
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-center text-[10px] text-slate-600">
                    © 2026 KamiKamiKita Coffee · Sistem POS Terpadu
                </p>
            </div>
        </main>
    );
}
