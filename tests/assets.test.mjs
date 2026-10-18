import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { optimizedPhotos } from "../assets/js/map/photos.js?v=2026.10.18.1";
const root = new URL("../", import.meta.url);

test("Optimized photo manifest points to real WebP files and preserves originals", async () => {
  assert.equal(Object.keys(optimizedPhotos).length, 47);
  for (const [source, derivative] of Object.entries(optimizedPhotos)) {
    const original = await stat(new URL(source, root));
    const file = await readFile(new URL(derivative, root));
    assert.equal(file.subarray(0, 4).toString(), "RIFF");
    assert.equal(file.subarray(8, 12).toString(), "WEBP");
    assert.ok(file.length < original.size);
  }
});

test("Map modules have no missing local imports or circular dependencies", async () => {
  const base = new URL("assets/js/map/", root);
  const files = (await readdir(base)).filter((file) => file.endsWith(".js"));
  const graph = new Map();
  for (const file of files) {
    const code = await readFile(new URL(file, base), "utf8");
    const imports = [...code.matchAll(/from\s+["']\.\/([^"']+)["']/g)].map((match) => match[1].split("?")[0]);
    for (const imported of imports) assert.ok(files.includes(imported), `${file}: missing ${imported}`);
    graph.set(file, imports);
  }
  const visited = new Set();
  function visit(file, ancestors = []) {
    assert.ok(!ancestors.includes(file), `Circular dependency: ${[...ancestors, file].join(" -> ")}`);
    if (visited.has(file)) return;
    for (const dependency of graph.get(file)) visit(dependency, [...ancestors, file]);
    visited.add(file);
  }
  for (const file of files) visit(file);
});
