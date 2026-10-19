import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getFeatures, parseBuildings, isPosition, isPolygonGeometry, normalizeImagePath, fetchGeoJson } from "../assets/js/map/geojson.js?v=2026.10.19.1";
import { escapeHtml, safeWebUrl } from "../assets/js/map/utils.js?v=2026.10.19.1";
import { getIconConfigByCategory, getCategoryKeyByBuilding, rebuildCategoryGroups, getGroupedBuildings } from "../assets/js/map/categories.js?v=2026.10.19.1";
import { buildings } from "../assets/js/map/state.js?v=2026.10.19.1";

const collection = (features) => ({ type: "FeatureCollection", features });
const point = (coordinates, properties = { name: "Gedung" }) => ({ type: "Feature", geometry: { type: "Point", coordinates }, properties });

test("Coordinates reject nulls, strings, non-finite and out-of-range values", () => {
  for (const value of [null, [], ["107", -6], [Infinity, -6], [181, 0], [107, -91]]) assert.equal(isPosition(value), false);
  assert.equal(isPosition([107.59, -6.86, 700]), true);
});

test("Bad collection fails; bad individual points are skipped without corrupting valid coordinates", () => {
  assert.throws(() => getFeatures({ features: [] }), /FeatureCollection/);
  const parsed = parseBuildings(collection([point([107, -6]), point([999, 0]), point([107, -6], { name: "" })]));
  assert.equal(parsed.skipped, 2);
  assert.deepEqual(parsed.buildings[0].coords, [-6, 107]);
  assert.throws(() => parseBuildings(collection([])), /valid/);
});

test("Optional/legacy properties are normalized instead of crashing the detail panel", () => {
  const [building] = parseBuildings(collection([point([107, -6], {
    Nama: "Gedung O'Brian 100%", Kategori: "Pendidikan", Gambar: "foto",
    facilities: "bukan array", floors: null, LinkWeb: "javascript:alert(1)"
  })])).buildings;
  assert.equal(building.name, "Gedung O'Brian 100%");
  assert.deepEqual(building.facilities, []);
  assert.equal(building.floors, null);
  assert.equal(building.linkWeb, "");
  assert.equal(building.image, "images/foto.jpg");
});

test("Polygon rings must be closed and contain valid WGS84 positions", () => {
  const ring = [[107, -6], [108, -6], [108, -7], [107, -6]];
  assert.equal(isPolygonGeometry({ type: "Polygon", coordinates: [ring] }), true);
  assert.equal(isPolygonGeometry({ type: "MultiPolygon", coordinates: [[ring]] }), true);
  assert.equal(isPolygonGeometry({ type: "Polygon", coordinates: [ring.slice(0, 3)] }), false);
  assert.equal(isPolygonGeometry({ type: "Point", coordinates: [107, -6] }), false);
});

test("HTML and external URL handling rejects executable content", () => {
  assert.equal(escapeHtml(`A'B"<img>&`), "A&#39;B&quot;&lt;img&gt;&amp;");
  for (const url of ["javascript:alert(1)", "data:text/html,test", "https://user:password@example.com", "/local"]) assert.equal(safeWebUrl(url), "");
  assert.equal(safeWebUrl("https://upi.edu/"), "https://upi.edu/");
  for (const path of ["../secret.jpg", "images/../a.jpg", "https://example.com/a.jpg", 'x".jpg', "data:image/png,test"]) assert.equal(normalizeImagePath(path), "");
});

test("All 77 campus points and 49 parking features validate; icons and groups agree", async () => {
  const raw = JSON.parse(await readFile(new URL("../data/gedung-upi-point.geojson", import.meta.url)));
  const parsed = parseBuildings(raw);
  assert.equal(parsed.skipped, 0);
  assert.equal(parsed.buildings.length, 77);
  buildings.splice(0, buildings.length, ...parsed.buildings);
  rebuildCategoryGroups();
  assert.equal(Object.values(getGroupedBuildings()).flat().length, 77);
  assert.equal(new Set(buildings.map((building) => building.name)).size, 77);
  for (const building of buildings) assert.equal(getCategoryKeyByBuilding(building), getIconConfigByCategory(building.category, building.name).key);
  assert.equal(getCategoryKeyByBuilding({ name: "Lapangan SMA Laboratorium School UPI", category: "Olahraga" }), "labschool");
  assert.equal(getCategoryKeyByBuilding({ name: "Tomoro Coffee", category: null }), "culinary");
  for (const [file, count] of [["parkiran-mobil", 46], ["parkiran-motor", 3]]) {
    const data = JSON.parse(await readFile(new URL(`../data/${file}.geojson`, import.meta.url)));
    assert.equal(getFeatures(data).length, count);
    assert.equal(data.features.every((feature) => isPolygonGeometry(feature.geometry)), true);
  }
});

test("fetch surfaces HTTP and timeout errors, always restoring the real fetch", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    await assert.rejects(fetchGeoJson("test.geojson"), /HTTP 404/);
    globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
    await assert.rejects(fetchGeoJson("slow.geojson", { timeout: 5 }), /habis/);
  } finally { globalThis.fetch = original; }
});
