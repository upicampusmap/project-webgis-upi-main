// =====================================================
// mapControls.js — Kontrol tampilan peta
// Tanggung jawab: reset tampilan, cetak, toggle tile kampus,
// toggle semua marker gedung, dan transparansi overlay.
// =====================================================
import { map, upiCampusTile } from "./mapCore.js";
import { INITIAL_CENTER, INITIAL_ZOOM } from "./config.js";
import { getVisibleCategoryKeys } from "./categories.js";
import { syncCategoryLayerInputs } from "./markerVisibility.js";
import { categoryVisibility } from "./state.js";
import { syncMarkersToFilter } from "./markerVisibility.js";

export function resetMap() {
  map.setView(INITIAL_CENTER, INITIAL_ZOOM);
}

export function printMap() {
  window.print();
}

export function toggleCampusTile(checkbox) {
  if (checkbox.checked) {
    upiCampusTile.addTo(map);
  } else {
    map.removeLayer(upiCampusTile);
  }
}

export function toggleBuildingMarkers(checkbox) {
  getVisibleCategoryKeys().forEach(function(categoryKey) {
    categoryVisibility[categoryKey] = checkbox.checked;
  });

  syncMarkersToFilter();
  syncCategoryLayerInputs();
}

export function setCampusOpacity(value) {
  const opacity = Number(value);
  if (Number.isFinite(opacity)) upiCampusTile.setOpacity(Math.max(0, Math.min(1, opacity)));
}
