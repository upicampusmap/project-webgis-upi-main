import { map } from "./mapCore.js";

export function isMobileLayout() {
  return window.matchMedia("(max-width: 700px)").matches;
}

export function updateMobileSheetTitle(title) {
  const sheetTitle = document.getElementById("mobileSheetTitle");

  if (sheetTitle && title) {
    sheetTitle.textContent = title;
  }
}

export function updateSidebarChrome() {
  const sidebar = document.getElementById("sidebar");
  const desktopIcon = document.getElementById("toggleIcon");
  const sheetAction = document.getElementById("mobileSheetAction");
  const sheetIcon = document.getElementById("mobileSheetIcon");
  if (!sidebar) return;
  const isClosed = sidebar.classList.contains("closed");
  document.querySelectorAll("#sidebarToggle, .mobile-sheet-header").forEach((button) => {
    button.setAttribute("aria-expanded", String(!isClosed));
  });
  for (const selector of [".search-section", ".sidebar-tabs", ".sidebar-content", ".sidebar-footer"]) {
    sidebar.querySelector(selector)?.toggleAttribute("inert", isClosed);
  }

  if (desktopIcon) {
    if (isMobileLayout()) {
      desktopIcon.className = isClosed ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
    } else {
      desktopIcon.className = isClosed ? "fa-solid fa-chevron-right" : "fa-solid fa-chevron-left";
    }
  }

  if (sheetAction) {
    sheetAction.textContent = isClosed ? "Tampilkan" : "Sembunyikan";
  }

  if (sheetIcon) {
    sheetIcon.className = isClosed ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
  }
}

export function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");

  sidebar.classList.toggle("closed");
  updateSidebarChrome();

  setTimeout(function() {
    map.invalidateSize();
  }, 300);
}

export function closeSidebar() {
  const sidebar = document.getElementById("sidebar");

  sidebar.classList.add("closed");
  updateSidebarChrome();

  setTimeout(function() {
    map.invalidateSize();
  }, 300);
}

export function openSidebar() {
  document.getElementById("sidebar")?.classList.remove("closed");
  updateSidebarChrome();
}

// Keep the selected point inside the part of the map not covered by UI.
export function getMapPadding() {
  const sidebar = document.getElementById("sidebar");
  const closed = sidebar?.classList.contains("closed");
  const top = document.querySelector(".topbar")?.offsetHeight || 58;
  const mobile = isMobileLayout();
  return {
    paddingTopLeft: [mobile || closed ? 24 : sidebar.offsetWidth + 24, top + 24],
    paddingBottomRight: [24, mobile ? (closed ? 52 : sidebar.offsetHeight) + 24 : 24]
  };
}
