// =====================================================
// mapControls.js — Kontrol tampilan peta
// Tanggung jawab: reset tampilan, cetak, toggle tile kampus,
// toggle semua marker gedung, dan transparansi overlay.
// =====================================================
import { map, upiCampusTile } from "./mapCore.js?v=2026.10.19.4";
import { campusBounds, INITIAL_ZOOM } from "./config.js?v=2026.10.19.4";
import { getMapPadding } from "./layout.js?v=2026.10.19.4";
import { getVisibleCategoryKeys } from "./categories.js?v=2026.10.19.4";
import { syncCategoryLayerInputs } from "./markerVisibility.js?v=2026.10.19.4";
import { categoryVisibility } from "./state.js?v=2026.10.19.4";
import { syncMarkersToFilter } from "./markerVisibility.js?v=2026.10.19.4";

export function resetMap() {
  map.stop();
  map.closePopup();
  // Center the whole campus in the area not covered by the toolbar/sidebar.
  map.fitBounds(campusBounds, { ...getMapPadding(), maxZoom: INITIAL_ZOOM, animate: false });
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
