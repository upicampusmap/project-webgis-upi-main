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
  await import("../assets/js/map/main.js?v=2026.10.19.5");
  const state = await import("../assets/js/map/state.js?v=2026.10.19.5");
  const core = await import("../assets/js/map/mapCore.js?v=2026.10.19.5");
  const data = await import("../assets/js/map/buildingsData.js?v=2026.10.19.5");
  const parking = await import("../assets/js/map/parking.js?v=2026.10.19.5");
  const sidebar = await import("../assets/js/map/sidebar.js?v=2026.10.19.5");
  const visibility = await import("../assets/js/map/markerVisibility.js?v=2026.10.19.5");
  const controls = await import("../assets/js/map/mapControls.js?v=2026.10.19.5");
  const detail = await import("../assets/js/map/buildingDetail.js?v=2026.10.19.5");
  const search = await import("../assets/js/map/search.js?v=2026.10.19.5");
  const { campusBounds } = await import("../assets/js/map/config.js?v=2026.10.19.5");
  const layout = await import("../assets/js/map/layout.js?v=2026.10.19.5");
  const { initCategoryScroll } = await import("../assets/js/map/categoryScroll.js?v=2026.10.19.5");
  function assertCampusOverview() {
    const { paddingTopLeft: topLeft, paddingBottomRight: bottomRight } = layout.getMapPadding();
    const size = core.map.getSize();
    const center = core.map.latLngToContainerPoint(campusBounds.getCenter());
    const expected = L.point((topLeft[0] + size.x - bottomRight[0]) / 2, (topLeft[1] + size.y - bottomRight[1]) / 2);
    assert(center.distanceTo(expected) <= 2, `Campus off-center: ${center.distanceTo(expected).toFixed(1)}px`);
    const nw = core.map.latLngToContainerPoint(campusBounds.getNorthWest());
    const se = core.map.latLngToContainerPoint(campusBounds.getSouthEast());
    assert(nw.x >= topLeft[0] - 1 && nw.y >= topLeft[1] - 1 && se.x <= size.x - bottomRight[0] + 1 && se.y <= size.y - bottomRight[1] + 1, "Campus clipped by panel/toolbar");
  }
  await check("Initial campus view is centered and fits the unobstructed map area", assertCampusOverview);
  await check("Building categories and all parking groups start collapsed", () => {
    const headers = [...document.querySelectorAll("[data-category-group], [data-parking-group]")];
    assert(headers.length > 0, "Category headings missing");
    assert(headers.every((button) => button.getAttribute("aria-expanded") === "false" && document.getElementById(button.getAttribute("aria-controls"))?.hidden), "A group starts expanded");
    assert([...document.querySelectorAll("[data-building-name], [data-parking-id]")].every((row) => row.getClientRects().length === 0), "Location rows visible before opening headings");
    assert(core.buildingClusterGroup.getLayers().length === 77, "Collapsing lists hides map markers");
  });
  await check("Mobile starts at a quarter screen with reachable search/tabs and expands on demand", () => {
    if (!layout.isMobileLayout()) return;
    const sheet = document.getElementById("sidebar");
    const header = sheet.querySelector(".mobile-sheet-header");
    const input = document.getElementById("searchInput");
    const assertCompact = () => {
      const rect = sheet.getBoundingClientRect();
      const safeBottom = parseFloat(getComputedStyle(sheet).paddingBottom) || 0;
      const expected = Math.max(innerHeight * .25, 146 + safeBottom);
      assert(Math.abs(rect.height - expected) <= 2, `Compact panel height ${rect.height}, expected ${expected}`);
      assert(header.getAttribute("aria-expanded") === "false" && header.textContent.includes("Perbesar"), "No clear expand action");
      assert(getComputedStyle(document.getElementById("sidebarContent")).display === "none", "Full list crowds compact mode");
      for (const element of [input, ...sheet.querySelectorAll(".sidebar-tabs button")]) {
        const control = element.getBoundingClientRect();
        assert(control.top >= rect.top && control.bottom <= rect.bottom - safeBottom + 1 && control.height >= 44, "A compact control is clipped or too small");
      }
      assert(Math.abs(layout.getMapPadding().paddingBottomRight[1] - rect.height - 16) <= 1, "Map padding ignores compact height");
    };
    assertCompact();
    // Async layer/filter refreshes must not expand the user's compact sheet.
    sidebar.renderActiveSidebarTab();
    assertCompact();
    header.click();
    assert(sheet.dataset.sheetSize === "expanded" && sheet.offsetHeight > innerHeight * .45, "Expand action failed");
    assert(header.getAttribute("aria-expanded") === "true" && !document.getElementById("sidebarContent").hasAttribute("inert"), "Expanded content inaccessible");
    header.click();
    assertCompact();
    sheet.querySelector('[data-tab="layers"]').click();
    assert(sheet.dataset.sheetSize === "expanded" && document.getElementById("allMarkersToggle"), "Layer tab did not reveal its content");
    header.click();
    input.focus();
    assert(sheet.dataset.sheetSize === "expanded" && document.body.dataset.searchFocused === "true", "Search did not expand for suggestions");
    input.blur();
    sidebar.showTab("locations");
  });
  const realFetch = window.testOriginalFetch;
  if (new URLSearchParams(location.search).has("parking-failure")) {
    await check("Partial parking failure preserves car polygons and shows retry", () => {
      assert(state.parkingItems.length === 46, "Car layer missing or motor was loaded");
      assert(document.querySelector(".data-status").textContent.includes("gagal"), "Failure appears as permanent loading");
      assert(!document.querySelector(".data-status").closest("[hidden]"), "Parking retry hidden inside collapsed group");
    });
    window.fetch = realFetch;
    await parking.loadParkingGeoJson();
    await check("Retry loads failed type without duplicating successful type", () => {
      assert(state.parkingItems.length === 49, "Retry duplicated parking");
      assert(core.parkingLayerGroup.getLayers().length === 2, "Parking groups duplicated");
    });
  }
  await check("Mouse wheel scrolls category chips horizontally without trapping edges or zoom", () => {
    const container = document.getElementById("sidebarContent");
    initCategoryScroll(container); initCategoryScroll(container);
    const bar = container.querySelector(".filter-chips-bar");
    assert(bar.scrollWidth > bar.clientWidth, "Chip bar does not overflow");
    bar.scrollLeft = 0;
    const wheel = (options) => {
      const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, ...options });
      bar.dispatchEvent(event);
      return event;
    };
    assert(wheel({ deltaY: 80 }).defaultPrevented && Math.abs(bar.scrollLeft - 80) <= 1, "Wheel not converted, or duplicate listeners installed");
    const beforeLine = bar.scrollLeft;
    wheel({ deltaY: 1, deltaMode: 1 });
    assert(Math.abs(bar.scrollLeft - beforeLine - 16) <= 1, "Wheel line units ignored");
    const beforeZoom = bar.scrollLeft;
    assert(!wheel({ deltaY: 80, ctrlKey: true }).defaultPrevented && bar.scrollLeft === beforeZoom, "Browser zoom intercepted");
    assert(!wheel({ deltaX: 60 }).defaultPrevented, "Native horizontal trackpad gesture intercepted");
    bar.scrollLeft = bar.scrollWidth;
    assert(!wheel({ deltaY: 100 }).defaultPrevented, "End of bar traps vertical sidebar scrolling");
    bar.scrollLeft = 0;
    assert(!wheel({ deltaY: -100 }).defaultPrevented, "Start of bar traps vertical sidebar scrolling");
  });
  await check("Dragging chips scrolls without selecting filters; a normal click still selects", () => {
    const bar = document.querySelector(".filter-chips-bar");
    const button = bar.querySelector('[data-filter-category="academic"]');
    const rect = bar.getBoundingClientRect();
    const pointer = (target, type, x, buttons) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 91, pointerType: "mouse", isPrimary: true,
      button: 0, buttons, clientX: x, clientY: rect.top + 10
    }));
    const center = core.map.getCenter();
    const filters = [...state.activeFilters].join(",");
    pointer(button, "pointerdown", rect.left + 180, 1);
    pointer(window, "pointermove", rect.left + 60, 1);
    assert(bar.scrollLeft >= 119 && bar.classList.contains("is-dragging"), "Mouse drag did not scroll");
    pointer(window, "pointerup", rect.left + 60, 0);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    button.dispatchEvent(click);
    assert(click.defaultPrevented && [...state.activeFilters].join(",") === filters, "Drag accidentally toggled a filter");
    assert(!bar.classList.contains("is-dragging") && core.map.getCenter().equals(center), "Drag stuck or moved the map");
    pointer(button, "pointerdown", rect.left + 100, 1);
    pointer(window, "pointerup", rect.left + 100, 0);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    const updatedBar = document.querySelector(".filter-chips-bar");
    assert(state.activeFilters.has("academic") && updatedBar.querySelector('[data-filter-category="academic"]').getAttribute("aria-pressed") === "true", "Normal click failed after dragging");
    assert(Math.abs(updatedBar.scrollLeft - 120) <= 1, "Selecting filter reset chip scroll position");
    visibility.toggleFilter("all");
  });
  await check("Chip gestures survive rerender, cancel cleanly and leave native touch/keyboard working", () => {
    let bar = document.querySelector(".filter-chips-bar");
    bar.scrollLeft = 180;
    visibility.toggleCategoryGroup("academic");
    bar = document.querySelector(".filter-chips-bar");
    assert(Math.abs(bar.scrollLeft - 180) <= 1, "Category rerender reset chip scroll");
    visibility.toggleCategoryGroup("academic");
    bar = document.querySelector(".filter-chips-bar");
    const button = bar.querySelector('[data-filter-category="academic"]');
    const y = bar.getBoundingClientRect().top + 10;
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 92, pointerType: "mouse", button: 0, buttons: 1, clientX: 200, clientY: y }));
    window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 92, pointerType: "mouse", buttons: 1, clientX: 100, clientY: y }));
    window.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 92 }));
    assert(!bar.classList.contains("is-dragging"), "Cancelled drag leaves grabbing state");
    const beforeTouch = bar.scrollLeft;
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 93, pointerType: "touch", buttons: 1, clientX: 200, clientY: y }));
    const touchMove = new PointerEvent("pointermove", { cancelable: true, pointerId: 93, pointerType: "touch", buttons: 1, clientX: 50, clientY: y });
    window.dispatchEvent(touchMove);
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 93 }));
    assert(!touchMove.defaultPrevented && bar.scrollLeft === beforeTouch, "Native touch scrolling intercepted");
    button.click(); // Keyboard/assistive click has detail=0.
    assert(state.activeFilters.has("academic"), "Keyboard/assistive click blocked");
    visibility.toggleFilter("all");
    bar = document.querySelector(".filter-chips-bar");
    const hybridButton = bar.querySelector('[data-filter-category="academic"]');
    hybridButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 94, pointerType: "mouse", button: 0, buttons: 1, clientX: 200, clientY: y }));
    window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 94, pointerType: "mouse", buttons: 1, clientX: 100, clientY: y }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 94 })); // No click: mouse released outside the bar.
    hybridButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 95, pointerType: "touch" }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 95, pointerType: "touch" }));
    hybridButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    assert(state.activeFilters.has("academic"), "Touch tap after mouse drag swallowed on hybrid device");
    visibility.toggleFilter("all");
    document.querySelector(".filter-chips-bar").scrollLeft = 0;
  });
  await check("Clicking a building heading opens only its list and preserves it on data refresh", async () => {
    const id = document.querySelector("[data-category-group]").id;
    const key = document.getElementById(id).dataset.categoryGroup;
    document.getElementById(id).click();
    assert(document.getElementById(id).getAttribute("aria-expanded") === "true", "Heading did not open");
    assert(!document.getElementById(document.getElementById(id).getAttribute("aria-controls")).hidden, "Building list still hidden");
    assert(document.activeElement.id === id, "Heading loses keyboard focus on rerender");
    assert([...document.querySelectorAll("[data-category-group]")].filter((button) => button.id !== id).every((button) => button.getAttribute("aria-expanded") === "false"), "Other categories opened too");
    await data.retryLoadBuildings();
    assert(state.categoryPanelState[key] === true && document.getElementById(id).getAttribute("aria-expanded") === "true", "Refresh reset the chosen category");
    document.getElementById(id).click();
    assert(document.getElementById(id).getAttribute("aria-expanded") === "false", "Heading did not close");
  });
  await check("Parking parent reveals type headings; each type opens only after a click", () => {
    const click = (type) => document.getElementById(`parking-${type}-toggle`).click();
    click("main");
    assert(!document.getElementById("parking-main-items").hidden, "Parking parent stayed hidden");
    for (const type of ["car", "motor"]) {
      assert(document.getElementById(`parking-${type}-toggle`).getAttribute("aria-expanded") === "false", "Parking child auto-expanded");
      assert(document.getElementById(`parking-${type}-items`).hidden, "Parking rows appeared without a click");
    }
    click("car");
    assert(!document.getElementById("parking-car-items").hidden && document.getElementById("parking-car-items").querySelectorAll("[data-parking-id]").length === 46, "Car list did not open");
    assert(document.getElementById("parking-motor-items").hidden, "Motor list opened with car list");
    click("car"); click("motor");
    assert(!document.getElementById("parking-motor-items").hidden && document.getElementById("parking-motor-items").querySelectorAll("[data-parking-id]").length === 3, "Motor list did not open");
    click("main"); click("main");
    assert(!document.getElementById("parking-motor-items").hidden, "Parent toggle lost chosen child state");
    click("motor"); click("main");
    assert(Object.values(state.parkingPanelState).every((open) => open === false), "Parking groups failed to close");
  });
  await check("Layer visibility controls do not expand collapsed lists", () => {
    const id = document.querySelector("[data-category-group]").id;
    const eye = () => document.getElementById(id).closest(".category-group-header").querySelector(".category-visibility-toggle").click();
    eye();
    assert(document.getElementById(id).getAttribute("aria-expanded") === "false", "Marker visibility expanded category");
    eye();
    assert(core.buildingClusterGroup.getLayers().length === 77, "Marker visibility did not restore markers");
    const parkingEye = () => document.getElementById("parking-main-toggle").closest(".category-group-header").querySelector(".category-visibility-toggle").click();
    parkingEye();
    assert(state.parkingPanelState.main === false, "Parking visibility expanded list");
    parkingEye();
    assert(core.parkingLayerGroup.getLayers().length === 2 && state.parkingPanelState.main === false, "Parking visibility failed to restore layers independently");
  });
  await check("GPS outside campus restores controls without leaving campus", async () => {
    const geolocation = await import("../assets/js/map/geolocation.js?v=2026.10.19.5");
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    core.map.setView(core.map.getCenter(), core.map.getZoom(), { animate: false });
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
    const geolocation = await import("../assets/js/map/geolocation.js?v=2026.10.19.5");
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
  await check("Clear search removes selected text, suggestions and messages while retaining focus", () => {
    sidebar.showTab("locations");
    const input = document.getElementById("searchInput");
    const clear = document.getElementById("clearSearchBtn");
    assert(input.value && !clear.hidden, "Clear button missing after choosing a suggestion");
    search.showSearchMessage("Test message", "warning");
    clear.click();
    assert(input.value === "" && clear.hidden, "Clear button did not reset input/state");
    assert(document.activeElement === input, "Input focus lost after clearing");
    assert(input.getAttribute("aria-expanded") === "false" && !document.querySelector("#searchSuggestions button"), "Stale suggestions remain");
    assert(getComputedStyle(document.getElementById("searchMessage")).display === "none", "Stale search message remains");
    input.value = "asrama"; input.dispatchEvent(new Event("input", { bubbles: true }));
    assert(!clear.hidden && document.querySelectorAll("#searchSuggestions button").length === 5, "Searching again after clearing failed");
    const bounds = clear.getBoundingClientRect();
    assert(bounds.width >= 44 && bounds.height >= 44, "Clear touch target is too small");
    input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true }));
    assert(clear.hidden, "Clear button remains after manual deletion");
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
  await check("Mobile can shrink details and start a new search without hiding the input", () => {
    if (!layout.isMobileLayout()) return;
    const sheet = document.getElementById("sidebar");
    const header = sheet.querySelector(".mobile-sheet-header");
    header.click();
    assert(sheet.dataset.sheetSize === "compact", "Detail did not shrink");
    const input = document.getElementById("searchInput");
    input.focus();
    assert(sheet.dataset.sheetSize === "expanded" && sheet.dataset.view === "browse", "Search brought back old details");
    assert(document.activeElement === input && getComputedStyle(input.closest(".search-section")).display !== "none", "Focused search input disappeared");
    input.value = "asrama";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert(document.querySelectorAll("#searchSuggestions button").length === 5, "New suggestions unavailable");
    const suggestions = document.getElementById("searchSuggestions").getBoundingClientRect();
    assert(suggestions.bottom <= sheet.getBoundingClientRect().bottom + 1, "Suggestions clipped below the sheet");
    document.getElementById("clearSearchBtn").click();
    input.blur();
  });
  await check("Direct parking click yields one bounded popup above mobile sheet", async () => {
    core.map.setView(core.map.getCenter(), core.map.getZoom(), { animate: false });
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
  await check("Reset recenters the campus and closes competing parking popups", async () => {
    sidebar.showTab("locations");
    document.getElementById("searchInput").blur();
    const layer = state.parkingItems[0].layer;
    layer.openPopup(layer.getBounds().getCenter());
    const popup = layer.getPopup();
    controls.resetMap();
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert(!popup.isOpen(), "Parking popup remains open after reset");
    assertCampusOverview();
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
