// A classic script can explain file:// and CDN failures before modules start.
(async () => {
  try {
    if (location.protocol === "file:") throw new Error("Jalankan start-server.bat lalu buka peta melalui localhost, bukan file://.");
    if (!window.L || !L.markerClusterGroup) throw new Error("Leaflet gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.");
    await import("./map/main.js?v=2026.10.19.3");
  } catch (error) {
    console.error("Inisialisasi WebGIS gagal:", error);
    document.getElementById("mapLoadingOverlay").style.display = "none";
    document.getElementById("mapErrorOverlay").style.display = "flex";
    document.querySelector(".map-error-title").textContent = "Peta belum dapat dibuka";
    document.getElementById("mapErrorText").textContent = error.message;
    document.querySelector(".map-error-retry").onclick = () => location.reload();
  }
})();
