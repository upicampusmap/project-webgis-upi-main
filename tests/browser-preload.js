// Test-only failure injection; production pages never load this file.
window.testOriginalFetch = window.fetch;
if (new URLSearchParams(location.search).has("parking-failure")) {
  window.fetch = (url, options) => String(url).includes("parkiran-motor.geojson")
    ? Promise.resolve(new Response("not found", { status: 404 }))
    : window.testOriginalFetch(url, options);
}
