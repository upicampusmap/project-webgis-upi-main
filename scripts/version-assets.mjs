// Keep every import of a shared map module on the same cache key.
// Run before a release: node scripts/version-assets.mjs 2026.10.18
import { readFile, writeFile, readdir } from "node:fs/promises";

const version = process.argv[2];
if (!version || !/^\d{4}\.\d{2}\.\d{2}(?:\.\d+)?$/.test(version)) {
  throw new Error("Gunakan versi YYYY.MM.DD atau YYYY.MM.DD.N");
}
const root = new URL("../", import.meta.url);
const modules = (await readdir(new URL("assets/js/map/", root)))
  .filter((name) => name.endsWith(".js")).map((name) => `assets/js/map/${name}`);
const tests = (await readdir(new URL("tests/", root)))
  .filter((name) => name.endsWith(".mjs")).map((name) => `tests/${name}`);
for (const path of [...modules, ...tests, "assets/js/bootstrap.js", "tests/browser-regression.js"]) {
  const file = new URL(path, root);
  const source = await readFile(file, "utf8");
  const updated = source.replace(
    /(\bfrom\s*["']|\bimport\s*\(\s*["'])(\.{1,2}\/[^"'?]+\.js)(?:\?v=[^"']*)?(["'])/g,
    (_, prefix, target, quote) => `${prefix}${target}?v=${version}${quote}`
  );
  if (updated !== source) await writeFile(file, updated);
}
for (const path of ["index.html", "map.html", "tests/browser.html"]) {
  const file = new URL(path, root);
  const source = await readFile(file, "utf8");
  const updated = source
    .replace(/((?:src|href)=["'](?:assets|tests)\/[^"'?]+\.(?:js|css))(?:\?v=[^"']*)?(["'])/g, `$1?v=${version}$2`)
    .replace(/(name="application-version" content=")[^"]+("\s*\/?>)/, `$1${version}$2`);
  if (updated !== source) await writeFile(file, updated);
}
console.log(`Asset version: ${version}`);
