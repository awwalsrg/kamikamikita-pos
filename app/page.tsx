"use client";

import Link from 'next/link';
import { MessageCircle, MapPin, BookOpen, Lock } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#4A1515] text-[#FDF8F6] flex flex-col items-center justify-between p-6 md:p-12">
      {/* Bagian Header / Logo */}
      <div className="w-full max-w-md text-center space-y-3 mt-8">
        <div className="w-24 h-24 mx-auto bg-[#FDF8F6]/10 rounded-full flex items-center justify-center border border-[#FDF8F6]/20 shadow-lg overflow-hidden">
          <img src="/logo-kkk.png" alt="KamiKita Logo" className="w-full h-full object-contain p-2" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-wide">KAMI KITA COFFEE</h1>
        <p className="text-[#FDF8F6]/80 text-sm">
          Ruang nyaman untuk secangkir kopi terbaik di setiap cerita kita. ☕✨
        </p>
      </div>

      {/* Bagian Tombol Tautan (Link-in-Bio Instagram) */}
      <div className="w-full max-w-md space-y-4 my-8">
        {/* Tombol WhatsApp Reservasi */}
        <a
          href="https://wa.me/6282294542673?text=Halo%20Kami%20Kita%20Coffee,%20saya%20ingin%20melakukan%20reservasi."
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#FDF8F6] text-[#4A1515] font-semibold py-4 px-6 rounded-xl shadow-md flex items-center justify-center space-x-3 transition-transform active:scale-95 hover:bg-white"
        >
          <MessageCircle className="w-5 h-5 text-green-600" />
          <span>WhatsApp Reservasi & Tanya Meja</span>
        </a>

        {/* Tombol Lihat Foto Menu */}
        <Link
          href="/menu"
          className="w-full bg-[#5E1A1A] border border-[#FDF8F6]/30 text-[#FDF8F6] font-semibold py-4 px-6 rounded-xl shadow-md flex items-center justify-center space-x-3 transition-transform active:scale-95 hover:bg-[#6e1f1f]"
        >
          <BookOpen className="w-5 h-5 text-amber-200" />
          <span>Lihat Foto Menu & Harga</span>
        </Link>

        {/* Tombol Lokasi Kedai (Google Maps Resmi) */}
        <a
          href="https://maps.app.goo.gl/Q1pQVFfvxfKmZzP3A"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#5E1A1A] border border-[#FDF8F6]/30 text-[#FDF8F6] font-semibold py-4 px-6 rounded-xl shadow-md flex items-center justify-center space-x-3 transition-transform active:scale-95 hover:bg-[#6e1f1f]"
        >
          <MapPin className="w-5 h-5 text-red-400" />
          <span>Lokasi Kedai (Google Maps)</span>
        </a>
      </div>

      {/* Bagian Footer / Akses Staf (Admin & Kasir) */}
      <div className="w-full max-w-md text-center pt-6 border-t border-[#FDF8F6]/10 space-y-3">
        <div className="flex justify-center gap-4">
          <Link
            href="/kasir"
            className="text-xs text-[#FDF8F6]/70 hover:text-[#FDF8F6] transition-colors py-2 px-3 rounded-lg bg-black/20"
          >
            Buka Kasir
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-1.5 text-xs text-[#FDF8F6]/70 hover:text-[#FDF8F6] transition-colors py-2 px-3 rounded-lg bg-black/20"
          >
            <Lock className="w-3 h-3" />
            <span>Back Office</span>
          </Link>
        </div>
        <p className="text-[10px] text-[#FDF8F6]/40 mt-2">
          © 2026 Kami Kita Coffee. All rights reserved.
        </p>
      </div>
    </main>
  );
}