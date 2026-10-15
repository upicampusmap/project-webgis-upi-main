// =====================================================
// geolocation.js — Deteksi posisi pengguna ("Posisi Saya")
// Tanggung jawab: mengambil lokasi GPS, menandai posisi + lingkaran
// akurasi di peta, dan memberi tahu bila di luar area kampus.
// =====================================================
import { map } from "./mapCore.js";
import { campusBounds } from "./config.js";
import { getMapPadding } from "./layout.js";
import { showToast } from "./utils.js";

let userLocationMarker = null;
let userAccuracyCircle = null;

export function locateMe() {
  if (!navigator.geolocation) {
    showToast("Browser tidak mendukung geolokasi.");
    return;
  }

  let btn = document.getElementById("locateMeBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      let lat = pos.coords.latitude;
      let lng = pos.coords.longitude;
      let accuracy = pos.coords.accuracy;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showToast("Koordinat lokasi tidak valid.");
        restoreLocationButton();
        return;
      }
      // The campus map has maxBounds: flying to a distant GPS point cannot work.
      if (!campusBounds.contains([lat, lng])) {
        showToast("Anda berada di luar area kampus UPI. Peta tetap di area kampus.");
        restoreLocationButton();
        return;
      }
      accuracy = Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : 0;

      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
        map.removeLayer(userAccuracyCircle);
      }

      let userIcon = L.divIcon({
        html: '<span class="user-location-dot"></span>',
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      userLocationMarker = L.marker([lat, lng], { icon: userIcon })
        .bindPopup("<b>Posisi Anda</b><br>Akurasi: ~" + Math.round(accuracy) + " meter", { autoPan: false })
        .addTo(map);

      userAccuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        weight: 2
      }).addTo(map);

      map.flyToBounds(L.latLngBounds([lat, lng], [lat, lng]), { ...getMapPadding(), maxZoom: 18, duration: 1.2 });
      userLocationMarker.openPopup();

      let removeBtn = document.getElementById("removeLocationBtn");
      if (removeBtn) removeBtn.style.display = "inline-flex";
      restoreLocationButton();
    },
    function(err) {
      console.warn("Geolokasi gagal:", err.message);
      showToast("Gagal mendapatkan lokasi. Pastikan izin lokasi diberikan.");
      restoreLocationButton();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

export function removeUserLocation() {
  if (userLocationMarker) { map.removeLayer(userLocationMarker); userLocationMarker = null; }
  if (userAccuracyCircle) { map.removeLayer(userAccuracyCircle); userAccuracyCircle = null; }
  let removeBtn = document.getElementById("removeLocationBtn");
  if (removeBtn) removeBtn.style.display = "none";
}

function restoreLocationButton() {
  const button = document.getElementById("locateMeBtn");
  if (button) {
    button.disabled = false;
    button.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
  }
}
