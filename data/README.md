# Tata Private Promo Codes Storage

File `promo_codes.json` di folder ini bersifat **100% rahasia di sisi server (backend-only)** dan tidak akan pernah terkirim ke browser/klien publik.

## Cara Kerja & Mekanisme Keamanan:
1. **Tidak Ada Kode di Frontend:** Frontend (klien) hanya mengirim teks kode yang dimasukkan pengguna ke `/api/account/redeem-promo`. Tidak ada daftar kode yang tersimpan di kode aplikasi browser.
2. **Anti Brute-Force (Tebak Kode Otomatis):** Jika ada orang/bot yang mencoba menebak kode salah sebanyak 5 kali berturut-turut, sistem otomatis mengunci (lockout) IP tersebut selama 5 menit.
3. **Pencegahan Klaim Ganda (`usedBy`):** Jika akun pengguna sudah mengklaim kode tersebut, pengguna tidak dapat mengklaim ulang kode yang sama untuk menguras kuota.
4. **Batas Kuota (`maxUses`):** Kode langsung otomatis nonaktif saat kuota terpenuhi.
5. **Batas Waktu (`expiresAt`):** Kode langsung otomatis kedaluwarsa setelah tanggal yang ditentukan.

## Format Menambahkan Kode Promo Baru

Anda dapat menambahkan kode promo langsung ke `data/promo_codes.json` dengan format JSON:

```json
{
  "CONTOHKODEPROMAX": {
    "tier": "pro_max",
    "planName": "Tata Pro Max Seumur Hidup",
    "durationDays": null,
    "maxUses": 100,
    "usedCount": 0,
    "expiresAt": "2026-12-31T23:59:59Z",
    "usedBy": []
  },
  "CONTOHKODEPRO1TAHUN": {
    "tier": "pro",
    "planName": "Tata Pro 1 Tahun",
    "durationDays": 365,
    "maxUses": 50,
    "usedCount": 0,
    "expiresAt": null,
    "usedBy": []
  }
}
```

### Keterangan Field:
- `tier`: `"pro"` atau `"pro_max"`
- `planName`: Nama paket yang muncul di riwayat transaksi pengguna (bebas disesuaikan)
- `durationDays`: Jumlah hari aktif lisensi (misal `30` untuk 1 bulan, `365` untuk 1 tahun, atau `null` untuk Seumur Hidup / Lifetime)
- `maxUses`: Batas maksimal berapa kali kode ini boleh diklaim (misal `100`, atau `null` jika tanpa batas kuota)
- `usedCount`: Hitungan otomatis berapa kali kode sudah diklaim (mulai dari `0`)
- `expiresAt`: Batas tanggal kedaluwarsa format ISO (misal `"2026-12-31T23:59:59Z"`, atau `null` jika tidak ada batas tanggal)
- `usedBy`: Array email akun yang sudah mengklaim kode ini (mulai dari `[]`, otomatis terisi)

