# Audit dan refactoring WebGIS UPI

Tanggal: 15 Oktober 2026. Acuan repository: commit `97a2d40` pada `main`.
Cakupan: semua modul JavaScript, kedua halaman HTML, CSS, server preview Windows,
kontrak GeoJSON, referensi aset dan dokumentasi. Perubahan hanya dilakukan lokal.

## Temuan dan perbaikan

| Masalah / akar masalah | Perbaikan |
|---|---|
| Loader menambahkan marker/listener baru setiap pemuatan; retry bersamaan tidak dikunci | Satu promise pemuatan, penggantian dataset atomik, `clearLayers`, autocomplete diinisialisasi sekali |
| Retry mengosongkan peta sebelum data pengganti berhasil | Dataset terakhir dipertahankan saat fetch/validasi gagal |
| Gedung dan parkir dimuat berurutan | Tiga fetch dimulai paralel, dengan timeout dan penanganan kegagalan |
| 49 area parkir digambar sebagai base+hatch terpisah | 49 path SVG, dua GeoJSON group berdasarkan jenis, pola berisi warna dasar dan arsir |
| Toggle parkir memindai dan menambah/menghapus setiap poligon | Toggle cukup menambah/menghapus group jenis parkir |
| Toggle marker memanggil operasi cluster satu per satu; master mengulang sinkronisasi untuk setiap kategori | `addLayers`/`removeLayers` batch; master memperbarui state lalu sinkronisasi sekali |
| Kelompok gedung dan objek ikon dihitung berulang | Indeks nama, cache kelompok pada pergantian data, dan ikon bersama per kategori |
| Ikon dan kategori sidebar memakai aturan berbeda | Satu resolver kategori; ikon Labschool konsisten dengan kelompoknya |
| Pilihan pencarian bisa tersembunyi oleh filter kategori | Buka kategori hasil pencarian, sinkronkan marker dan tampilkan detail |
| Checkbox/opacity direset hardcoded saat tab dibuka ulang | Render dari state sebenarnya, sinkronkan perubahan kontrol Leaflet, master indeterminate |
| Penyelesaian fetch parkir menimpa detail gedung | Tab dan pilihan detail disimpan eksplisit dalam state |
| Nama/properti GeoJSON dimasukkan mentah dalam HTML/onclick | Escape teks/atribut, delegasi event berbasis dataset, validasi URL HTTP/HTTPS |
| GeoJSON tidak memvalidasi koleksi, koordinat atau tipe fasilitas | Validasi data terpisah dari DOM/Leaflet, normalisasi legacy dan properti opsional |
| Deep link didecode dua kali dan bergantung timeout tetap | Gunakan URLSearchParams sekali; fokus setelah data siap, highlight setelah event peta |
| Fokus lokasi dapat berada di belakang sidebar/bottom sheet | Padding fokus mengikuti area UI yang terbuka |
| GPS di luar kampus mencoba flyTo melewati maxBounds | Pesan di luar area, tetap di peta kampus, tombol dipulihkan |
| Kegagalan satu file parkir terlihat sebagai Memuat selamanya | Status error per jenis dan retry tanpa menggandakan layer berhasil |
| Foto lokasi asli berukuran beberapa MB | Derivatif WebP 1280px, manifest otomatis; foto asli tetap tersedia |
| Startup CDN/file:// gagal tanpa penjelasan | Bootstrap menampilkan pesan yang dapat ditindaklanjuti |
| Server preview menerima path tanpa pemeriksaan batas root | Kanonisasi path, blok traversal/.git/data-source, HEAD/405 dan penutupan response di finally |
| Kontrol mobile memakai elemen non-interaktif dan beberapa elemen saling menutupi | Tombol keyboard, label pencarian, viewport dinamis, inert panel tertutup, legenda di atas bottom sheet |
| Beranda/README menyebut layer yang tidak tersedia | Deskripsi disesuaikan dengan fitur dan data aktual |
| Modul UI/domain saling mengimpor secara melingkar | Layout dipisahkan; permintaan refresh melalui event; graph impor sekarang tanpa siklus |

Kode base/hatch lama, resolver kategori duplikat, import/global handler tak terpakai,
parameter share legacy dan listener Enter duplikat telah dibuang. Aset sumber dan
tile zoom tinggi tidak dihapus karena merupakan data pengguna yang masih dapat dipakai.

## Hasil terukur

- Gedung: 77 Point valid; tidak ada fitur yang dilewati dan seluruh nama unik.
- Parkir: 46 mobil + 3 motor, seluruh geometri valid; path SVG 98 → 49.
- Foto: 47 gambar asli yang direferensikan, total 300,39 MB → 5,56 MB WebP (sekitar 98,1% lebih kecil).
  Ini ukuran berkas derivatif, bukan hasil benchmark waktu render atau pengurangan total ukuran repository.
- Tidak ada dependensi runtime baru; Leaflet/markercluster tetap pada versi sebelumnya.
- Tidak ada siklus impor modul peta. Format koordinat dan berkas GeoJSON asli dipertahankan.

## Verifikasi

- 9/9 pengujian Node: koordinat, ring Polygon/MultiPolygon, normalisasi legacy,
  input HTML/URL berbahaya, seluruh dataset, timeout/HTTP, manifest WebP, graph impor.
- 15/15 skenario browser pada viewport mobile 390×844: kegagalan parkir parsial/retry,
  GPS luar kampus simulasi, jumlah marker/row/path, retry bersamaan, kegagalan refresh,
  pencarian dengan filter, checkbox/opacity, master marker, kontrol Leaflet, detail tetap
  terbuka, nama bertanda kutip, foto hilang, autocomplete.
