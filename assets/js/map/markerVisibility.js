// =====================================================
// markerVisibility.js — Visibilitas marker gedung
// Tanggung jawab: mengatur marker mana yang tampil di peta
// berdasarkan filter kategori (chips) + toggle show/hide kategori,
// serta menyinkronkan input checkbox di tab Layer.
// =====================================================
import { buildingClusterGroup } from "./mapCore.js?v=2026.10.18";
import { buildingMarkers, categoryVisibility, categoryPanelState, activeFilters } from "./state.js?v=2026.10.18";
import { getVisibleCategoryKeys } from "./categories.js?v=2026.10.18";
import { requestSidebarRender } from "./uiEvents.js?v=2026.10.18";

export function toggleFilter(categoryKey) {
  if (categoryKey === "all") {
    activeFilters.clear();
  } else if (activeFilters.has(categoryKey)) {
    activeFilters.delete(categoryKey);
  } else {
    activeFilters.add(categoryKey);
  }
  syncMarkersToFilter();
  requestSidebarRender();
}

export function syncMarkersToFilter() {
  const added = [];
  const removed = [];
  buildingMarkers.forEach(function(marker) {
    var key = marker.categoryKey;
    var passesFilter = activeFilters.size === 0 || activeFilters.has(key);
    var categoryAllowed = categoryVisibility[key] !== false;
    if (passesFilter && categoryAllowed) {
      if (!buildingClusterGroup.hasLayer(marker)) added.push(marker);
    } else {
      if (buildingClusterGroup.hasLayer(marker)) removed.push(marker);
    }
  });
  if (removed.length) buildingClusterGroup.removeLayers(removed);
  if (added.length) buildingClusterGroup.addLayers(added);
}

export function toggleCategoryGroup(categoryKey) {
  categoryPanelState[categoryKey] = categoryPanelState[categoryKey] === false;
  requestSidebarRender();
}

export function setCategoryVisible(categoryKey, visible) {
  categoryVisibility[categoryKey] = visible;
  syncMarkersToFilter();
}

export function syncCategoryLayerInputs() {
  const allToggle = document.getElementById("allMarkersToggle");
  const categoryToggles = document.querySelectorAll("[data-category-toggle]");
  const visibleKeys = getVisibleCategoryKeys();

  categoryToggles.forEach(function(input) {
    const categoryKey = input.getAttribute("data-category-toggle");
    input.checked = categoryVisibility[categoryKey] !== false;
  });

  if (allToggle) {
    allToggle.checked = visibleKeys.every(function(categoryKey) {
      return categoryVisibility[categoryKey] !== false;
    });
    allToggle.indeterminate = visibleKeys.some((key) => categoryVisibility[key] !== false) && !allToggle.checked;
  }
}

export function toggleCategoryMarkers(categoryKey, checkbox) {
  setCategoryVisible(categoryKey, checkbox.checked);
  syncCategoryLayerInputs();
}

export function toggleCategoryVisibilityFromLocations(categoryKey) {
  const nextVisible = categoryVisibility[categoryKey] === false;

  setCategoryVisible(categoryKey, nextVisible);
  syncCategoryLayerInputs();
  requestSidebarRender();
}
