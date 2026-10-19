// =====================================================
// sidebar.js — Render & tata letak sidebar
// Tanggung jawab: merender isi tab (Lokasi/Layer/Info), skeleton,
// berpindah tab, serta mengatur buka/tutup & chrome sidebar (mobile/desktop).
// Handler onclick pada HTML yang dihasilkan diselesaikan lewat window.*
// (di-wire di main.js), sehingga modul ini tidak perlu meng-import-nya.
// =====================================================
import { map, upiCampusTile } from "./mapCore.js?v=2026.10.19.2";
import { activeFilters, categoryPanelState, categoryVisibility, sidebarState, buildingsByName } from "./state.js?v=2026.10.19.2";
import {
  categoryIconStyles, getGroupedBuildings, getVisibleCategoryKeys, getCategoryIconHtml
} from "./categories.js?v=2026.10.19.2";
import { renderParkingGroupHtml, renderParkingLayerControls, syncParkingLayerInputs } from "./parking.js?v=2026.10.19.2";
import { renderBuildingDetail } from "./buildingDetail.js?v=2026.10.19.2";
import { syncCategoryLayerInputs } from "./markerVisibility.js?v=2026.10.19.2";
import { escapeHtml } from "./utils.js?v=2026.10.19.2";
import { updateMobileSheetTitle, setSidebarView } from "./layout.js?v=2026.10.19.2";

