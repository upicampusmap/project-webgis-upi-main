// =====================================================
// config.js — Konstanta konfigurasi peta
// Tanggung jawab: menyediakan nilai konfigurasi global peta.
// =====================================================
export const campusBounds = L.latLngBounds(
  [-6.8651, 107.5867],
  [-6.8569, 107.5971]
);

export const INITIAL_CENTER = campusBounds.getCenter();
export const INITIAL_ZOOM = 17;
