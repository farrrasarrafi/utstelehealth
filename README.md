# Self-Assessment Pra-Konsultasi — Telehealth UNIMUS

Aplikasi frontend pasien (Web & Android APK) untuk Tugas UTS Mata Kuliah Telehealth, terhubung ke REST API `https://telehealth.informatikaunimus.site/api` (Versi 2.0).

> **Penting:** Hasil self-assessment bukan diagnosis. Laporan ditinjau oleh tenaga kesehatan.

## Fitur Utama

1. **Identitas Mahasiswa & Konfigurasi Token** (`src/components/SettingsView.jsx`)
   - Input NIM, Nama Lengkap, dan Kelas yang disertakan pada setiap pembuatan self-assessment dan pemfilteran data (`?nim=`).
   - Penyimpanan token Bearer pasien di `.env` (lokal) atau `localStorage` tanpa menyertakan token rahasia di repository publik.
2. **Beranda & Pemantauan Bukti Fitur UTS** (`src/components/DashboardView.jsx`)
   - Profil pasien aktif dan statistik laporan (`GET /api/me?nim=`).
   - Daftar formulir (`GET /api/forms`): `FRM-KELUHAN` (Wajib) dan `FRM-GAD7` (Bonus Skor 0–21).
   - Detektor otomatis 10 bukti fitur UTS (`GET /api/uts/{nim}`).
3. **Pengisian Bertahap & Pertanyaan Bercabang** (`src/components/AssessmentWizardView.jsx`)
   - Halaman petunjuk pengisian dan persetujuan (`POST /api/assessments`).
   - Evaluasi kondisi `show_if` (`equals`, `in`, `includes`, `filled`, `any`, `all`) pada bagian maupun pertanyaan.
   - Penanganan opsi eksklusif (`exclusive: true` pada `multi_choice`), pemisahan tampilan data `subjektif` dan `pengukuran`, serta pemisahan tegas antara jawaban `"Tidak"` dan `"Belum diisi"` (`null`).
   - Penyimpanan draf per bagian (`PATCH /api/assessments/{id}`).
   - Pemeriksaan pra-kirim (`POST /api/forms/{id}/validate`) dan pengiriman final (`POST /api/assessments/{id}/submit`).
4. **Riwayat Self-Assessment** (`src/components/HistoryView.jsx`)
   - Filter berdasarkan status pengiriman, status peninjauan, jenis formulir, dan kata kunci (`GET /api/assessments?nim=`).
   - Lanjutkan draf atau hapus draf (`DELETE /api/assessments/{id}`).
5. **Hasil Assessment & Perbandingan Skor GAD-7** (`src/components/ResultView.jsx`)
   - Ringkasan jawaban, kelengkapan, skor & kategori GAD-7, serta perbandingan perubahan skor terhadap pengisian sebelumnya (`GET /api/assessments/{id}/hasil`).
6. **Pelacakan Status, Klarifikasi, & Tindak Lanjut** (`src/components/StatusTrackingView.jsx`)
   - Status pengiriman dan status peninjauan ditampilkan terpisah beserta timeline (`GET /api/assessments/{id}/status`).
   - Form balasan klarifikasi petugas (`POST /api/assessments/{id}/clarifications/{cid}/reply`).
   - Kartu arahan tindak lanjut dan jadwal konsultasi.

## Cara Menjalankan (Web)

1. Salin `.env.example` menjadi `.env` lalu isi token pasien dari dosen:
   ```bash
   cp .env.example .env
   ```
2. Pasang dependensi dan jalankan server pengembangan:
   ```bash
   npm install
   npm run dev
   ```

## Cara Membangun APK Android (Capacitor)

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```
File APK hasil kompilasi tersedia di `android/app/build/outputs/apk/debug/app-debug.apk`.
