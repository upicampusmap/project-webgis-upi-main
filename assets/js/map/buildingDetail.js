import { map, buildingClusterGroup } from "./mapCore.js?v=2026.10.18";
import { buildingsByName, markersByName, categoryVisibility, activeFilters, sidebarState } from "./state.js?v=2026.10.18";
import { getIconConfigByCategory } from "./categories.js?v=2026.10.18";
import { getInitials, showToast, escapeHtml, safeWebUrl } from "./utils.js?v=2026.10.18";
import { syncMarkersToFilter, syncCategoryLayerInputs } from "./markerVisibility.js?v=2026.10.18";
import { openSidebar, updateMobileSheetTitle, getMapPadding, setSidebarView } from "./layout.js?v=2026.10.18";

let pulseTimer;
let pulseElement;
let pendingHighlight;

function highlightMarker(marker) {
  const element = marker.getElement();
  if (!element) return;
  clearTimeout(pulseTimer);
  pulseElement?.classList.remove("marker-pulse");
  pulseElement = element;
  element.classList.add("marker-pulse");
  pulseTimer = setTimeout(() => element.classList.remove("marker-pulse"), 2000);
}

function focusBuildingByName(name) {
  const marker = markersByName.get(name);
  if (!marker) return;
  const key = marker.categoryKey;
  categoryVisibility[key] = true;
  if (activeFilters.size && !activeFilters.has(key)) activeFilters.add(key);
  syncMarkersToFilter();
  syncCategoryLayerInputs();
  if (!map.hasLayer(buildingClusterGroup)) buildingClusterGroup.addTo(map);
  if (pendingHighlight) map.off("moveend", pendingHighlight);
  map.stop();
  // The selected zoom disables clustering. Highlight must never start another pan.
  pendingHighlight = () => highlightMarker(marker);
  map.once("moveend", pendingHighlight);
  const position = marker.getLatLng();
  map.flyToBounds(L.latLngBounds(position, position), {
    ...getMapPadding(), maxZoom: 19, duration: 0.8, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  });
}

export function openBuildingDetail(name) {
  const building = buildingsByName.get(name);
  if (!building) return;
  map.closePopup();
  document.getElementById("mapLegend")?.classList.remove("map-legend-expanded");
  document.querySelector(".map-legend-toggle")?.setAttribute("aria-expanded", "false");
  sidebarState.tab = "locations";
  sidebarState.building = name;
  openSidebar();
  renderBuildingDetail(building);
  document.querySelector(".detail-building-name")?.focus({ preventScroll: true });
  focusBuildingByName(name);
}

export function renderBuildingDetail(building) {
  const container = document.getElementById("sidebarContent");
  if (!container) return;
  setSidebarView("detail");
  const icon = getIconConfigByCategory(building.category, building.name);
  const name = escapeHtml(building.name);
  const website = safeWebUrl(building.linkWeb);
  const rows = [];
  if (building.hours) rows.push(`<div class="detail-info-row"><i class="fa-regular fa-clock"></i><span>${escapeHtml(building.hours)}</span></div>`);
  if (building.floors) rows.push(`<div class="detail-info-row"><i class="fa-solid fa-layer-group"></i><span>${escapeHtml(building.floors)} lantai</span></div>`);
  if (building.phone) {
    const phone = building.phone.replace(/[^+0-9]/g, "");
    rows.push(`<div class="detail-info-row"><i class="fa-solid fa-phone"></i><a href="tel:${phone}">${escapeHtml(building.phone)}</a></div>`);
  }
  const facilities = building.facilities.length ? `<div class="detail-section">
    <div class="detail-section-title"><i class="fa-solid fa-list-check"></i> Fasilitas</div>
    <div class="detail-facilities">${building.facilities.map((facility) => `<span class="detail-facility-chip">${escapeHtml(facility)}</span>`).join("")}</div>
  </div>` : "";
  container.innerHTML = `<div class="building-detail-panel">
    <button class="detail-back-btn" data-back-locations><i class="fa-solid fa-arrow-left"></i> Kembali ke Daftar</button>
    <div class="detail-img-wrap">
      ${building.image ? `<img src="${escapeHtml(building.image)}" alt="${name}" decoding="async">` : ""}
      <div class="detail-img-fallback" style="display:${building.image ? "none" : "flex"};background:${icon.color}22;color:${icon.color};">${escapeHtml(getInitials(building.name))}</div>
    </div>
    <div class="detail-body">
      <span class="detail-category-badge" style="background:${icon.color}18;color:${icon.color};border:1px solid ${icon.color}40;">
        <i class="fa-solid ${icon.icon}"></i> ${icon.label}</span>
      <h2 class="detail-building-name" tabindex="-1">${name}</h2>
      ${building.description ? `<p class="detail-description">${escapeHtml(building.description)}</p>` : ""}
      ${rows.length ? `<div class="detail-info-section">${rows.join("")}</div>` : ""}
      ${facilities}
      <div class="detail-actions">
        ${website ? `<a class="detail-btn detail-btn-website" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Kunjungi Website</a>` : ""}
        <button class="detail-btn detail-btn-share"><i class="fa-solid fa-share-nodes"></i> Bagikan Lokasi</button>
      </div>
    </div>
  </div>`;
  const image = container.querySelector(".detail-img-wrap img");
  if (image) {
    const showFallback = () => { image.style.display = "none"; image.nextElementSibling.style.display = "flex"; };
    image.addEventListener("error", showFallback, { once: true });
    if (image.complete && !image.naturalWidth) showFallback();
  }
  container.querySelector(".detail-btn-share").addEventListener("click", () => shareBuilding(building.name));
  document.querySelectorAll(".sidebar-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === "locations");
  });
  updateMobileSheetTitle("Detail Lokasi");
  container.scrollTop = 0;
}

export async function shareBuilding(name) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("building", name);
  if (!navigator.clipboard?.writeText) { showToast(`Salin: ${url.href}`); return; }
  try { await navigator.clipboard.writeText(url.href); showToast("Tautan lokasi disalin!"); }
  catch { showToast(`Salin: ${url.href}`); }
}
