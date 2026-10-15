# Pembaruan antarmuka peta

Tanggal: 15 Oktober 2026. Perubahan lokal, belum dipublikasikan ke GitHub Pages.

## Perilaku baru

- Toolbar dan panel mengambang pada desktop; warna, jarak, tipografi, kartu dan tombol diseragamkan.
- Pada lebar maksimal 700 px, daftar menjadi panel bawah dengan tombol perkecil/buka. Detail menggunakan ruang lebih besar, foto dengan tinggi tetap, tombol kembali yang tetap terlihat, dan isi yang dapat digulir.
- Pencarian dan tab disembunyikan selama detail dibuka. Kembali ke daftar mengembalikan keduanya. Fokus keyboard diarahkan ke judul detail, dan isi panel tertutup memakai `inert`.
- Klik parkir menutup detail sebelumnya, memperkecil panel HP, menghentikan animasi peta, lalu menggeser peta sesuai ukuran popup sebenarnya dan ruang toolbar/panel.
- Popup lama tidak terlihat selama transisi menuju detail. Klik gedung berurutan membatalkan callback sorotan sebelumnya.
- Mendukung safe area, tinggi viewport dinamis, ukuran input 16 px pada HP, dan preferensi reduced motion.

## Akar masalah

Aturan CSS lama menumpuk banyak komponen dalam tinggi panel yang terbatas. Padding kamera tidak mengikuti ukuran toolbar/panel. Animasi dan callback sorotan dapat memulai pan berikutnya saat popup baru terbuka. Batas geser `maxBounds` juga membatalkan koreksi popup pada zoom rendah.

Pembatasan geser keras peta dihapus agar koreksi popup dapat bekerja; pengguna kini dapat menggeser ke sekitar kampus. Batas tile kampus, minimum zoom, pemeriksaan GPS di luar kampus, dan tombol kembali ke area kampus tetap tersedia.

## Verifikasi

- `npm test`: 9/9 lulus, termasuk integritas 77 titik dan 49 fitur parkir serta graph impor modul.
- `tests/browser.html?parking-failure=1`: 19/19 lulus pada viewport 320×568, 390×844, 844×390 dan 1280×720.
- Pemeriksaan meliputi posisi popup, overflow horizontal, scroll tombol detail, perpindahan cepat gedung, pencarian, filter/layer, fallback foto dan pemulihan kegagalan parkir.
- Pemeriksaan visual detail pada viewport HP dan desktop; `git diff --check` lulus.
- Pengujian menggunakan browser Chromium dengan ukuran viewport simulasi, belum perangkat fisik iOS/Android atau keyboard layar nyata.

Struktur tetap situs statis tanpa langkah build dan menggunakan path relatif agar sesuai GitHub Pages project site.
