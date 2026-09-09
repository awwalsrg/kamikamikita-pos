"use client";

import { useState } from "react";

interface PinOverlayProps {
    onSuccess: () => void;
}

export default function PinOverlay({ onSuccess }: PinOverlayProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    // PIN sementara untuk kasir (bisa diganti kapan saja)
    const CORRECT_PIN = "1234";

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Batasi input maksimal 4 digit angka
        if (/^\d{0,4}$/.test(value)) {
            setPin(value);
            setError(false);

            // Cek otomatis saat sudah 4 digit
            if (value.length === 4) {
                if (value === CORRECT_PIN) {
                    onSuccess();
                } else {
                    setError(true);
                    setPin(""); // Reset otomatis kalau salah
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center w-96">
                <h2 className="text-2xl font-bold mb-2">Masukan PIN Kasir</h2>
                <p className="text-gray-500 mb-6 text-sm">Untuk keamanan shift, silakan masukkan PIN Anda.</p>

                <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={pin}
                    onChange={handlePinChange}
                    className={`w-full text-center text-4xl tracking-[1em] p-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${error
                            ? "border-red-500 focus:ring-red-200"
                            : "border-gray-200 focus:border-red-600 focus:ring-red-100"
                        }`}
                    placeholder="••••"
                />

                {error && (
                    <p className="text-red-500 mt-4 text-sm animate-bounce">PIN salah, silakan coba lagi!</p>
                )}
            </div>
        </div>
    );
}