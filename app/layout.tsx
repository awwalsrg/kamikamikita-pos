import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// DI SINI TEMPAT MENGUBAH JUDUL DAN LOGO
export const metadata: Metadata = {
  title: "KamiKamiKita - POS",
  description: "Sistem Kasir dan Manajemen Kedai KamiKamiKita",
  icons: {
    icon: "/logo-kkk.png", // Akan menggunakan logo kafe yang ada di folder public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
