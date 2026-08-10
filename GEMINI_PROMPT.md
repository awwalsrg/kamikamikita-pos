# PROMPT UNTUK GEMINI PRO - KAMIKIKITA POS SYSTEM

## KONTEKS PROJECT

Saya memiliki project POS System (Point of Sale) yang sedang dikembangkan dengan spesifikasi berikut:

### Tech Stack Saat Ini:
- **Framework**: Next.js 16.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL dengan Prisma ORM
- **Domain**: kamiakmikita.site
- **VPS**: 137.59.126.116

### Struktur Yang Sudah Ada:
```
pos-system/
├── app/
│   ├── page.tsx          (Landing page - Kamikamikita Coffee)
│   ├── kasir/page.tsx    (POS Interface)
│   ├── admin/page.tsx    (Back Office Admin)
│   ├── api/
│   │   ├── products/     (Product CRUD API)
│   │   ├── orders/       (Order management API)
│   │   └── upload/       (Image upload API)
│   └── components/
│       └── ImageUpload.tsx
├── prisma/
│   └── schema.prisma     (Full schema dengan User, Outlet, Product, Order, Payment, dll)
└── public/
```

### Database Schema (Prisma) Sudah Mencakup:
- Multi-outlet management
- User roles (SUPER_ADMIN, ADMIN, MANAGER, CASHIER)
- Product management dengan multi-outlet stock
- Order management (DINE_IN, TAKE_AWAY, DELIVERY, ONLINE)
- Payment gateway integration (Midtrans, Xendit, Duitku)
- Inventory tracking
- Customer management dengan points
- Daily reports & analytics

---

## FITUR YANG INGIN DITAMBAHKAN

### 1. SISTEM ABSENSI WAJAH (FACE RECOGNITION ATTENDANCE)

Buatkan sistem absensi karyawan menggunakan pengenalan wajah untuk:
- **Absensi Masuk**: Scan wajah saat datang kerja
- **Absensi Pulang**: Scan wajah saat pulang kerja
- **Anti-spoofing**: Mencegah penggunaan foto/video
- **Geofencing**: Validasi lokasi (opsional, berdasarkan IP VPS)
- **Real-time**: Langsung tercatat di database

**Spesifikasi Teknis:**
- Gunakan library face recognition JavaScript (face-api.js atau @vladmandic/faceapi)
- Kamera webcam akses via `navigator.mediaDevices.getUserMedia`
- Wajah di-capture dan di-compare dengan database wajah karyawan
- Simpan di tabel `Attendance` baru di Prisma schema
- Tampilan UI profesional di route `/absensi`

**Prisma Model Baru:**
```prisma
model EmployeeFace {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  faceDescriptor String // JSON string dari face descriptor (128D vector)
  faceImageUrl String?  // Foto wajah yang terdaftar
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attendances Attendance[]

  @@map("employee_faces")
}

model Attendance {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  employeeFaceId String?
  employeeFace EmployeeFace? @relation(fields: [employeeFaceId], references: [id])
  
  type        AttendanceType
  timestamp   DateTime @default(now())
  confidence  Decimal? // Tingkat kecocokan wajah (0-1)
  imageUrl    String?  // Foto saat absensi
  location    String?  // IP address atau lokasi
  deviceInfo  String?  // User agent / device info
  status      AttendanceStatus @default(VALID)
  notes       String?

  @@index([userId, timestamp])
  @@map("attendances")
}

enum AttendanceType {
  CHECK_IN    // Masuk
  CHECK_OUT   // Pulang
}

enum AttendanceStatus {
  VALID       // Valid
  INVALID     // Tidak valid (wajah tidak cocok)
  PENDING     // Menunggu verifikasi
}
```

---

### 2. UPGRADE KASIR MENJADI LEVEL INTERNASIONAL KOMERSIL

Transformasi `/kasir` menjadi sistem kasir profesional setara dengan:
- **McDonald's / Starbucks / 7-Eleven** level internasional
- **UI/UX**: Modern, fast, responsive, touch-optimized
- **Performance**: Instant search, keyboard shortcuts, smooth animations
- **Features**: Advanced POS features