- 13/13 skenario browser awal pada viewport desktop sebelum tambahan dua skenario
  GPS/foto hilang; hasil akhir desktop diverifikasi kembali pada harness lengkap.
- Pemeriksaan sintaks seluruh JS dan `git diff --check`.
- Server preview: GET map=200, HEAD GeoJSON=200, .git/data-source/traversal=403,
  tidak ditemukan=404, POST=405.
- Visual mobile: tidak ada horizontal overflow pada lebar 390px; pencarian membuka detail.

## Hal yang tetap memerlukan data atau verifikasi lapangan

- 30 referensi foto belum mempunyai berkas. Inisial muncul sebagai fallback; foto tidak direkayasa.
- Delapan titik baru memiliki category/deskripsi/jam/telepon kosong. Resolver dapat memilih
  kelompok tampilan dari nama, tetapi informasi operasional tetap perlu dilengkapi pemilik data.
- Kategori sanitasi dan fotokopi belum memiliki titik pada dataset saat ini. UI mendukung
  kategori tersebut; klaim bahwa titiknya sudah tersedia di roadmap lama telah dikoreksi.
- Jalur evakuasi, jalur aksesibilitas, CCTV, Wi-Fi dan under construction belum menjadi
  layer runtime. Tidak ditambahkan sebagai fitur baru dalam pekerjaan refactoring ini.
- Batas zoom aplikasi tetap 20. Tile 21–22 dipertahankan sebagai data sumber tersedia.
- Izin GPS dan akurasi perangkat nyata, hasil cetak fisik, serta browser selain mesin
  browser yang dipakai pengujian masih memerlukan verifikasi pengguna.
- Situs tetap membutuhkan CDN dan koneksi basemap; ini bukan implementasi offline.

## Foto belum tersedia

| Lokasi | Referensi foto |
|---|---|
| Balai Bahasa UPI | `images/balai-bahasa.jpg` |
| Gedung Fakultas Ilmu Pendidikan (FIP) A | `images/fip.jpg` |
| Gedung Fakultas Ilmu Pendidikan (FIP) B | `images/fip-b.jpg` |
| Gedung Fakultas Kedokteran (FK) UPI | `images/fk.jpg` |
| Gedung Fakultas Pendidikan Matematika dan IPA (FPMIPA) A | `images/fpmipa-a.jpg` |
| Gedung Fakultas Pendidikan Matematika dan IPA (FPMIPA) B | `images/fpmipa-b.jpg` |
| Gedung Fakultas Pendidikan Olahraga dan Kesehatan (FPOK) B | `images/fpok-b.jpg` |
| Gedung Lembaga Penelitian dan Pengabdian Masyarakat (LPPM) | `images/lppm.jpg` |
| Gedung Pendidikan Profesi Guru (PPG) | `images/ppg.jpg` |
| Isola Resort UPI | `images/isola-resort.jpg` |
| Lapang Basket UPI | `images/lap-basket.jpg` |
| Lapangan SMA Laboratorium School UPI | `images/lap-sma.jpg` |
| Lapang SMP Laboratorium School UPI | `images/lap-smp.jpg` |
| Perpustakaan UPI | `images/perpustakaan.jpg` |
| Pusat Kegiatan Mahasiswa (PKM) UPI | `images/pkm.jpg` |
| SD Laboratorium School UPI | `images/sd-labs.jpg` |
| SMP Laboratorium School UPI | `images/smp-labs.jpg` |
| Gedung Fakultas Pendidikan Matematika dan IPA (FPMIPA) C | `images/fpmipa-c.jpg` |
| Lapangan Tennis Indoor UPI | `images/tennis-indoor.jpg` |
| Lapangan SD Labschool UPI | `images/lapang-sd.jpg` |
| University Center (UC) UPI | `images/university-center.jpg` |
| Kantor Hukum UPI | `images/kantor-hukum.jpg` |
| Kantor Pengadaan Barang dan Jasa (KUKPBJ) | `images/kukpbj.jpg` |
| Rumah Jabatan Rektor UPI | `images/rumah-rektor.jpg` |
| Sekretariat IIK UPI | `images/sekre-iik.jpg` |
| Lapang Tennis Outdoor UPI | `images/tennis-outdoor.jpg` |
| Kantin FIP UPI | `images/kantin-fip.jpg` |
| Kantin FPIPS UPI | `images/kantin-fpips.jpg` |
| TK Laboratorium School UPI | `images/tk-labs.jpg` |
| Tomoro Coffee | `images/tomoro.jpg` |

## Cara memakai paket pembaruan

Ekstrak `webgis-refactor-update.zip` ke root salinan repository acuan `97a2d40`,
izinkan penggantian file dengan jalur yang sama, lalu jalankan `start-server.bat`.
Paket berisi hanya file yang diubah/ditambahkan; data, tile dan foto asli tetap memakai
file repository Anda. Paket ini bukan situs mandiri tanpa berkas repository lama.
Jangan menyalin arsip ZIP-nya sebagai satu file ke GitHub Pages; yang dipakai situs
adalah isi foldernya. Tidak ada file yang harus dihapus secara manual.

Setelah hasil lokal disetujui, seluruh perubahan bisa di-commit/push sekaligus.
Tidak ada push atau deployment dalam pekerjaan audit ini.

## Referensi teknis

- [Leaflet 1.9.4 API](https://leafletjs.com/reference.html): GeoJSON, SVG renderer, layer group, event peta.
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster): bulk addLayers/removeLayers dan zoomToShowLayer.
