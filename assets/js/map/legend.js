// =====================================================
// legend.js — Legenda kategori pada peta
// Tanggung jawab: merender & menampilkan/menyembunyikan panel legenda.
// =====================================================
import { categoryIconStyles, getVisibleCategoryKeys } from "./categories.js";
import { parkingTypeStyles } from "./parking.js";
import { parkingItems } from "./state.js";

// Render legenda kategori (dipanggil sekali saat init)
export function renderLegendItems() {
  let container = document.getElementById("mapLegendItems");
  if (!container) return;
  let html = "";
  getVisibleCategoryKeys().forEach(function(key) {
    let cfg = categoryIconStyles[key];
    if (!cfg) return;
    html += `
      <div class="map-legend-item">
        <span class="map-legend-dot" style="background:${cfg.color}">
          <i class="fa-solid ${cfg.icon}"></i>
        </span>
        <span class="map-legend-label">${cfg.label}</span>
      </div>`;
  });
  for (const config of Object.values(parkingTypeStyles)) {
    if (!parkingItems.some((item) => item.type === config.key)) continue;
    html += `<div class="map-legend-item"><span class="parking-swatch" style="--parking-fill:${config.fillColor};--parking-border:${config.borderColor};--parking-hatch:${config.hatchColor}"></span><span class="map-legend-label">${config.label}</span></div>`;
  }
  container.innerHTML = html;
}

export function toggleLegend() {
  let el = document.getElementById("mapLegend");
  if (el) {
    const expanded = el.classList.toggle("map-legend-expanded");
    el.querySelector(".map-legend-toggle").setAttribute("aria-expanded", String(expanded));
  }
}
