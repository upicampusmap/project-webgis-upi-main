// =====================================================
// mapCore.js — Inisialisasi peta Leaflet & scaffolding layer
// Tanggung jawab: membuat instance map + basemap + tile kampus
// + layer control + renderer/layerGroup parkir + cluster gedung.
// Ini "composition root" untuk seluruh singleton Leaflet.
// =====================================================
import { INITIAL_CENTER, INITIAL_ZOOM, campusBounds } from "./config.js?v=2026.10.19.5";

export const map = L.map('map', {
  center: INITIAL_CENTER,
  zoom: INITIAL_ZOOM,
  minZoom: 14,
  maxZoom: 20,
  zoomControl: false
});

// Pindahkan zoom control ke kanan atas agar tidak bertabrakan dengan sidebar
L.control.zoom({
  position: 'topright'
}).addTo(map);

// ---- Basemap ----
export const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  maxNativeZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

export const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: 'Tiles &copy; Esri'
  }
);

// ---- Tile peta kampus hasil georeferencing ----
export const upiCampusTile = L.tileLayer('tiles/upi/{z}/{x}/{y}.png', {
  minZoom: 14,
  maxZoom: 20,
  maxNativeZoom: 20,
  bounds: campusBounds,
  opacity: 0.95,
  tms: false
}).addTo(map);

// ---- Layer control bawaan Leaflet ----
const baseMaps = {
  "OpenStreetMap": osm,
  "Satelit": satellite
};

const overlayMaps = {
  "Peta Kampus UPI": upiCampusTile
};

export const layerControl = L.control.layers(baseMaps, overlayMaps, {
  position: 'topright',
  collapsed: true
}).addTo(map);

map.createPane("parkingPane");
map.getPane("parkingPane").style.zIndex = "450";
// SVG preserves hatch patterns; each parking polygon is rendered only once.
export const parkingRenderer = L.svg({ pane: "parkingPane", padding: 0.2 }).addTo(map);
export const parkingLayerGroup = L.layerGroup().addTo(map);
layerControl.addOverlay(parkingLayerGroup, "Parkiran");

// ---- Marker cluster group untuk gedung ----
export const buildingClusterGroup = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  zoomToBoundsOnClick: true,
  maxClusterRadius: 45,
  disableClusteringAtZoom: 18,
  removeOutsideVisibleBounds: true,
  iconCreateFunction: function(cluster) {
    let count = cluster.getChildCount();
    let sizeClass = count < 10 ? "small" : count < 25 ? "medium" : "large";
    return L.divIcon({
      html: '<div class="cluster-inner"><span>' + count + '</span></div>',
      className: "upi-cluster upi-cluster-" + sizeClass,
      iconSize: L.point(40, 40)
    });
  }
});
map.addLayer(buildingClusterGroup);
