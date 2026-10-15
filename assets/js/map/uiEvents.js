// Feature modules request a refresh; only main.js owns UI orchestration.
export function requestSidebarRender() {
  document.dispatchEvent(new Event("webgis:sidebar-refresh"));
}