export function renderLocations() {
  const container = document.getElementById("sidebarContent");
  const chipScroll = container.querySelector(".filter-chips-bar")?.scrollLeft || 0;
  sidebarState.building = null;
  setSidebarView("browse");
  const grouped = getGroupedBuildings();
  const visibleKeys = getVisibleCategoryKeys();

  // — Filter Chips bar —
  let filterHtml = `<div class="filter-chips-bar" role="group" aria-label="Filter kategori fasilitas" title="Geser atau gunakan roda mouse untuk melihat kategori lainnya">`;
  filterHtml += `<button type="button" class="filter-chip ${activeFilters.size === 0 ? "filter-chip-active" : ""}" data-filter-category="all" aria-pressed="${activeFilters.size === 0}" onclick="toggleFilter('all')">
    <i class="fa-solid fa-border-all"></i> Semua
  </button>`;
  visibleKeys.forEach(function(key) {
    let cfg = categoryIconStyles[key];
    let isActive = activeFilters.has(key);
    filterHtml += `<button
      type="button" data-filter-category="${key}" aria-pressed="${isActive}"
      class="filter-chip ${isActive ? "filter-chip-active" : ""}"
      style="${isActive ? "--chip-color:" + cfg.color : ""}"
      onclick="toggleFilter('${key}')"
      title="${cfg.label}"
    >
      <i class="fa-solid ${cfg.icon}"></i>
      <span>${cfg.label}</span>
    </button>`;
  });
  filterHtml += `</div>`;

  let html = `<div class="browse-heading"><h2>Jelajahi kampus</h2><p><span class="location-total">${Object.values(grouped).flat().length} lokasi</span> · Temukan gedung dan fasilitas UPI</p></div>` + filterHtml + `
    <div class="layer-group-title">
      Lokasi Gedung per Kategori
      ${activeFilters.size > 0 ? `<span class="filter-active-badge">${activeFilters.size} filter aktif</span>` : ""}
    </div>
  `;

  const keysToShow = activeFilters.size > 0
    ? visibleKeys.filter(function(k) { return activeFilters.has(k); })
    : visibleKeys;

  keysToShow.forEach(function(categoryKey) {
    const categoryConfig = categoryIconStyles[categoryKey];
    const groupBuildings = grouped[categoryKey];
    if (!groupBuildings || !groupBuildings.length) return;
    const isOpen = categoryPanelState[categoryKey] === true;
    const isVisible = categoryVisibility[categoryKey] !== false;

    html += `
      <div class="category-group">
        <div class="category-group-header">
          <button type="button" class="category-group-main" id="category-${categoryKey}-toggle" data-category-group="${categoryKey}" aria-expanded="${isOpen}" aria-controls="category-${categoryKey}-items" onclick="toggleCategoryGroup('${categoryKey}')">
            <span class="category-group-title">
              <span class="category-sidebar-icon" style="--marker-color:${categoryConfig.color}"><i class="fa-solid ${categoryConfig.icon}"></i></span>
              <span>${categoryConfig.label}</span>
              <span class="category-group-count">${groupBuildings.length}</span>
            </span>
            <span class="category-group-actions">
              <i class="fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}"></i>
            </span>
          </button>
          <button
            class="category-visibility-toggle ${isVisible ? "" : "is-hidden"}"
            onclick="toggleCategoryVisibilityFromLocations('${categoryKey}')"
            title="${isVisible ? "Sembunyikan kategori" : "Tampilkan kategori"}"
          >
            <i class="fa-solid ${isVisible ? "fa-eye" : "fa-eye-slash"}"></i>
            <span>${isVisible ? "Tampil" : "Sembunyi"}</span>
          </button>
        </div>
        <div id="category-${categoryKey}-items" class="category-group-body ${isOpen ? "" : "collapsed"}" ${isOpen ? "" : "hidden"}>
    `;

    groupBuildings.forEach(function(building) {
      html += `
        <button type="button" class="building-item" data-building-name="${escapeHtml(building.name)}">
          <div class="building-label">
            ${getCategoryIconHtml(building.category, building.name, "category-sidebar-icon")}
            <div>
              <div>${escapeHtml(building.name)}</div>
              <div class="building-category">${escapeHtml(building.category)}</div>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += renderParkingGroupHtml();

  container.innerHTML = html;
  container.querySelector(".filter-chips-bar").scrollLeft = chipScroll;
}

function renderCategoryLayerControls() {
  const grouped = getGroupedBuildings();
  let html = `
    <div class="layer-group-title">Kategori Marker</div>
  `;

  getVisibleCategoryKeys().forEach(function(categoryKey) {
    const categoryConfig = categoryIconStyles[categoryKey];
    const groupBuildings = grouped[categoryKey];
    const checked = categoryVisibility[categoryKey] !== false ? "checked" : "";

    html += `
      <div class="layer-item">
        <div class="category-filter-row">
          <label>
            <input
              type="checkbox"
              data-category-toggle="${categoryKey}"
              ${checked}
              onchange="toggleCategoryMarkers('${categoryKey}', this)"
            >
            <span class="category-sidebar-icon" style="--marker-color:${categoryConfig.color}"><i class="fa-solid ${categoryConfig.icon}"></i></span>
            <span>${categoryConfig.label}</span>
          </label>
          <span class="category-filter-count">${groupBuildings.length}</span>
        </div>
      </div>
    `;
  });

  return html;
}

export function renderLayers() {
  const container = document.getElementById("sidebarContent");

  container.innerHTML = `
    <div class="layer-group-title">Layer Peta</div>

    <div class="layer-item">
      <label class="layer-label">
        <input type="checkbox" id="campusTileToggle" ${map.hasLayer(upiCampusTile) ? "checked" : ""} onchange="toggleCampusTile(this)">
        <i class="fa-solid fa-map"></i>
        Peta Kampus UPI
      </label>
    </div>

    <div class="layer-item">
      <label class="layer-label">
        <input type="checkbox" checked onchange="toggleBuildingMarkers(this)" id="allMarkersToggle">
        <i class="fa-solid fa-building"></i>
        Semua Marker Gedung
      </label>
    </div>

    ${renderCategoryLayerControls()}
    ${renderParkingLayerControls()}

    <div class="layer-group-title">Transparansi Overlay</div>

    <div class="layer-item">
      <div style="width: 100%;">
        <label style="font-size: 13px;">Transparansi Peta Kampus</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value="${upiCampusTile.options.opacity}"
          style="width: 100%; margin-top: 8px;"
          oninput="setCampusOpacity(this.value)"
        >
      </div>
    </div>
  `;
  syncCategoryLayerInputs();
  syncParkingLayerInputs();
}

export function renderInfo() {
  const container = document.getElementById("sidebarContent");

  container.innerHTML = `
    <div class="layer-group-title">Tentang WebGIS Ini</div>

    <div style="padding: 14px 16px; line-height: 1.65; color: #444; font-size: 13.5px;">
      <p style="margin:0 0 10px">
        WebGIS Kampus UPI menampilkan peta kampus Universitas Pendidikan Indonesia
        secara interaktif — hasil georeferencing peta raster kampus.
      </p>
      <p style="margin:0 0 8px;font-weight:600;color:#1e293b;">Fitur tersedia:</p>
      <ul style="padding-left: 18px; margin:0; display:flex; flex-direction:column; gap:5px;">
        <li>Peta kampus interaktif dengan marker kategori</li>
        <li>Pencarian gedung dengan autocomplete</li>
        <li>Informasi gedung sesuai data yang tersedia</li>
        <li>Filter kategori multi-select</li>
        <li>Deteksi posisi pengguna (GPS)</li>
        <li>Layer parkir mobil & motor</li>
      </ul>
      <p style="margin:14px 0 0; font-size:12px; color:#94a3b8;">
        Universitas Pendidikan Indonesia<br>
        Jl. Dr. Setiabudi No. 229, Bandung
      </p>
    </div>
  `;
}

export function renderActiveSidebarTab() {
  if (sidebarState.tab === "layers") renderLayers();
  else if (sidebarState.tab === "info") renderInfo();
  else if (sidebarState.building && buildingsByName.has(sidebarState.building)) {
    renderBuildingDetail(buildingsByName.get(sidebarState.building));
  } else renderLocations();
}

export function renderSidebarSkeleton() {
  let container = document.getElementById("sidebarContent");
  if (!container) return;
  let rows = "";
  for (let i = 0; i < 6; i++) {
    rows += `
      <div class="skeleton-row">
        <div class="skeleton-circle"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line skeleton-line-long"></div>
          <div class="skeleton-line skeleton-line-short"></div>
        </div>
      </div>`;
  }
  container.innerHTML = `<div class="skeleton-wrap">${rows}</div>`;
}

export function showTab(tabName) {
  if (!["locations", "layers", "info"].includes(tabName)) return;
  map.closePopup();
  setSidebarView("browse");
  sidebarState.tab = tabName;
  sidebarState.building = null;
  document.querySelectorAll(".sidebar-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
    if (button.dataset.tab === tabName) updateMobileSheetTitle(button.textContent.trim());
  });
  renderActiveSidebarTab();
}
