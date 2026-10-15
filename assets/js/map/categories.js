// =====================================================
// categories.js — Taksonomi kategori & resolusi ikon marker
// Tanggung jawab: konfigurasi kategori + memetakan gedung ke
// kategori/ikon, serta mengelompokkan gedung per kategori.
// =====================================================
import { buildings, groupedBuildings } from "./state.js";

export const categoryIconStyles = {
  academic: {
    key: "academic",
    icon: "fa-graduation-cap",
    color: "#175b9f",
    label: "Akademik & Administrasi"
  },
  facilities: {
    key: "facilities",
    icon: "fa-building-columns",
    color: "#64748b",
    label: "Fasilitas Kampus"
  },
  housing: {
    key: "housing",
    icon: "fa-house-chimney",
    color: "#7c3aed",
    label: "Kehidupan Mahasiswa & Asrama"
  },
  mosque: {
    key: "mosque",
    icon: "fa-mosque",
    color: "#0f766e",
    label: "Ibadah"
  },
  athletics: {
    key: "athletics",
    icon: "fa-person-running",
    color: "#ea580c",
    label: "Olahraga & Rekreasi"
  },
  labschool: {
    key: "labschool",
    icon: "fa-user-graduate",
    color: "#2563eb",
    label: "Labschool UPI"
  },
  health: {
    key: "health",
    icon: "fa-stethoscope",
    color: "#dc2626",
    label: "Kesehatan"
  },
  culinary: {
    key: "culinary",
    icon: "fa-utensils",
    color: "#b45309",
    label: "Kuliner"
  },
  sanitasi: {
    key: "sanitasi",
    icon: "fa-restroom",
    color: "#0ea5e9",
    label: "Sanitasi & Toilet"
  },
  services: {
    key: "services",
    icon: "fa-copy",
    color: "#7c3aed",
    label: "Layanan Kampus"
  },
  banking: {
    key: "banking",
    icon: "fa-landmark",
    color: "#475569",
    label: "Layanan & Perbankan"
  }
};

export const categoryDisplayOrder = [
  "academic",
  "facilities",
  "housing",
  "mosque",
  "athletics",
  "labschool",
  "health",
  "culinary",
  "sanitasi",
  "services",
  "banking"
];

function normalizeCategoryText(category, name) {
  return `${category || ""} ${name || ""}`.toLowerCase();
}

export function getIconConfigByCategory(category, name) {
  const text = normalizeCategoryText(category, name);
  const categoryText = `${category || ""}`.toLowerCase();

  if (text.includes("sanitasi") || text.includes("toilet") || /\bwc\b/.test(text) || text.includes("restroom")) {
    return categoryIconStyles.sanitasi;
  }

  if (text.includes("masjid") || text.includes("al-furqon") || text.includes("musala") || text.includes("ibadah")) {
    return categoryIconStyles.mosque;
  }

  if (text.includes("perbankan") || /\b(atm|bni|bri|mandiri)\b/.test(text) || categoryText.includes("perbankan")) {
    return categoryIconStyles.banking;
  }

  if (text.includes("fotokopi") || text.includes("print") || categoryText === "layanan") {
    return categoryIconStyles.services;
  }

  if (text.includes("labschool") || text.includes("laboratorium school") || text.includes("school") || text.includes("sd lab") || text.includes("smp lab") || text.includes("sma lab") || text.includes("tk lab")) {
    return categoryIconStyles.labschool;
  }

  if (text.includes("asrama") || text.includes("housing") || text.includes("student life")) {
    return categoryIconStyles.housing;
  }

  if (["pendidikan", "administrasi", "lembaga", "landmark"].some((term) => categoryText.includes(term))) {
    return categoryIconStyles.academic;
  }

  if (text.includes("kesehatan") || text.includes("poliklinik") || text.includes("health")) {
    return categoryIconStyles.health;
  }

  if (text.includes("kuliner") || text.includes("kantin") || text.includes("culinary") || text.includes("coffee")) {
    return categoryIconStyles.culinary;
  }

  if (
    text.includes("olahraga") ||
    text.includes("athletics") ||
    text.includes("stadion") ||
    text.includes("gymnasium") ||
    text.includes("sport") ||
    text.includes("lapang") ||
    text.includes("tennis") ||
    text.includes("kolam renang") ||
    text.includes("golf")
  ) {
    return categoryIconStyles.athletics;
  }

  if (
    text.includes("fasilitas") ||
    text.includes("facilities") ||
    text.includes("layanan") ||
    text.includes("services")
  ) {
    return categoryIconStyles.facilities;
  }

  return categoryIconStyles.facilities;
}

export function getCategoryIconHtml(category, name, className) {
  const iconConfig = getIconConfigByCategory(category, name);

  return `
    <span
      class="${className}"
      style="--marker-color: ${iconConfig.color};"
      title="${iconConfig.label}"
    >
      <i class="fa-solid ${iconConfig.icon}"></i>
    </span>
  `;
}

const markerIcons = new Map();

export function getIconByCategory(category, name) {
  const config = getIconConfigByCategory(category, name);
  if (!markerIcons.has(config.key)) {
    markerIcons.set(config.key, L.divIcon({
      html: getCategoryIconHtml(category, name, "category-marker-inner"),
      className: "category-marker",
      iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -12]
    }));
  }
  return markerIcons.get(config.key);
}

export function getCategoryKeyByBuilding(building) {
  return getIconConfigByCategory(building.category, building.name).key;
}

// Rebuild only when data changes, not on every sidebar render/toggle.
export function rebuildCategoryGroups() {
  groupedBuildings.clear();
  for (const key of categoryDisplayOrder) groupedBuildings.set(key, []);
  for (const building of buildings) {
    const key = getCategoryKeyByBuilding(building);
    groupedBuildings.get(key).push(building);
  }
}

export function getGroupedBuildings() {
  return Object.fromEntries(groupedBuildings);
}

export function getVisibleCategoryKeys() {
  return categoryDisplayOrder.filter((key) => groupedBuildings.get(key)?.length > 0);
}
