# WebGIS Fasilitas Kampus Bumi Siliwangi UPI

Situs statis berbasis Leaflet 1.9.4 dan Leaflet.markercluster 1.5.3. Data saat ini:
77 titik gedung/fasilitas, 46 poligon parkir mobil, dan 3 poligon parkir motor.
Tidak memerlukan bundler, backend, atau npm untuk menjalankan situs.

## Menjalankan

Windows: dobel-klik `start-server.bat`. Server membuka peta di localhost; biarkan
jendelanya tetap terbuka. Alternatif: `python -m http.server 8000` dari root proyek.
Buka `/index.html` atau `/map.html` melalui HTTP, bukan `file://`.

Preview tanpa membuka browser otomatis:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 -PreferredPort 8000 -NoBrowser
```

Leaflet, markercluster, Font Awesome, dan font masih menggunakan CDN. Koneksi
internet diperlukan untuk dependensi dan basemap; pesan error tersedia jika CDN gagal.

## Struktur dan tanggung jawab

- `index.html`, `assets/js/landing.js`, `assets/css/landing.css`: beranda dan menu mobile.
- `map.html`, `assets/js/bootstrap.js`: struktur halaman, penanganan kegagalan startup.
- `assets/js/map/main.js`: inisialisasi paralel dan penghubung event UI.
- `mapCore.js`, `config.js`: instance Leaflet, bounds, renderer SVG, cluster dan basemap.
- `geojson.js`: validasi WGS84, normalisasi properti, fetch dengan timeout.
- `buildingsData.js`: pemuatan atomik dan indeks gedung/marker, retry tanpa duplikasi.
- `categories.js`, `markerVisibility.js`: taksonomi ikon, cache kelompok dan visibilitas batch.
- `parking.js`: dua layer GeoJSON berdasarkan jenis; satu path SVG per poligon,
  pola arsir, popup lazy, status gagal per jenis dan retry parsial.
- `sidebar.js`, `layout.js`, `buildingDetail.js`, `search.js`: render panel, layout responsif,
  detail dan pencarian dengan keyboard. Teks data tidak dijadikan kode onclick.
- `state.js`, `uiEvents.js`, `utils.js`: state, event refresh UI dan helper umum.
- `legend.js`, `geolocation.js`, `mapControls.js`: legenda, GPS, kontrol tampilan.
- `photos.js`, `images/optimized/`: manifest foto WebP untuk runtime. Foto asli tetap di `images/`.
- `data/`: GeoJSON runtime; `tiles/upi/{z}/{x}/{y}.png`: tile XYZ kampus.
- `tests/`: pengujian data/aset dan harness browser; tidak dimuat halaman produksi.
- `scripts/optimize-images.py`: tool opsional pengelola foto (Python + Pillow).
- `docs/AUDIT.md`: temuan, perbaikan, hasil verifikasi dan keterbatasan data.

Seluruh jalur runtime relatif terhadap halaman situs sehingga tetap bekerja ketika
GitHub Pages memakai subdirektori `/project-webgis-upi-main/`.

## Memperbarui data

GeoJSON menggunakan WGS84 `[longitude, latitude]`. Gedung harus berupa Point;
parkir Polygon atau MultiPolygon dengan ring tertutup. Fitur individual yang tidak
valid dilewati dengan pesan console; koleksi kosong/tidak valid menampilkan error.
Jangan mengubah koordinat ke sistem proyeksi QGIS tanpa mengekspornya kembali ke WGS84.

Properti gedung: `name`, `category`, `description`, `image`, `hours`, `floors`, `phone`,
`facilities` (array string), `LinkWeb` atau `linkWeb` (HTTP/HTTPS). Properti lama
`Nama`, `Kategori`, `Deskripsi`, `Gambar` masih diterima. Nama gedung pada dataset
saat ini unik dan digunakan untuk pencarian serta deep link `?building=...`.

Tambahkan foto asli di `images/`, lalu jalankan `python scripts/optimize-images.py`
untuk memperbarui WebP dan manifest. Ini opsional; foto baru yang belum ada dalam
manifest tetap dimuat melalui jalur aslinya. Foto yang hilang menampilkan inisial.
File sumber QGIS disimpan lokal dalam `data-source/` yang diabaikan Git.

## Verifikasi

Node.js 20+ hanya diperlukan untuk pengujian, tanpa instalasi package:

```bash
npm test
```

Untuk menguji integrasi Leaflet asli, jalankan server lalu buka:

- `/tests/browser.html`: alur normal.
- `/tests/browser.html?parking-failure=1`: kegagalan awal data motor, lalu retry.

Harness menampilkan PASS/FAIL dan hanya memodifikasi state halaman pengujian.
Untuk pengujian layout, buka peta pada lebar desktop dan mobile, cari gedung,
ubah filter/layer, buka detail, dan tutup/buka panel. GPS nyata tetap bergantung
izin dan perangkat pengguna; pengujian otomatis mensimulasikan GPS di luar kampus.

## GitHub Pages

Publikasikan root repository dari branch yang dipilih di Settings → Pages.
Tidak ada langkah build npm. Unggah `images/optimized/`, kedua WebP beranda, dan
seluruh modul baru bersama HTML/CSS yang diperbarui. Jangan mengunggah hanya satu
file JavaScript karena modul saling mengimpor. Data dan tile yang ada tetap dipakai.

Versi uji SUS `2026.10.19.1` mencakup refactoring data/layer, UI responsif,
perbaikan GPS, hapus pencarian, pemusatan tampilan awal kampus, serta menu
kategori gedung/parkiran yang tertutup secara default.
Lihat `docs/RELEASE-2026-10-19.md` dan `docs/RELEASE-2026-10-18.md` untuk
cakupan, hasil pengujian, serta keterbatasannya.
