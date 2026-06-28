# SEAPEDIA - Backend Service (Express.js & Prisma)

Ini adalah layanan backend API-based untuk platform e-commerce multi-role SEAPEDIA. Seluruh aturan bisnis, validasi, otorisasi, dan state machine transaksi berjalan terpusat di layanan ini menggunakan Express.js, Prisma ORM, dan PostgreSQL.

---

## 📋 Daftar Isi
1. [Fitur Utama & Konsep Multi-Role](#-fitur-utama--konsep-multi-role)
2. [Aturan Bisnis & Rumus Perhitungan](#-aturan-bisnis--rumus-perhitungan)
3. [Alur Status Pesanan & Durasi SLA Overdue](#-alur-status-pesanan--durasi-sla-overdue)
4. [Dokumentasi API Kontrak (Swagger UI)](#-dokumentasi-api-kontrak-swagger-ui)
5. [Akun Demo Bawaan (Seed Data)](#-akun-demo-bawaan-seed-data)
6. [Catatan Pengerasan Keamanan (Security Hardening)](#-catatan-pengerasan-keamanan-security-hardening)
7. [Panduan Instalasi & Pengaturan Lingkungan](#-panduan-instalasi--pengaturan-lingkungan)
8. [Panduan Pembuatan Akun Admin Pertama Kali](#-panduan-pembuatan-akun-admin-pertama-kali)

---

## 👥 Fitur Utama & Konsep Multi-Role

Backend SEAPEDIA membagi hak akses ke resource database berdasarkan **Active Role** sesi saat ini, bukan sekadar daftar peran yang dimiliki oleh pengguna.

### Alur Kerja Peran Aktif (*Active Role*):
1. Pengguna non-admin diperbolehkan memiliki lebih dari satu peran (contoh: *Buyer* dan *Seller*).
2. Otorisasi API di backend strictly ditegakkan berbasis peran aktif tersebut melalui middleware `requireActiveRole(...roles)` yang membaca dari cookies session.
3. Middleware ini akan menolak request jika peran aktif pengguna tidak sesuai dengan hak akses endpoint (meskipun pengguna tersebut secara keseluruhan memiliki peran tersebut di database).

---

## ⚙️ Aturan Bisnis & Rumus Perhitungan

### 1. Batasan Pembelian Satu Toko (*Single-Store Checkout*)
Toko tunggal dipaksakan di backend. Saat item ditambahkan ke keranjang belanja, backend memvalidasi apakah produk tersebut berasal dari toko yang sama dengan item yang sudah ada di keranjang. Jika tidak, request akan direject dengan status 409 (Conflict).

### 2. Aturan Perhitungan Checkout & PPN 12%
Rumus perhitungan total biaya belanjaan dihitung secara konsisten di backend dengan urutan sebagai berikut:

$$\text{Subtotal} = \sum (\text{Harga Barang} \times \text{Kuantitas})$$

$$\text{Diskon} = \text{Subtotal} \times \text{Diskon \%} \quad (\text{atau } \text{Potongan Tetap Nominal})$$

$$\text{Nilai Kena Pajak (NKP)} = \max(0, \text{Subtotal} - \text{Diskon})$$

$$\text{PPN (12\%)} = \text{NKP} \times 0.12$$

$$\text{Total Akhir} = \text{NKP} + \text{Ongkos Kirim} + \text{PPN (12\%)}$$

*   **Voucher**: Memotong harga dengan limit penggunaan (*usage quota*) serta waktu kedaluwarsa.
*   **Promo**: Diskon otomatis global tanpa batas kuota penggunaan personal namun terikat waktu kedaluwarsa.
*   **Penghasilan Driver**: Driver berhak mendapatkan komisi sebesar **80%** dari total ongkos kirim saat status pesanan selesai dikonfirmasi (`COMPLETED`), sedangkan **20%** masuk sebagai pendapatan platform.

---

## 🚚 Alur Status Pesanan & Durasi SLA Overdue

Status pesanan berjalan mengikuti diagram state machine berikut:

```
[PACKAGING] ➔ [WAITING_FOR_DRIVER] ➔ [IN_DELIVERY] ➔ [COMPLETED] (Via Driver / Buyer)
                                                   ➔ [RETURNED] (Jika Overdue SLA atau Retur Manual)
```

### Konfirmasi Penyelesaian & Payout Langsung:
Ketika Kurir (*Driver*) menyelesaikan tugas pengiriman (`completeJob`), status pesanan langsung berubah menjadi `COMPLETED` dan saldo pendapatan otomatis dirilis ke dompet Kurir (80% ongkir) dan Penjual (100% harga barang setelah diskon). Pilihan verifikasi penerimaan oleh Pembeli juga tersedia untuk merilis dana jika kurir belum memperbarui tugasnya.

### Pengembalian Barang (Retur Manual):
Pembeli dapat mengajukan retur secara manual pada pesanan yang sudah berstatus selesai (`COMPLETED`). Tindakan ini akan secara otomatis mendebit saldo Penjual, melakukan pengembalian dana (*refund*) senilai total produk + PPN ke dompet Pembeli, dan mengembalikan stok barang ke inventaris toko Penjual. Status pesanan kemudian diperbarui menjadi `RETURNED`.

### Batas Waktu SLA Overdue per Metode Pengiriman:
*   **INSTANT**: Batas waktu pengemasan hingga pengiriman selesai adalah **3 Jam**.
*   **NEXT_DAY**: Batas waktu pengemasan hingga pengiriman selesai adalah **24 Jam** (1 Hari).
*   **REGULAR**: Batas waktu pengemasan hingga pengiriman selesai adalah **72 Jam** (3 Hari).

### Simulasi Waktu:
Melalui dasbor admin, administrator dapat mempercepat waktu sistem dan memicu audit otomatis keterlambatan:
1.  **Percepat Waktu**: Mengirim request `POST /api/admin/system/advance-time` dengan body `{ "days": X, "hours": Y }`.
2.  **Jalankan Cek Keterlambatan**: Mengirim request `POST /api/admin/system/run-overdue-check`. Pesanan yang melewati batas SLA otomatis diubah statusnya menjadi `RETURNED` dan dana dikembalikan 100% (*auto-refund*) ke saldo dompet pembeli, serta stok barang dikembalikan otomatis ke penjual.

---

## 📖 Dokumentasi API Kontrak (Swagger UI)

Kontrak API didokumentasikan sepenuhnya menggunakan spesifikasi **OpenAPI 3.0.0**. 

Saat server berjalan, akses dokumentasi interaktif melalui:
*   **Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
*   **Spesifikasi OpenAPI Mentah (YAML)**: [http://localhost:5000/openapi.yaml](http://localhost:5000/openapi.yaml)

---

## 👥 Akun Demo Bawaan (Seed Data)

Gunakan akun-akun demo bawaan berikut untuk proses pengujian:

| Peran Utama | Alamat Email | Kata Sandi | Saldo Awal (Seapay) | Catatan |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `Password123` | Rp 1.000.000 | Akses dasbor pemantau & sistem waktu |
| **BUYER 1** | `buyer1@example.com` | `Password123` | Rp 1.000.000 | Alamat: Jl. Mawar No. 10 |
| **BUYER 2** | `buyer2@example.com` | `Password123` | Rp 1.000.000 | Alamat: Jl. Melati No. 20 |
| **SELLER 1** | `seller1@example.com` | `Password123` | Rp 1.000.000 | Nama Toko: `Toko Enak` |
| **SELLER 2** | `seller2@example.com` | `Password123` | Rp 1.000.000 | Nama Toko: `Bob Bakery` |
| **DRIVER 1** | `driver1@example.com` | `Password123` | Rp 1.000.000 | Driver Terverifikasi |
| **DRIVER 2** | `driver2@example.com` | `Password123` | Rp 1.000.000 | Driver Terverifikasi |
| **MULTI-ROLE** | `multi@example.com` | `Password123` | Rp 1.000.000 | Memiliki Peran Pembeli & Penjual |

---

## 🛡️ Catatan Pengerasan Keamanan (Security Hardening)

1.  **Proteksi SQL Injection**: Seluruh query database ke PostgreSQL menggunakan **Prisma ORM** yang secara otomatis mengonversi kueri ke bentuk *parameterized queries* (pre-compiled).
2.  **Pencegahan XSS (Cross-Site Scripting)**: Input teks (seperti Ulasan Publik dan Alamat) divalidasi dan disanitasi di sisi backend sebelum disimpan ke database.
3.  **Pengamanan Cookie Sesi**: Cookie `connect.sid` menggunakan opsi `httpOnly: true`, `secure: true` pada mode produksi, dan `sameSite: 'lax'`.
4.  **Pembatasan Laju Request (Rate Limiter)**: Endpoint otentikasi (`/api/auth/login`) dilindungi dengan limit maksimal 5 kali percobaan per menit untuk mencegah *brute-force attacks*.
5.  **Batasan Otorisasi Berbasis Peran (RBAC)**: Middleware memvalidasi secara ketat peran aktif user pada setiap request sensitif (`requireActiveRole`).
6.  **Indeks Database**: Telah dioptimalkan di `schema.prisma` dengan menambahkan indeks pada `buyer_id` (tabel Address & Order), `cart_id` & `product_id` (tabel CartItem), status & `expired_at` (tabel Order), serta `order_id` & `product_id` (tabel OrderItem).

---

## ⚙️ Panduan Instalasi & Pengaturan Lingkungan

### Prasyarat
*   Node.js versi 18 ke atas
*   PostgreSQL Database (Default Supabase telah terkonfigurasi)

### Langkah-langkah Pengaturan

#### 1. Instalasi Dependensi
```bash
npm install
```

#### 2. Pengaturan Variabel Lingkungan (.env)
Konfigurasi file `.env` di dalam folder root backend:
```env
PORT=5000
NODE_ENV=development

# URL Koneksi PostgreSQL
DATABASE_URL="postgresql://username:password@host:port/database?pgbouncer=true"
DIRECT_URL="postgresql://username:password@host:port/database"

# Secret untuk enkripsi session
SESS_SECRET="tulis_random_string_panjang_di_sini"

# CORS Allowed Origins
ALLOWED_ORIGINS="http://localhost:5173"

# Kunci API Supabase untuk upload gambar produk
SUPABASE_URL="https://your_project_id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

#### 3. Sinkronisasi Database dan Seed Data
Jalankan migrasi Prisma untuk menyelaraskan struktur database, menambahkan indeks, dan memasukkan data bawaan (seed):
```bash
# Sinkronkan skema prisma ke Supabase database
npx prisma db push

# Isi data seed bawaan (demo accounts)
npx prisma db seed
```

#### 4. Menjalankan Aplikasi
```bash
npm run dev
```
Aplikasi backend akan berjalan di [http://localhost:5000](http://localhost:5000).

---

## 🔑 Panduan Pembuatan Akun Admin Pertama Kali

Jika ingin membuat akun admin tambahan di luar data seed bawaan:
1. Daftarkan akun baru secara normal melalui antarmuka registrasi web.
2. Buka SQL Editor di DBMS Anda (seperti pgAdmin, DBeaver, atau Supabase SQL Editor) dan jalankan perintah berikut:
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   VALUES (
     (SELECT id FROM users WHERE email = 'email_anda@example.com'),
     (SELECT id FROM roles WHERE name = 'ADMIN')
   );
   ```
3. Pengguna tersebut sekarang dapat masuk ke web dan beralih ke peran **ADMIN** untuk mengakses fitur-fitur pemantauan dan simulasi waktu.
