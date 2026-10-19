// =====================================================
// state.js — State runtime bersama antar-modul
// Tanggung jawab: menyimpan state aplikasi yang dipakai lintas fitur.
// Containers have stable identities; data reloads update their contents in place.
// =====================================================
export const buildings = [];
export const buildingMarkers = [];
export const buildingsByName = new Map();
export const markersByName = new Map();
export const groupedBuildings = new Map();
export const parkingItems = [];
export const parkingLoadState = { car: "idle", motor: "idle" };
export const sidebarState = { tab: "locations", building: null };

export const parkingVisibility = {
  car: true,
  motor: true
};

export const parkingPanelState = {
  main: false,
  car: false,
  motor: false
};

export const categoryPanelState = {};
export const categoryVisibility = {};
export const activeFilters = new Set(); // filter multi-select kategori di sidebar
