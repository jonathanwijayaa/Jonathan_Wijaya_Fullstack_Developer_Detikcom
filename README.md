# DetikHadir - Sistem Absensi Peserta Magang Detikcom

Aplikasi berbasis web untuk manajemen kehadiran peserta magang di Detikcom. Mengakomodasi dua role pengguna (**Admin** dan **Intern**) dengan hak akses, operasional harian, rekapitulasi data kehadiran, dan pelaporan komprehensif.

---

## 1. Link Aplikasi & Demo

| Komponen | URL Deployment |
| :--- | :--- |
| **Aplikasi Frontend** | https://jonathan-wijaya-fullstack-developer.vercel.app |
| **Backend API** | https://jonathan-wijaya-backend-detikcom.vercel.app |

### Akun Demo untuk Pengujian

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | admin@dummy.com | admin123 |
| Intern | intern@dummy.com | intern |

*Catatan: Akun Intern dengan password default `intern` akan otomatis memicu dialog wajib ganti password pada login pertama.*

---

## 2. Fitur Utama

### A. Intern Portal
1. **Autentikasi & Proteksi Sesi**: Login berbasis JWT Supabase Auth dengan role verification dari database.
2. **Paksa Ganti Password**: Deteksi password default `intern` pada login pertama untuk memandu peserta memperbarui kredensial.
3. **Pencatatan Kehadiran Harian**:
   - Check-in 1 kali sehari dengan penentuan status otomatis (*Present* atau *Late*).
   - Check-out 1 kali sehari yang memvalidasi bahwa check-in telah dilakukan sebelumnya.
4. **Riwayat Kehadiran Mandiri**:
   - Menampilkan tanggal, jam check-in, jam check-out, durasi kerja harian (`HH:mm`), dan status kehadiran.
   - Paginasi server-side dan filter berdasarkan bulan.

### B. Admin Panel
1. **Operational Dashboard (Harian)**:
   - Kartu ringkasan kondisi hari ini: *Total Interns*, *Present Today*, *Late Today*, dan *Not Checked In*.
   - Tabel *Recent Attendance* dari seluruh intern.
   - **Pemantauan Operasional Harian**: Daftar nama intern aktif yang **Belum Check-in Hari Ini** dan daftar intern yang **Sudah Check-in tapi Belum Check-out**.
2. **Manajemen Peserta Magang**:
   - Pencarian, filter departemen, filter status (*Active*, *Upcoming*, *Completed*).
   - Tambah intern baru (otomatis membuat akun Supabase Auth dan profil DB dengan password default `intern`).
   - Edit data intern dan hapus akun beserta riwayat absensinya (dengan konfirmasi dialog).
3. **Attendance Report & Rekapitulasi**:
   - Kartu metrik: *Total Intern*, *Present*, *Late*, *Absent*, dan *Attendance Rate (%)*.
   - Filter rentang tanggal, pencarian nama/kode, departemen, dan status.
   - **Visualisasi Data (Recharts)**: Grafik batang tren kehadiran harian dan diagram donat distribusi status kehadiran.
   - Tabel catatan kehadiran lengkap dengan kolom **Durasi Kerja** (`HH:mm`).
   - **Koreksi Absensi**: Admin dapat mengoreksi jam masuk/pulang peserta (misal saat lupa check-out).
   - **Export Laporan**: Ekspor ke format **PDF** dan **CSV** yang memuat seluruh halaman data terfilter.

---

## 3. Aturan Bisnis (Business Rules)

1. **Zona Waktu**: Seluruh perhitungan tanggal, jam check-in, dan batas waktu absensi menggunakan zona waktu Indonesia Barat (**Asia/Jakarta / WIB**).
2. **Jam Kerja & Batas Keterlambatan (Late)**:
   - Jam masuk standar: **09:00:00 WIB**.
   - Check-in pada atau sebelum `09:00:00 WIB` dicatat sebagai **PRESENT** (Hadir tepat waktu).
   - Check-in setelah `09:00:00 WIB` otomatis dicatat sebagai **LATE** (Terlambat).
