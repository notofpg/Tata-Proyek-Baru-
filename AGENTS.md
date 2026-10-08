# Tata App - Core Directives

## 1. Identitas Aplikasi & Prinsip Utama
Tata adalah aplikasi produktivitas yang secara ketat berpegang teguh pada tiga prinsip utama:
- **Offline First**: Aplikasi berjalan sepenuhnya secara lokal di perangkat.
- **Privacy First**: Privasi pengguna adalah hal yang mutlak dan tidak bisa diganggu gugat.
- **User Owns Their Data**: Pengguna memiliki kendali penuh atas data mereka sendiri.

Semua data pengguna (Notes, Tasks, Calendar, Finance, Mood, Backup, dll.) **wajib disimpan secara lokal di perangkat pengguna** (misalnya via LocalStorage, IndexedDB, atau SQLite lokal). 
DILARANG KERAS membuat server database backend cloud untuk menyimpan data pribadi pengguna.

## 2. Batasan dan Aturan Ketat untuk Tata AI
Tata AI hanyalah fitur asisten tambahan (opsional) dan **bukan** pusat dari aplikasi. Semua fitur utama Tata harus selalu dapat diakses dan berfungsi sempurna tanpa koneksi internet atau tanpa menggunakan AI.

**AI TIDAK BOLEH memiliki akses langsung ke:**
- Database lokal pengguna
- Semua Notes
- Semua Tasks
- Semua Finance
- Calendar
- Backup
- Penyimpanan perangkat

**Cara Kerja AI (Wajib Dipatuhi):**
1. AI **TIDAK BOLEH** membaca data pengguna secara otomatis dalam kondisi apa pun.
2. AI **HANYA BOLEH** memproses dan menerima data yang dikirimkan secara eksplisit oleh aplikasi (sebagai teks prompt) *setelah* pengguna menekan tombol dan memberikan izin (consent) secara sadar.
3. AI **TIDAK PERNAH** dan tidak akan pernah mengambil data sendiri. Data selalu disuntikkan oleh klien (browser) ke dalam permintaan, bukan diambil oleh agen AI.
4. Jangan pernah menyarankan solusi arsitektur atau kode yang mengorbankan privasi ini hanya demi menambahkan fitur baru. Semua pemrosesan data AI harus di-desain secara "stateless".