**Fitur Kasir Profesional Yang Diminta:**

#### A. Interface & UX:
- **Dual-mode**: Touch mode (tablet/HP) dan Keyboard mode (PC)
- **Keyboard Shortcuts**: 
  - `F1-F12` untuk kategori produk
  - `1-9` quick add quantity
  - `Enter` untuk bayar
  - `Esc` untuk batal
  - `Ctrl+Z` undo
- **Animasi**: Smooth add-to-cart, success checkmark, receipt print animation
- **Multi-language**: Bahasa Indonesia & English
- **Dark/Light mode**: Sesuai preferensi

#### B. Advanced Cart Features:
- **Split bill**: Bagi tagihan ke beberapa customer
- **Discount system**: 
  - Persentase diskon (%)
  - Nominal diskon (Rp)
  - Happy hour diskon otomatis
  - Promo code system
- **Modifier/Options**: 
  - Tambahan (extra es, extra gula, less ice, dll)
  - Ukuran (small, medium, large)
  - Custom notes per item
- **Hold orders**: Tahan pesanan (untuk dilanjutkan nanti)
- **Merge tables**: Gabungkan pesanan dari meja berbeda

#### C. Payment Professional:
- **Multi-payment**: Bayar sebagian cash, sebagian QRIS
- **Split payment**: Beberapa metode sekaligus
- **Tip/Gratuity**: Tambah tip untuk pelayan
- **Receipt options**:
  - Print thermal receipt (ESC/POS commands)
  - Email receipt
  - WhatsApp receipt
  - QR code struk digital
- **Refund system**: Pengembalian dana dengan alasan

#### D. Customer Management:
- **Quick customer**: Input nama/telepon cepat
- **Member lookup**: Scan barcode member card
- **Points system**: Tukar poin dengan diskon
- **Customer history**: Riwayat pembelian customer

#### E. Kitchen Display System (KDS):
- **Real-time order**: Dapur lihat pesanan masuk langsung
- **Order status**: NEW → PREPARING → READY
- **Course timing**: Starter, main course, dessert timing
- **Route**: `/kds` untuk tampilan dapur

#### F. Reporting Real-time:
- **Live sales**: Penjualan hari ini real-time
- **Peak hours**: Jam sibuk analysis
- **Top products**: Produk terlaris
- **Cashier performance**: Kinerja kasir

---

### 3. DOMAIN & DEPLOYMENT SETUP

**Domain Configuration:**
- **Main domain**: `kamiakmikita.site` → Landing page & admin
- **Subdomain**: `kasir.kamiakmikita.site` → POS interface
- **Subdomain**: `api.kamiakmikita.site` → API endpoints
- **Subdomain**: `absensi.kamiakmikita.site` → Face attendance

**VPS Deployment (137.59.126.116):**
- Nginx reverse proxy configuration
- SSL/HTTPS dengan Let's Encrypt
- PM2 process manager untuk Node.js
- PostgreSQL setup di VPS
- Automated backup database

---

## REQUEST OUTPUT DARI GEMINI PRO

Tolong buatkan / lengkapi kode berikut:

### 1. **Prisma Schema Update**
- Tambahkan model `EmployeeFace` dan `Attendance`
- Update relasi yang diperlukan

### 2. **Face Recognition Module**
- `app/absensi/page.tsx` - Halaman absensi dengan kamera
- `app/api/attendance/route.ts` - API untuk record absensi
- `app/api/employee-face/route.ts` - API untuk register wajah karyawan
- `lib/face-recognition.ts` - Utility untuk face detection & matching

