// =====================================================
// parking.js — Fitur layer parkiran (mobil & motor)
// Tanggung jawab: memuat GeoJSON parkir, menggambar area + pola arsir,
// merender daftar/kontrol parkir di sidebar, dan toggle visibilitasnya.
// =====================================================
import { map, parkingRenderer, parkingLayerGroup } from "./mapCore.js?v=2026.10.19";
import { parkingItems, parkingVisibility, parkingPanelState, parkingLoadState } from "./state.js?v=2026.10.19";
import { closeSidebar, getMapPadding } from "./layout.js?v=2026.10.19";
import { requestSidebarRender } from "./uiEvents.js?v=2026.10.19";
import { fetchGeoJson, getFeatures, isPolygonGeometry } from "./geojson.js?v=2026.10.19";
import { escapeHtml } from "./utils.js?v=2026.10.19";

export const parkingTypeStyles = {
  car: {
    key: "car",
    label: "Parkiran Mobil",
    fillColor: "#6b7280",
    hatchColor: "#374151",
    borderColor: "#374151",
    patternId: "parking-car-hatch",
    file: "data/parkiran-mobil.geojson"
  },
  motor: {
    key: "motor",
    label: "Parkiran Motor",
    fillColor: "#facc15",
    hatchColor: "#92400e",
    borderColor: "#a16207",
    patternId: "parking-motor-hatch",
    file: "data/parkiran-motor.geojson"
  }
};

const parkingTypeLayers = new Map();
let pendingLoad;

function getParkingTypeConfig(type) {
  return parkingTypeStyles[type] || parkingTypeStyles.car;
}

function injectParkingHatchPatterns() {
  const svg = map.getPane("parkingPane").querySelector("svg");
  if (!svg || svg.querySelector("defs")) return;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  // Background and hatch belong to the same fill: one SVG path per polygon.
  defs.innerHTML = Object.values(parkingTypeStyles).map((config) => `
    <pattern id="${config.patternId}" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="${config.fillColor}" fill-opacity="0.5"></rect>
      <path d="M-2,8 L8,-2 M0,10 L10,0" stroke="${config.hatchColor}" stroke-width="1.4" opacity="0.7"></path>
    </pattern>`).join("");
  svg.prepend(defs);
}

function createParkingPopupContent(item) {
  return `<div class="popup-card"><h3>${escapeHtml(item.title)}</h3>
    <span class="category">Parking & Transportation</span>
    <p>Jenis: ${item.typeConfig.label}</p><p>ID: ${escapeHtml(item.properties.id ?? "-")}</p></div>`;
}

export function loadParkingGeoJson() {
  if (pendingLoad) return pendingLoad;
  injectParkingHatchPatterns();
  pendingLoad = Promise.allSettled(["car", "motor"].map((type) =>
    parkingLoadState[type] === "ready" ? Promise.resolve() : loadParkingType(type)
  )).then((results) => {
    for (const result of results) if (result.status === "rejected") console.warn("GeoJSON parkiran gagal dimuat:", result.reason);
    requestSidebarRender();
    syncParkingLayerInputs();
    return results.every((result) => result.status === "fulfilled");
  }).finally(() => { pendingLoad = null; });
  return pendingLoad;
}

async function loadParkingType(type) {
  const config = getParkingTypeConfig(type);
  parkingLoadState[type] = "loading";
  try {
    const allFeatures = getFeatures(await fetchGeoJson(config.file));
    const features = allFeatures.filter((feature) => feature?.type === "Feature" && isPolygonGeometry(feature.geometry));
    if (!features.length) throw new Error(`${config.label}: tidak ada poligon yang valid.`);
    if (features.length !== allFeatures.length) console.warn(`${config.label}: ${allFeatures.length - features.length} fitur tidak valid dilewati.`);
    const items = features.map((feature, index) => ({
      id: `${type}-${index}`, type, typeConfig: config,
      title: String(feature.properties?.nama || feature.properties?.name || `${config.label} ${feature.properties?.id ?? index + 1}`),
      properties: feature.properties || {}, layer: null
    }));
    const byFeature = new Map(features.map((feature, index) => [feature, items[index]]));
    const layer = L.geoJSON({ type: "FeatureCollection", features }, {
      renderer: parkingRenderer,
      style: { color: config.borderColor, weight: 2, opacity: 0.95,
        fillColor: `url(#${config.patternId})`, fillOpacity: 1 },
      onEachFeature: (feature, polygon) => {
        const item = byFeature.get(feature);
        item.layer = polygon;
        // Build popup HTML only when the polygon is opened.
        polygon.bindPopup(() => createParkingPopupContent(item), { autoPan: false, maxWidth: 280, closeButton: true });
      }
    });
    const previous = parkingTypeLayers.get(type);
    if (previous) parkingLayerGroup.removeLayer(previous);
    for (let index = parkingItems.length - 1; index >= 0; index--) {
      if (parkingItems[index].type === type) parkingItems.splice(index, 1);
    }
    parkingItems.push(...items);
    parkingTypeLayers.set(type, layer);
    if (parkingVisibility[type] !== false) parkingLayerGroup.addLayer(layer);
    parkingLoadState[type] = "ready";
  } catch (error) {
    parkingLoadState[type] = "error";
    throw error;
  }
}

