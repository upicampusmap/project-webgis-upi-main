// =====================================================
// utils.js — Utilitas generik
// Tanggung jawab: helper string & notifikasi UI yang tidak
// terikat domain tertentu.
// =====================================================

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function safeWebUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function getInitials(name) {
  return (name || "?").split(" ").slice(0, 2).map(function(w) {
    return w[0] || "";
  }).join("").toUpperCase() || "?";
}

let toastTimer;
export function showToast(msg) {
  let toast = document.getElementById("toastMsg");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastMsg";
    toast.className = "toast-notification";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("toast-show");
  clearTimeout(toastTimer);
  toast.setAttribute("role", "status");
  toastTimer = setTimeout(function() { toast.classList.remove("toast-show"); }, 3000);
}