3. **Aturan Check-In & Check-Out**:
   - Check-in hanya dapat dilakukan maksimal 1 kali per hari.
   - Check-out hanya dapat dilakukan maksimal 1 kali per hari dan wajib dilakukan setelah check-in pada hari yang sama.
4. **Hari Kerja & Hari Libur**:
   - Hari kerja resmi adalah **Senin sampai Jumat**.
   - Hari Sabtu, Minggu, dan Hari Libur Nasional Indonesia dikecualikan dari hari kerja aktif.
5. **Status Hari Berjalan (Not Checked In vs Absent)**:
   - Pada hari kerja yang sedang berjalan (*today*), peserta yang belum melakukan check-in dilabeli sebagai **Not Checked In**, bukan Absent.
   - Status **ABSENT** hanya dihitung untuk hari kerja yang sudah lewat (*past working days*).
6. **Formula Attendance Rate**:
   $$\text{Attendance Rate} = \frac{\text{Present} + \text{Late}}{\text{Total Expected Working Days}} \times 100\%$$
   - Total expected working days dihitung per peserta berdasarkan irisan rentang tanggal aktif magang peserta (`start_date` sampai `min(end_date, today)`). Hari di masa depan tidak diperhitungkan.

---

---

## 8. Keputusan Teknis & Trade-offs

1. **Pemisahan Operasional Harian vs Tren Analitik**:
   - *Keputusan*: Admin Dashboard difokuskan murni untuk operasional harian (*kondisi hari ini*: siapa yang hadir, siapa yang terlambat, siapa yang belum check-in, dan siapa yang belum check-out).
   - *Trade-off*: Grafik tren historis dan diagram distribusi dipusatkan di halaman *Attendance Report*, menjaga Admin Dashboard tetap ringan dan fokus sebagai alat kontrol harian.
2. **Server-side Computation untuk Absent & Rate**:
   - *Keputusan*: Status Absent tidak disimpan secara statis setiap malam di database, melainkan dikomputasi secara dinamis berdasarkan irisan hari kerja aktif (*working days*) vs data absensi aktual.
   - *Keuntungan*: Tidak membutuhkan cron job scheduler database yang rentan gagal jika server mati. Data laporan selalu mutakhir saat filter tanggal diubah.
3. **Rollback Multi-step pada Pembuatan Intern**:
   - *Keputusan*: Operasi `createIntern` mencakup pembuatan akun Supabase Auth, baris `public.users`, dan baris `public.interns`. Jika salah satu tahapan gagal, sistem otomatis melakukan kompensasi penghapusan (*rollback*) akun auth yang sudah terlanjur dibuat agar tidak terjadi akun yatim (*orphaned users*).
4. **Rate Limiting pada Endpoint Login**:
   - *Keputusan*: Menggunakan `express-rate-limit` (15 request per 15 menit per IP) untuk mencegah percobaan serangan *brute force* pada kredensial pengguna.
5. **Format Waktu Terpusat**:
   - *Keputusan*: Satu set helper fungsi terpusat (`formatTime`, `formatDate`, `formatDuration`) dipakai di seluruh halaman untuk menjamin konsistensi format `HH:mm` dan timezone `Asia/Jakarta`.

## 10. Tampilan Antarmuka

### Login
![Halaman Login](login.png)

### Admin Dashboard (Operasional Harian)
![Halaman Admin Dashboard](dashboardAdmin.png)
![Halaman Admin Dashboard](dashboardAdmin1.png)

### Admin Intern Management
![Halaman Admin Intern Management](adminInternManagement.png)
![Halaman Admin Intern Management](adminInternManagement1.png)

### Admin Attendance Report (Grafik & Rekap)
![Halaman Admin Attendance Report](adminReport.png)
![Halaman Admin Attendance Report](adminReport1.png)

### Intern Dashboard (Absensi & Riwayat)
![Halaman Intern Dashboard](internDashboard.png)

---

**Dikembangkan oleh:** Jonathan Wijaya  
**Assignment:** Fullstack Developer Internship — Detikcom
