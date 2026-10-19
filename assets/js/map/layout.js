import { map } from "./mapCore.js?v=2026.10.19.2";
import { sidebarState } from "./state.js?v=2026.10.19.2";
import { requestSidebarRender } from "./uiEvents.js?v=2026.10.19.2";

export function isMobileLayout() {
  return window.matchMedia("(max-width: 700px)").matches;
}

export function updateMobileSheetTitle(title) {
  const element = document.getElementById("mobileSheetTitle");
  if (element && title) element.textContent = title;
}

export function setSidebarView(view) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  sidebar.dataset.view = view;
  document.body.dataset.sidebarView = view;
}

export function updateSidebarChrome() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  const closed = sidebar.classList.contains("closed");
  document.querySelectorAll("#sidebarToggle, .mobile-sheet-header").forEach((button) => {
    button.setAttribute("aria-expanded", String(!closed));
  });
  for (const selector of [".search-section", ".sidebar-tabs", ".sidebar-content", ".sidebar-footer"]) {
    sidebar.querySelector(selector)?.toggleAttribute("inert", closed);
  }
  const icon = document.getElementById("toggleIcon");
  if (icon) icon.className = `fa-solid fa-chevron-${isMobileLayout() ? (closed ? "up" : "down") : (closed ? "right" : "left")}`;
  const action = document.getElementById("mobileSheetAction");
  if (action) action.textContent = closed ? "Buka panel" : "Perkecil";
  const sheetIcon = document.getElementById("mobileSheetIcon");
  if (sheetIcon) sheetIcon.className = `fa-solid fa-chevron-${closed ? "up" : "down"}`;
  if (activePopup) positionPopup(activePopup);
}

export function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  if (sidebar.classList.contains("closed")) {
    map.closePopup();
    openSidebar();
  } else closeSidebar();
}

export function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  if (sidebar.contains(document.activeElement)) {
    const button = isMobileLayout() ? sidebar.querySelector(".mobile-sheet-header") : document.getElementById("sidebarToggle");
    button?.focus({ preventScroll: true });
  }
  sidebar.classList.add("closed");
  updateSidebarChrome();
}

export function openSidebar() {
  document.getElementById("sidebar")?.classList.remove("closed");
  updateSidebarChrome();
}

export function getMapPadding() {
  const sidebar = document.getElementById("sidebar");
  const closed = !sidebar || sidebar.classList.contains("closed");
  const toolbar = document.querySelector(".topbar");
  const top = toolbar ? toolbar.offsetTop + toolbar.offsetHeight : 70;
  const mobile = isMobileLayout();
  const safeBottom = sidebar ? parseFloat(getComputedStyle(sidebar).paddingBottom) || 0 : 0;
  const peek = sidebar?.querySelector(".mobile-sheet-header")?.offsetHeight || 64;
  return {
    paddingTopLeft: [mobile || closed ? 16 : sidebar.offsetLeft + sidebar.offsetWidth + 16, top + 16],
    paddingBottomRight: [16, mobile ? (closed ? peek + safeBottom : sidebar.offsetHeight) + 16 : 24]
  };
}

let activePopup = null;
let popupFrame;
function positionPopup(popup) {
  cancelAnimationFrame(popupFrame);
  popupFrame = requestAnimationFrame(() => {
    if (popup !== activePopup || !popup.isOpen()) return;
    const element = popup.getElement();
    if (!element) return;
    const { paddingTopLeft, paddingBottomRight } = getMapPadding();
    const rect = element.getBoundingClientRect();
    const mapRect = map.getContainer().getBoundingClientRect();
    const left = mapRect.left + paddingTopLeft[0];
    const right = mapRect.right - paddingBottomRight[0];
    const top = mapRect.top + paddingTopLeft[1];
    const bottom = mapRect.bottom - paddingBottomRight[1];
    const dx = Math.min(0, rect.left - left) + Math.max(0, rect.right - right);
    const dy = Math.min(0, rect.top - top) + Math.max(0, rect.bottom - bottom);
    // Measure the actual popup, including Leaflet offsets and the current zoom.
    // An immediate correction avoids racing a still-finishing fly/zoom animation.
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([dx, dy], { animate: false });
  });
}

export function initLayout() {
  const search = document.querySelector(".search-section");
  search?.addEventListener("focusin", () => { document.body.dataset.searchFocused = "true"; });
  search?.addEventListener("focusout", (event) => {
    if (!search.contains(event.relatedTarget)) document.body.dataset.searchFocused = "false";
  });
  map.on("popupopen", ({ popup }) => {
    // Freeze a flight without scheduling a CSS zoom snap that could undo GPS focus.
    map.setView(map.getCenter(), map.getZoom(), { animate: false });
    activePopup = popup;
    if (sidebarState.building) {
      sidebarState.building = null;
      requestSidebarRender();
    }
    document.body.dataset.popupOpen = "true";
    if (isMobileLayout()) closeSidebar();
    positionPopup(popup);
  });
  map.on("zoomend resize", () => { if (activePopup) positionPopup(activePopup); });
  map.on("popupclose", ({ popup }) => {
    if (activePopup !== popup) return;
    activePopup = null;
    cancelAnimationFrame(popupFrame);
    document.body.dataset.popupOpen = "false";
  });
  document.body.dataset.popupOpen = "false";
  setSidebarView("browse");
  updateSidebarChrome();
}
