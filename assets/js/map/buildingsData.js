// Load atomically: keep the last valid map if a refresh fails.
import { buildingClusterGroup } from "./mapCore.js?v=2026.10.18";
import { buildings, buildingMarkers, buildingsByName, markersByName, categoryPanelState, categoryVisibility } from "./state.js?v=2026.10.18";
import { getIconByCategory, getCategoryKeyByBuilding, getVisibleCategoryKeys, rebuildCategoryGroups } from "./categories.js?v=2026.10.18";
import { openBuildingDetail } from "./buildingDetail.js?v=2026.10.18";
import { requestSidebarRender } from "./uiEvents.js?v=2026.10.18";
import { syncMarkersToFilter } from "./markerVisibility.js?v=2026.10.18";
import { fetchGeoJson, parseBuildings } from "./geojson.js?v=2026.10.18";

function setOverlay(id, visible) {
  const element = document.getElementById(id);
  if (element) element.style.display = visible ? "flex" : "none";
}
export function showMapLoading() { setOverlay("mapLoadingOverlay", true); }
export function hideMapLoading() { setOverlay("mapLoadingOverlay", false); }
export function hideMapError() { setOverlay("mapErrorOverlay", false); }
export function showMapError(message) {
  const text = document.getElementById("mapErrorText");
  if (text) text.textContent = message;
  setOverlay("mapErrorOverlay", true);
}

let pendingLoad = null;
let deepLinkHandled = false;
export function loadBuildingsGeoJson() {
  if (pendingLoad) return pendingLoad;
  hideMapError();
  showMapLoading();
  pendingLoad = loadBuildings().finally(() => {
    hideMapLoading();
    pendingLoad = null;
  });
  return pendingLoad;
}

async function loadBuildings() {
  try {
    const parsed = parseBuildings(await fetchGeoJson("data/gedung-upi-point.geojson"));
    if (parsed.skipped) console.warn(`${parsed.skipped} fitur gedung tidak valid dilewati.`);
    const markers = parsed.buildings.map((building) => {
      const marker = L.marker(building.coords, {
        icon: getIconByCategory(building.category, building.name),
        title: building.name, alt: building.name
      });
      marker.buildingData = building;
      marker.categoryKey = getCategoryKeyByBuilding(building);
      marker.on("click", () => openBuildingDetail(building.name));
      return marker;
    });
    buildingClusterGroup.clearLayers();
    buildings.splice(0, buildings.length, ...parsed.buildings);
    buildingMarkers.splice(0, buildingMarkers.length, ...markers);
    buildingsByName.clear();
    markersByName.clear();
    for (const building of buildings) buildingsByName.set(building.name, building);
    for (const marker of markers) markersByName.set(marker.buildingData.name, marker);
    rebuildCategoryGroups();
    for (const key of getVisibleCategoryKeys()) {
      categoryPanelState[key] ??= true;
      categoryVisibility[key] ??= true;
    }
    syncMarkersToFilter();
    requestSidebarRender();
    handleUrlBuildingParam();
    return true;
  } catch (error) {
    console.error("Gagal memuat data gedung:", error);
    showMapError(error.message || "Periksa koneksi internet lalu coba lagi.");
    return false;
  }
}

export function retryLoadBuildings() { return loadBuildingsGeoJson(); }

function handleUrlBuildingParam() {
  if (deepLinkHandled) return;
  const name = new URLSearchParams(window.location.search).get("building");
  deepLinkHandled = true;
  // URLSearchParams already decodes the name, including literal percent signs.
  if (name && buildingsByName.has(name)) openBuildingDetail(name);
}