### 3. **Kasir Professional Upgrade**
- Upgrade `app/kasir/page.tsx` dengan semua fitur di atas
- `app/kasir/components/` - Pecah jadi komponen kecil
  - `ProductGrid.tsx` - Grid produk dengan keyboard shortcut
  - `CartPanel.tsx` - Panel keranjang belanja
  - `PaymentModal.tsx` - Modal pembayaran multi-method
  - `DiscountModal.tsx` - Modal diskon
  - `HoldOrderModal.tsx` - Modal tahan pesanan
  - `ReceiptPreview.tsx` - Preview struk
- `app/kasir/hooks/` - Custom hooks
  - `useKeyboardShortcut.ts`
  - `useCart.ts`
  - `usePayment.ts`

### 4. **Kitchen Display System**
- `app/kds/page.tsx` - Tampilan dapur real-time
- `app/api/kds/route.ts` - API untuk KDS

### 5. **Admin Backoffice Enhancement**
- Upgrade `app/admin/page.tsx` dengan:
  - Manajemen karyawan & registrasi wajah
  - Laporan absensi
  - Advanced sales reports dengan chart
  - Manajemen promo & diskon

### 6. **API Endpoints Lengkap**
- `app/api/attendance/route.ts` - CRUD absensi
- `app/api/employee-face/route.ts` - Registrasi wajah
- `app/api/reports/sales/route.ts` - Laporan penjualan
- `app/api/reports/attendance/route.ts` - Laporan absensi
- `app/api/promos/route.ts` - Manajemen promo
- `app/api/customers/route.ts` - CRUD customer dengan points

### 7. **Konfigurasi Deployment**
- `nginx/kamiakmikita.site.conf` - Nginx config
- `deploy.sh` - Script deployment yang sudah ada, update jika perlu
- `ecosystem.config.js` - PM2 config
- `.env.production` - Environment variables template

### 8. **Styling & UI**
- Gunakan **Tailwind CSS v4** dengan design system yang konsisten
- **Color scheme**: Professional dark/light dengan brand color rose/blue
- **Typography**: Clean, readable, professional
- **Icons**: Gunakan Lucide React atau Heroicons
- **Animations**: Framer Motion untuk transisi halus

---

## STANDAR KODE

- **TypeScript strict mode**: Semua type jelas
- **Error handling**: Try-catch di semua API routes
- **Validation**: Gunakan Zod untuk validasi input
- **Security**: 
  - Sanitize input
  - Rate limiting di API
  - Authentication & authorization check
- **Performance**:
  - Optimistic UI updates
  - Debounced search
  - Lazy loading images
  - Memoized components
- **Responsive**: Mobile-first, tablet optimized, desktop full-featured
- **Accessibility**: ARIA labels, keyboard navigation

---

## CONTOH WORKFLOW ABSENSI WAJAH

1. Karyawan buka `absensi.kamiakmikita.site`
2. Login dengan PIN/QR Code karyawan
3. Pilih "Absen Masuk" atau "Absen Pulang"
4. Kamera menyala, wajah otomatis terdeteksi
5. Sistem compare dengan database wajah
6. Jika cocok (confidence > 0.8), absensi tercatat
7. Tampil success animation + timestamp
8. Data masuk ke database + notifikasi ke admin

---

## CONTOH WORKFLOW KASIR PROFESIONAL

1. Kasir buka `kasir.kamiakmikita.site`
2. Login dengan PIN kasir
3. Pilih kategori produk (atau tekan F1-F12)
4. Tap produk → langsung masuk cart dengan animasi
5. Tambah modifier/notes jika perlu
6. Apply diskon jika ada promo
7. Pilih metode bayar (bisa multiple)
8. Hitung kembalian otomatis
9. Print/email/WA struk
10. Order masuk ke KDS otomatis
11. Tampil statistik penjualan real-time

---

## PESAN UNTUK GEMINI PRO

"Tolong buatkan kode lengkap yang siap di-copy paste ke project saya. Saya butuh kode yang berfungsi penuh (fully functional), bukan hanya contoh. Prioritaskan keamanan, performa, dan user experience profesional level internasional. Gunakan best practices Next.js 16 App Router, TypeScript, dan Tailwind CSS v4."

---

**Terima kasih!** 🙏
