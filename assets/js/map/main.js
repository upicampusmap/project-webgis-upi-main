// =====================================================
// main.js — Composition root aplikasi peta
// Tanggung jawab: menyatukan semua modul, mengekspos handler ke
// window (agar atribut onclick/onchange/oninput di HTML tetap jalan),
// memasang listener global, dan menjalankan urutan inisialisasi.
// =====================================================
import { map, upiCampusTile, parkingLayerGroup } from "./mapCore.js?v=2026.10.19.1";
import { renderLegendItems, toggleLegend } from "./legend.js?v=2026.10.19.1";
import {
  renderSidebarSkeleton, showTab, renderActiveSidebarTab
} from "./sidebar.js?v=2026.10.19.1";
import { toggleSidebar, updateSidebarChrome, initLayout, closeSidebar } from "./layout.js?v=2026.10.19.1";
import { searchBuilding, initSearchAutocomplete } from "./search.js?v=2026.10.19.1";
import { locateMe, removeUserLocation } from "./geolocation.js?v=2026.10.19.1";
import {
  resetMap, printMap, toggleCampusTile, toggleBuildingMarkers, setCampusOpacity
} from "./mapControls.js?v=2026.10.19.1";
import {
  toggleFilter, toggleCategoryGroup,
  toggleCategoryVisibilityFromLocations, toggleCategoryMarkers
} from "./markerVisibility.js?v=2026.10.19.1";
import { sidebarState } from "./state.js?v=2026.10.19.1";
import { openBuildingDetail } from "./buildingDetail.js?v=2026.10.19.1";
import {
  loadParkingGeoJson,
  toggleParkingMainGroup, toggleParkingSubGroup,
  toggleParkingVisibilityFromLocations, toggleAllParkingVisibilityFromLocations,
  focusParkingItem, toggleParkingLayer, toggleAllParkingLayers, syncParkingLayerInputs
} from "./parking.js?v=2026.10.19.1";
import {
  loadBuildingsGeoJson, retryLoadBuildings
} from "./buildingsData.js?v=2026.10.19.1";

// ---------------------------------------------------------------
// Ekspos handler yang dipanggil dari atribut onclick/onchange/oninput
// di map.html maupun di HTML yang dihasilkan modul (innerHTML).
// ---------------------------------------------------------------
Object.assign(window, {
  // topbar & sidebar
  locateMe, removeUserLocation, resetMap, printMap, toggleSidebar, showTab, toggleLegend,
  // pencarian
  searchBuilding,
  // data gedung
  retryLoadBuildings, retryLoadParking: loadParkingGeoJson,
  // filter & visibilitas kategori
  toggleFilter, toggleCategoryGroup, toggleCategoryVisibilityFromLocations, toggleCategoryMarkers,
  // kontrol peta / layer
  toggleCampusTile, toggleBuildingMarkers, setCampusOpacity,
  // parkir
  toggleParkingMainGroup, toggleParkingSubGroup, toggleParkingVisibilityFromLocations,
  toggleAllParkingVisibilityFromLocations, toggleParkingLayer, toggleAllParkingLayers
});

// ---------------------------------------------------------------
// Orkestrasi inisialisasi
// ---------------------------------------------------------------
document.addEventListener("webgis:sidebar-refresh", () => {
  renderActiveSidebarTab();
  renderLegendItems();
});

async function initApp() {
  renderSidebarSkeleton();
  initSearchAutocomplete();
  await Promise.all([loadBuildingsGeoJson(), loadParkingGeoJson()]);
}

// Legenda kategori (sekali saat load)
renderLegendItems();

// One delegated handler survives sidebar rerenders; data never becomes JavaScript.
document.getElementById("sidebarContent").addEventListener("click", (event) => {
  const target = event.target.closest("[data-building-name], [data-parking-id], [data-back-locations]");
  if (!target) return;
  if (target.hasAttribute("data-building-name")) openBuildingDetail(target.dataset.buildingName);
  else if (target.hasAttribute("data-parking-id")) focusParkingItem(target.dataset.parkingId);
  else showTab("locations");
});

// Keep sidebar controls consistent with Leaflet's own layer control.
map.on("layeradd layerremove", (event) => {
  if (event.layer === upiCampusTile) {
    const input = document.getElementById("campusTileToggle");
    if (input) input.checked = map.hasLayer(upiCampusTile);
  }
  if (event.layer === parkingLayerGroup) {
    syncParkingLayerInputs();
    if (sidebarState.tab === "locations" && !sidebarState.building) renderActiveSidebarTab();
  }
});

let resizeFrame;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(updateSidebarChrome);
});
window.addEventListener("beforeprint", () => map.invalidateSize({ animate: false }));
window.addEventListener("afterprint", () => map.invalidateSize({ animate: false }));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  map.closePopup();
  if (sidebarState.building) showTab("locations");
  else closeSidebar();
});

initLayout();
resetMap();
await initApp();
