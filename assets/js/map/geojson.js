// Validation and normalization are independent of Leaflet and the DOM.
import { safeWebUrl } from "./utils.js?v=2026.10.19";
import { optimizedPhotos } from "./photos.js?v=2026.10.19";

export function getFeatures(data) {
  if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("Data harus berupa GeoJSON FeatureCollection.");
  }
  return data.features;
}

export function isPosition(position) {
  return Array.isArray(position) && position.length >= 2 &&
    Number.isFinite(position[0]) && Number.isFinite(position[1]) &&
    Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90;
}

function isRing(ring) {
  return Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition) &&
    ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
}

export function isPolygonGeometry(geometry) {
  const polygon = (rings) => Array.isArray(rings) && rings.length > 0 && rings.every(isRing);
  return Boolean(geometry && (
    (geometry.type === "Polygon" && polygon(geometry.coordinates)) ||
    (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 && geometry.coordinates.every(polygon))
  ));
}

const text = (value) => typeof value === "string" ? value.trim() : "";

export function normalizeImagePath(value) {
  const path = text(value);
  // Campus photos are local assets. Reject protocols, traversal and markup.
  if (!path || /[:\\<>"'?#\s]/.test(path) || path.split("/").some((part) => !part || part === ".." || part === ".")) return "";
  if (!/\.(jpe?g|png|webp|gif)$/i.test(path)) return "";
  const localPath = path.startsWith("images/") ? path : path.includes("/") ? "" : `images/${path}`;
  return optimizedPhotos[localPath] || localPath;
}

export function parseBuildings(data) {
  const features = getFeatures(data);
  let skipped = 0;
  const buildings = [];
  for (const feature of features) {
    if (feature?.type !== "Feature" || feature.geometry?.type !== "Point" || !isPosition(feature.geometry.coordinates)) {
      skipped++;
      continue;
    }
    const p = feature.properties || {};
    const name = text(p.name) || text(p.Nama);
    if (!name) { skipped++; continue; }
    const [lng, lat] = feature.geometry.coordinates;
    const legacyImage = text(p.Gambar);
    buildings.push({
      name,
      searchName: name.toLocaleLowerCase("id"),
      category: text(p.category) || text(p.Kategori) || "Fasilitas",
      description: text(p.description) || text(p.Deskripsi),
      image: normalizeImagePath(p.image || (legacyImage && (/\.[a-z]+$/i.test(legacyImage) ? legacyImage : `${legacyImage}.jpg`))),
      hours: text(p.hours),
      floors: Number.isFinite(Number(p.floors)) && Number(p.floors) > 0 ? Number(p.floors) : null,
      phone: text(p.phone),
      facilities: Array.isArray(p.facilities) ? p.facilities.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [],
      linkWeb: safeWebUrl(p.LinkWeb || p.linkWeb),
      coords: [lat, lng]
    });
  }
  if (!buildings.length) throw new Error("Tidak ada titik gedung yang valid dalam GeoJSON.");
  return { buildings, skipped };
}

export async function fetchGeoJson(url, { timeout = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const data = await response.json();
    getFeatures(data);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`Waktu pemuatan ${url} habis. Silakan coba lagi.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
