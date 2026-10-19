import { buildings } from "./state.js?v=2026.10.19.2";
import { getIconConfigByCategory } from "./categories.js?v=2026.10.19.2";
import { openBuildingDetail } from "./buildingDetail.js?v=2026.10.19.2";
import { escapeHtml } from "./utils.js?v=2026.10.19.2";

let initialized = false;
let messageTimer;

function syncClearButton() {
  const button = document.getElementById("clearSearchBtn");
  if (button) button.hidden = !document.getElementById("searchInput")?.value.length;
}

export function hideSuggestions() {
  const element = document.getElementById("searchSuggestions");
  if (element) { element.replaceChildren(); element.style.display = "none"; }
  document.getElementById("searchInput")?.setAttribute("aria-expanded", "false");
}

export function showSearchMessage(text, type) {
  const message = document.getElementById("searchMessage");
  if (!message) return;
  clearTimeout(messageTimer);
  message.textContent = text;
  message.className = `search-message search-message-${type}`;
  message.style.display = "block";
  messageTimer = setTimeout(hideSearchMessage, 4000);
}

export function hideSearchMessage() {
  clearTimeout(messageTimer);
  const element = document.getElementById("searchMessage");
  if (element) element.style.display = "none";
}

export function initSearchAutocomplete() {
  if (initialized) return;
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("searchSuggestions");
  if (!input || !suggestions) return;
  initialized = true;
  const clearButton = document.getElementById("clearSearchBtn");
  // Keep the mobile keyboard open when clearing an already focused input.
  clearButton?.addEventListener("pointerdown", (event) => event.preventDefault());
  clearButton?.addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus({ preventScroll: true });
  });
  input.addEventListener("focus", syncClearButton);
  syncClearButton();
  input.addEventListener("input", () => {
    syncClearButton();
    hideSearchMessage();
    const keyword = input.value.toLocaleLowerCase("id").trim();
    if (keyword.length < 2) { hideSuggestions(); return; }
    const matches = buildings.filter((building) => building.searchName.includes(keyword)).slice(0, 7);
    if (!matches.length) { hideSuggestions(); return; }
    suggestions.innerHTML = matches.map((building) => {
      const icon = getIconConfigByCategory(building.category, building.name);
      return `<button type="button" class="search-suggestion-item" data-building-name="${escapeHtml(building.name)}">
        <span class="suggestion-icon" style="background:${icon.color}"><i class="fa-solid ${icon.icon}"></i></span>
        <span class="suggestion-text"><span class="suggestion-name">${escapeHtml(building.name)}</span>
          <span class="suggestion-cat">${escapeHtml(building.category)}</span></span>
      </button>`;
    }).join("");
    suggestions.style.display = "block";
    input.setAttribute("aria-expanded", "true");
  });
  suggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-building-name]");
    if (button) selectSuggestion(button.dataset.buildingName);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); searchBuilding(); }
    if (event.key === "Escape") hideSuggestions();
    if (event.key === "ArrowDown") { event.preventDefault(); suggestions.querySelector("button")?.focus(); }
  });
  suggestions.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { hideSuggestions(); input.focus(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const sibling = event.key === "ArrowDown" ? event.target.nextElementSibling : event.target.previousElementSibling;
      (sibling || input).focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-section")) hideSuggestions();
  });
  document.querySelector(".search-section")?.addEventListener("focusout", (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) hideSuggestions();
  });
}

export function selectSuggestion(name) {
  document.getElementById("searchInput").value = name;
  syncClearButton();
  hideSuggestions();
  hideSearchMessage();
  openBuildingDetail(name);
}

export function searchBuilding() {
  syncClearButton();
  const keyword = document.getElementById("searchInput").value.toLocaleLowerCase("id").trim();
  hideSuggestions();
  if (!keyword) { showSearchMessage("Masukkan nama gedung terlebih dahulu.", "warning"); return; }
  const result = buildings.find((building) => building.searchName === keyword) ||
    buildings.find((building) => building.searchName.includes(keyword));
  if (result) { hideSearchMessage(); openBuildingDetail(result.name); }
  else showSearchMessage("Gedung tidak ditemukan. Coba kata kunci lain.", "error");
}