function isParkingVisible(type) {
  return map.hasLayer(parkingLayerGroup) && parkingVisibility[type] !== false;
}

function renderParkingStatus() {
  const failed = Object.keys(parkingLoadState).filter((type) => parkingLoadState[type] === "error");
  if (failed.length) return `<div class="data-status" role="status">${failed.map((type) => parkingTypeStyles[type].label).join(" dan ")} gagal dimuat.
    <button type="button" onclick="retryLoadParking()">Coba lagi</button></div>`;
  if (Object.values(parkingLoadState).some((state) => state === "idle" || state === "loading")) {
    return '<div class="data-status" role="status">Memuat data parkiran...</div>';
  }
  return "";
}

function getParkingItemsByType(type) {
  return parkingItems.filter(function(item) {
    return item.type === type;
  });
}

function renderParkingSubGroup(type) {
  const config = getParkingTypeConfig(type);
  const items = getParkingItemsByType(type);
  const isOpen = parkingPanelState[type] !== false;
  const isVisible = isParkingVisible(type);

  if (!items.length) {
    return "";
  }

  let html = `
    <div class="parking-subcategory">
      <div class="parking-subcategory-header">
        <button class="category-group-main" onclick="toggleParkingSubGroup('${type}')">
          <span class="parking-subcategory-title">
            <span
              class="parking-swatch"
              style="--parking-fill: ${config.fillColor}; --parking-border: ${config.borderColor}; --parking-hatch: ${config.hatchColor};"
            ></span>
            <span>${config.label}</span>
            <span class="parking-subcategory-count">${items.length}</span>
          </span>
          <span class="category-group-actions">
            <i class="fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}"></i>
          </span>
        </button>
        <button
          class="category-visibility-toggle ${isVisible ? "" : "is-hidden"}"
          onclick="toggleParkingVisibilityFromLocations('${type}')"
          title="${isVisible ? "Sembunyikan parkiran" : "Tampilkan parkiran"}"
        >
          <i class="fa-solid ${isVisible ? "fa-eye" : "fa-eye-slash"}"></i>
          <span>${isVisible ? "Tampil" : "Sembunyi"}</span>
        </button>
      </div>
      <div class="category-group-body ${isOpen ? "" : "collapsed"}">
  `;

  items.forEach(function(item) {
    html += `
      <button type="button" class="building-item parking-item" data-parking-id="${item.id}">
        <div class="building-label">
          <span
            class="parking-swatch"
            style="--parking-fill: ${config.fillColor}; --parking-border: ${config.borderColor}; --parking-hatch: ${config.hatchColor};"
          ></span>
          <div>
            <div>${escapeHtml(item.title)}</div>
            <div class="building-category">${config.label}</div>
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

  return html;
}

export function renderParkingGroupHtml() {
  if (!parkingItems.length) return renderParkingStatus();

  const isOpen = parkingPanelState.main !== false;
  const isVisible = isParkingVisible("car") || isParkingVisible("motor");

  return `
    <div class="category-group">
      <div class="category-group-header">
        <button class="category-group-main" onclick="toggleParkingMainGroup()">
          <span class="category-group-title">
            <span class="category-sidebar-icon" style="--marker-color: #475569;">
              <i class="fa-solid fa-square-parking"></i>
            </span>
            <span>Parking & Transportation</span>
            <span class="category-group-count">${parkingItems.length}</span>
          </span>
          <span class="category-group-actions">
            <i class="fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}"></i>
          </span>
        </button>
        <button
          class="category-visibility-toggle ${isVisible ? "" : "is-hidden"}"
          onclick="toggleAllParkingVisibilityFromLocations()"
          title="${isVisible ? "Sembunyikan semua parkiran" : "Tampilkan semua parkiran"}"
        >
          <i class="fa-solid ${isVisible ? "fa-eye" : "fa-eye-slash"}"></i>
          <span>${isVisible ? "Tampil" : "Sembunyi"}</span>
        </button>
      </div>
      <div class="category-group-body ${isOpen ? "" : "collapsed"}">
        ${renderParkingSubGroup("car")}
        ${renderParkingSubGroup("motor")}
        ${renderParkingStatus()}
      </div>
    </div>
  `;
}

export function renderParkingLayerControls() {
  if (!parkingItems.length) {
    return renderParkingStatus();
  }

  let html = `
    <div class="layer-group-title">Parking & Transportation</div>
    <div class="layer-item">
      <label class="layer-label">
        <input type="checkbox" id="allParkingToggle" checked onchange="toggleAllParkingLayers(this)">
        <i class="fa-solid fa-square-parking"></i>
        Semua Area Parkiran
      </label>
    </div>
  `;

  ["car", "motor"].forEach(function(type) {
    const config = getParkingTypeConfig(type);
    const items = getParkingItemsByType(type);
    const checked = isParkingVisible(type) ? "checked" : "";

    if (!items.length) {
      return;
    }

    html += `
      <div class="layer-item">
        <div class="category-filter-row">
          <label>
            <input
              type="checkbox"
              data-parking-toggle="${type}"
              ${checked}
              onchange="toggleParkingLayer('${type}', this)"
            >
            <span
              class="parking-swatch"
              style="--parking-fill: ${config.fillColor}; --parking-border: ${config.borderColor}; --parking-hatch: ${config.hatchColor};"
            ></span>
            <span>${config.label}</span>
          </label>
          <span class="category-filter-count">${items.length}</span>
        </div>
      </div>
    `;
  });

  return html + renderParkingStatus();
}

function setParkingVisible(type, visible) {
  if (!Object.hasOwn(parkingTypeStyles, type)) return;
  parkingVisibility[type] = visible;
  const layer = parkingTypeLayers.get(type);
  if (layer) {
    if (visible) parkingLayerGroup.addLayer(layer);
    else parkingLayerGroup.removeLayer(layer);
  }
  if (visible && !map.hasLayer(parkingLayerGroup)) parkingLayerGroup.addTo(map);
}

export function syncParkingLayerInputs() {
  document.querySelectorAll("[data-parking-toggle]").forEach((input) => {
    input.checked = isParkingVisible(input.dataset.parkingToggle);
  });
  const all = document.getElementById("allParkingToggle");
  const types = Object.keys(parkingTypeStyles).filter((type) => parkingTypeLayers.has(type));
  if (all) {
    all.checked = types.length > 0 && types.every(isParkingVisible);
    all.indeterminate = types.some(isParkingVisible) && !all.checked;
  }
}

export function toggleParkingMainGroup() {
  parkingPanelState.main = parkingPanelState.main === false;
  requestSidebarRender();
}

export function toggleParkingSubGroup(type) {
  parkingPanelState[type] = parkingPanelState[type] === false;
  requestSidebarRender();
}

export function toggleParkingVisibilityFromLocations(type) {
  const nextVisible = !isParkingVisible(type);

  setParkingVisible(type, nextVisible);
  syncParkingLayerInputs();
  requestSidebarRender();
}

export function toggleAllParkingVisibilityFromLocations() {
  const nextVisible = !isParkingVisible("car") && !isParkingVisible("motor");

  setParkingVisible("car", nextVisible);
  setParkingVisible("motor", nextVisible);
  syncParkingLayerInputs();
  requestSidebarRender();
}

export function toggleParkingLayer(type, checkbox) {
  setParkingVisible(type, checkbox.checked);
  syncParkingLayerInputs();
}

export function toggleAllParkingLayers(checkbox) {
  setParkingVisible("car", checkbox.checked);
  setParkingVisible("motor", checkbox.checked);
  syncParkingLayerInputs();
}

export function focusParkingItem(itemId) {
  const item = parkingItems.find(function(parkingItem) {
    return parkingItem.id === itemId;
  });

  if (!item || !item.layer) {
    return;
  }

  if (!isParkingVisible(item.type)) {
    setParkingVisible(item.type, true);
    syncParkingLayerInputs();
    requestSidebarRender();
  }

  if (!map.hasLayer(parkingLayerGroup)) {
    parkingLayerGroup.addTo(map);
  }

  if (window.innerWidth <= 700) closeSidebar();
  const bounds = item.layer.getBounds();
  map.fitBounds(bounds, { ...getMapPadding(), maxZoom: 20 });
  item.layer.openPopup(bounds.getCenter());
}
