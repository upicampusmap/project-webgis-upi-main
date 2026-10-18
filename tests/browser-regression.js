const results = [];
const panel = document.createElement("pre");
panel.id = "regression-results";
panel.style.cssText = "position:fixed;inset:70px 12px auto auto;z-index:3000;max-height:75vh;max-width:650px;overflow:auto;background:#fff;padding:20px;border:3px solid #2563eb;white-space:pre-wrap;font:14px monospace";
document.body.append(panel);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function check(name, run) {
  try { await run(); results.push(`PASS ${name}`); }
  catch (error) { results.push(`FAIL ${name}: ${error.message}`); console.error(error); }
  panel.textContent = results.join("\n");
}
try {
  await import("../assets/js/map/main.js?v=2026.10.18");
  const state = await import("../assets/js/map/state.js?v=2026.10.18");
  const core = await import("../assets/js/map/mapCore.js?v=2026.10.18");
  const data = await import("../assets/js/map/buildingsData.js?v=2026.10.18");
  const parking = await import("../assets/js/map/parking.js?v=2026.10.18");
  const sidebar = await import("../assets/js/map/sidebar.js?v=2026.10.18");
  const visibility = await import("../assets/js/map/markerVisibility.js?v=2026.10.18");
  const controls = await import("../assets/js/map/mapControls.js?v=2026.10.18");
  const detail = await import("../assets/js/map/buildingDetail.js?v=2026.10.18");
  const search = await import("../assets/js/map/search.js?v=2026.10.18");
  const realFetch = window.testOriginalFetch;
  if (new URLSearchParams(location.search).has("parking-failure")) {
    await check("Partial parking failure preserves car polygons and shows retry", () => {
      assert(state.parkingItems.length === 46, "Car layer missing or motor was loaded");
      assert(document.querySelector(".data-status").textContent.includes("gagal"), "Failure appears as permanent loading");
    });
    window.fetch = realFetch;
    await parking.loadParkingGeoJson();
    await check("Retry loads failed type without duplicating successful type", () => {
      assert(state.parkingItems.length === 49, "Retry duplicated parking");
      assert(core.parkingLayerGroup.getLayers().length === 2, "Parking groups duplicated");
    });
  }
  await check("GPS outside campus restores controls without leaving campus", async () => {
    const geolocation = await import("../assets/js/map/geolocation.js?v=2026.10.18");
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    core.map.stop();
    const before = core.map.getCenter();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (success) => success({ coords: { latitude: 0, longitude: 0, accuracy: 5 } })
    }});
    try {
      geolocation.locateMe();
      assert(core.map.getCenter().equals(before), "Map flew outside campus");
      assert(!document.getElementById("locateMeBtn").disabled, "Location button remains disabled");
      assert(document.getElementById("toastMsg").textContent.includes("luar area"), "Missing outside-campus message");
    } finally {
      if (descriptor) Object.defineProperty(navigator, "geolocation", descriptor);
      else delete navigator.geolocation;
    }
  });
  await check("GPS inside campus focuses at zoom 18 with a visible popup", async () => {
    const geolocation = await import("../assets/js/map/geolocation.js?v=2026.10.18");
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (success) => success({ coords: { latitude: -6.8605, longitude: 107.5905, accuracy: 8 } })
    }});
    try {
      detail.openBuildingDetail("Asrama UPI A");
      geolocation.locateMe();
      await new Promise((resolve) => setTimeout(resolve, 350));
      assert(core.map.getZoom() === 18, `GPS focus stopped at zoom ${core.map.getZoom()}`);
      assert(core.map.getBounds().contains([-6.8605, 107.5905]), "GPS point outside map viewport");
      const popup = document.querySelector(".leaflet-popup");
      assert(popup?.textContent.includes("Posisi Anda"), "GPS popup missing");
      const rect = popup.getBoundingClientRect();
      assert(rect.left >= 0 && rect.right <= innerWidth, "GPS popup outside horizontal viewport");
      assert(rect.top >= document.querySelector(".topbar").getBoundingClientRect().bottom, "GPS popup behind toolbar");
      if (innerWidth <= 700) {
        assert(rect.bottom <= document.getElementById("sidebar").getBoundingClientRect().top, "GPS popup behind mobile sheet");
      }
      assert(!document.getElementById("locateMeBtn").disabled, "GPS button remains disabled");
    } finally {
      geolocation.removeUserLocation();
      if (descriptor) Object.defineProperty(navigator, "geolocation", descriptor);
      else delete navigator.geolocation;
      sidebar.showTab("locations");
    }
  });
  await check("All 77 building markers and sidebar rows render", () => {
    sidebar.showTab("locations");
    assert(state.buildings.length === 77 && core.buildingClusterGroup.getLayers().length === 77, "Missing markers");
    assert(document.querySelectorAll("#sidebarContent [data-building-name]").length === 77, "Missing sidebar locations");
  });
  await check("49 parking polygons use 49 SVG paths instead of 98", () => {
    assert(state.parkingItems.length === 49, "Parking count incorrect");
    const paths = core.map.getPane("parkingPane").querySelectorAll("path.leaflet-interactive");
    assert(paths.length === 49, `Rendered paths: ${paths.length}`);
    assert(core.map.getPane("parkingPane").querySelectorAll("pattern").length === 2, "Hatch patterns missing");
  });
  await check("Concurrent building retries issue one fetch and never duplicate markers", async () => {
    let requests = 0;
    window.fetch = (url, options) => { if (String(url).includes("gedung-upi")) requests++; return realFetch(url, options); };
    try {
      const first = data.retryLoadBuildings();
      const second = data.retryLoadBuildings();
      assert(first === second, "Retries were not deduplicated");
      await Promise.all([first, second]);
      assert(requests === 1, "Multiple GeoJSON requests");
      assert(core.buildingClusterGroup.getLayers().length === 77 && state.buildingMarkers.length === 77, "Duplicated markers");
    } finally { window.fetch = realFetch; }
  });
  await check("Failed building refresh preserves last valid map", async () => {
    window.fetch = () => Promise.resolve(new Response("missing", { status: 404 }));
    try {
      assert(await data.retryLoadBuildings() === false, "Failure unreported");
      assert(core.buildingClusterGroup.getLayers().length === 77, "Good markers lost");
      assert(document.getElementById("mapErrorOverlay").style.display === "flex", "No retry UI");
    } finally { window.fetch = realFetch; data.hideMapError(); }
  });
  await check("Search reveals a category hidden by visibility and chips", () => {
    visibility.toggleFilter("health");
    visibility.setCategoryVisible("academic", false);
    const target = state.buildings.find((building) => state.markersByName.get(building.name).categoryKey === "academic");
    document.getElementById("searchInput").value = target.name;
    search.searchBuilding();
    assert(core.buildingClusterGroup.hasLayer(state.markersByName.get(target.name)), "Search result still filtered out");
    assert(document.querySelector(".detail-building-name").textContent === target.name, "Detail not opened");
    state.activeFilters.clear();
    visibility.syncMarkersToFilter();
  });
  await check("Campus checkbox and opacity survive tab changes", () => {
    controls.toggleCampusTile({ checked: false }); controls.setCampusOpacity(0.35);
    sidebar.showTab("info"); sidebar.showTab("layers");
    assert(!document.getElementById("campusTileToggle").checked, "Campus checkbox reset");
    assert(document.querySelector('input[type="range"]').value === "0.35", "Opacity reset");
    controls.toggleCampusTile({ checked: true }); controls.setCampusOpacity(0.95);
  });
  await check("Master marker toggle removes/restores markers and checkbox state", () => {
    controls.toggleBuildingMarkers({ checked: false });
    assert(core.buildingClusterGroup.getLayers().length === 0, "Master off left markers");
    sidebar.showTab("info"); sidebar.showTab("layers");
    assert(!document.getElementById("allMarkersToggle").checked, "Master checkbox reset");
    controls.toggleBuildingMarkers({ checked: true });
    assert(core.buildingClusterGroup.getLayers().length === 77, "Master on lost markers");
  });
  await check("Native Leaflet parking overlay and sidebar controls remain in sync", () => {
    core.map.removeLayer(core.parkingLayerGroup);
    sidebar.showTab("layers");
    assert(!document.getElementById("allParkingToggle").checked, "Parking checkbox not synced");
    parking.focusParkingItem(state.parkingItems[0].id);
    assert(core.map.hasLayer(core.parkingLayerGroup), "Parking focus failed to reveal overlay");
  });
  await check("Late parking refresh keeps selected building detail open", async () => {
    const name = state.buildings[0].name;
    detail.openBuildingDetail(name);
    await parking.loadParkingGeoJson();
    assert(document.querySelector(".detail-building-name")?.textContent === name, "Parking load replaced detail");
  });
  await check("Quoted HTML-like names are text and delegated buttons still work", () => {
    const original = state.buildings[0];
    const fixture = { ...original, name: `Gedung O'Brian "<img src=x>" 100%`, image: "", linkWeb: "javascript:alert(1)" };
    state.buildingsByName.set(fixture.name, fixture);
    detail.openBuildingDetail(fixture.name);
    assert(document.querySelector(".detail-building-name").textContent === fixture.name, "Name damaged");
    assert(!document.querySelector(".detail-building-name img"), "HTML executed");
    assert(!document.querySelector(".detail-btn-website"), "Unsafe URL rendered");
    document.querySelector("[data-back-locations]").click();
    assert(document.querySelectorAll("[data-building-name]").length === 77, "Delegated back button broken");
    state.buildingsByName.delete(fixture.name);
  });
  await check("Missing photo displays initials without leaving a broken image", async () => {
    const building = state.buildings.find((item) => item.name === "Perpustakaan UPI");
    detail.openBuildingDetail(building.name);
    const image = document.querySelector(".detail-img-wrap img");
    if (image && !image.complete) await new Promise((resolve) => {
      image.addEventListener("error", resolve, { once: true });
      image.addEventListener("load", resolve, { once: true });
    });
    assert(!image || getComputedStyle(image).display === "none", "Broken image not hidden");
    assert(getComputedStyle(document.querySelector(".detail-img-fallback")).display === "flex", "No initials fallback");
  });
  await check("Autocomplete uses keyboard-accessible buttons and opens details", () => {
    search.initSearchAutocomplete(); search.initSearchAutocomplete();
    const input = document.getElementById("searchInput");
    input.value = "asrama"; input.dispatchEvent(new Event("input", { bubbles: true }));
    const suggestions = document.querySelectorAll("#searchSuggestions button");
    assert(suggestions.length === 5, "Autocomplete wrong after repeated initialization");
    const name = suggestions[0].dataset.buildingName;
    suggestions[0].click();
    assert(document.querySelector(".detail-building-name").textContent === name, "Suggestion failed to open detail");
  });
  await check("Detail view hides browsing chrome and supports long content scrolling", () => {
    detail.openBuildingDetail("Asrama UPI A");
    assert(document.getElementById("sidebar").dataset.view === "detail", "Detail state not applied");
    assert(getComputedStyle(document.querySelector(".search-section")).display === "none", "Search crowds detail");
    assert(getComputedStyle(document.querySelector(".sidebar-tabs")).display === "none", "Tabs crowd detail");
    assert(document.querySelector(".detail-img-wrap").getBoundingClientRect().height >= 120, "Photo collapsed");
    const content = document.getElementById("sidebarContent");
    content.scrollTop = content.scrollHeight;
    const actions = document.querySelector(".detail-actions").getBoundingClientRect();
    const visible = content.getBoundingClientRect();
    assert(actions.bottom <= visible.bottom + 2, "Detail actions cannot be reached by scrolling");
  });
  await check("Direct parking click yields one bounded popup above mobile sheet", async () => {
    core.map.stop();
    state.parkingItems[0].layer.openPopup(state.parkingItems[0].layer.getBounds().getCenter());
    await new Promise((resolve) => setTimeout(resolve, 600));
    const popup = document.querySelector(".leaflet-popup");
    assert(popup && document.querySelectorAll(".leaflet-popup").length === 1, "Multiple/missing popups");
    const rect = popup.getBoundingClientRect();
    const toolbar = document.querySelector(".topbar").getBoundingClientRect();
    assert(rect.left >= -1 && rect.right <= innerWidth + 1, `Popup overflows horizontally ${rect.left}/${rect.right}`);
    assert(rect.top >= toolbar.bottom, `Popup behind toolbar ${rect.top}/${toolbar.bottom}`);
    if (innerWidth <= 700) {
      assert(document.getElementById("sidebar").classList.contains("closed"), "Mobile panel did not collapse");
      const sheet = document.getElementById("sidebar").getBoundingClientRect();
      assert(rect.bottom <= sheet.top, `Popup behind sheet ${rect.bottom}/${sheet.top}`);
    }
  });
  await check("Selecting building closes old popup and switches details cleanly", () => {
    detail.openBuildingDetail("Asrama UPI A");
    detail.openBuildingDetail("Gedung Isola (Rektorat UPI)");
    assert(document.querySelector(".detail-building-name").textContent === "Gedung Isola (Rektorat UPI)", "Stale building details");
    const oldPopup = document.querySelector(".leaflet-popup");
    assert(!oldPopup || getComputedStyle(oldPopup).visibility === "hidden", "Old popup covers details");
    assert(!document.getElementById("sidebar").classList.contains("closed"), "Detail sheet stayed closed");
    document.querySelector("[data-back-locations]").click();
    assert(document.getElementById("sidebar").dataset.view === "browse", "Back did not restore browsing");
    assert(getComputedStyle(document.querySelector(".search-section")).display !== "none", "Search not restored");
  });
  await check("Responsive toolbar and sidebar fit viewport without horizontal overflow", () => {
    const toolbar = document.querySelector(".topbar").getBoundingClientRect();
    const sidebarRect = document.getElementById("sidebar").getBoundingClientRect();
    assert(toolbar.left >= 0 && toolbar.right <= innerWidth, "Toolbar outside viewport");
    assert(sidebarRect.left >= 0 && sidebarRect.right <= innerWidth, "Sidebar outside viewport");
    assert(document.documentElement.scrollWidth <= innerWidth, "Page horizontally overflows");
    const icons = [...document.querySelectorAll(".topbar-icon, .topbar-btn")].filter((element) => getComputedStyle(element).display !== "none");
    assert(icons.every((element) => element.getBoundingClientRect().right <= toolbar.right), "Toolbar actions clipped");
  });
  sidebar.showTab("locations");
  core.map.closePopup();
  const failed = results.filter((result) => result.startsWith("FAIL")).length;
  panel.textContent += `\n\n${results.length - failed}/${results.length} PASS`;
  panel.dataset.status = failed ? "failed" : "passed";
  document.title = `${failed ? "FAIL" : "PASS"}: WebGIS regression`;
} catch (error) {
  panel.textContent += `\nFATAL: ${error.stack}`;
  panel.dataset.status = "failed";
}
