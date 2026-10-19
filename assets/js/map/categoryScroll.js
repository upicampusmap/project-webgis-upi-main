// Delegate to the stable sidebar: filter bars are replaced on every render.
const initialized = new WeakSet();

export function initCategoryScroll(container) {
  if (!container || initialized.has(container)) return;
  initialized.add(container);
  let gesture = null;
  let blockedClickBar = null;

  function barAt(target) {
    const bar = target instanceof Element ? target.closest(".filter-chips-bar") : null;
    return bar && container.contains(bar) ? bar : null;
  }

  function finish(cancelled = false) {
    if (!gesture) return;
    const current = gesture;
    gesture = null;
    current.bar.classList.remove("is-dragging");
    if (current.dragged && !cancelled) blockedClickBar = current.bar;
    if (current.bar.hasPointerCapture(current.id)) current.bar.releasePointerCapture(current.id);
  }

  container.addEventListener("wheel", (event) => {
    const bar = barAt(event.target);
    // Preserve browser zoom and native horizontal trackpad/Shift+wheel behavior.
    if (!bar || event.ctrlKey || !event.cancelable || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bar.clientWidth : 1;
    const next = Math.max(0, Math.min(bar.scrollWidth - bar.clientWidth, bar.scrollLeft + event.deltaY * unit));
    if (Math.abs(next - bar.scrollLeft) < 0.5) return;
    event.preventDefault();
    event.stopPropagation();
    bar.scrollLeft = next;
  }, { passive: false });

  container.addEventListener("pointerdown", (event) => {
    blockedClickBar = null;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    finish(true);
    const bar = barAt(event.target);
    if (!bar || bar.scrollWidth <= bar.clientWidth) return;
    if (event.clientY >= bar.getBoundingClientRect().top + bar.clientHeight) return; // Native scrollbar.
    gesture = { bar, id: event.pointerId, x: event.clientX, y: event.clientY, scroll: bar.scrollLeft, dragged: false };
  });

  window.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const current = gesture;
    if (!current.bar.isConnected || !(event.buttons & 1)) { finish(true); return; }
    const distance = event.clientX - current.x;
    if (!current.dragged) {
      if (Math.abs(distance) < 6) return;
      if (Math.abs(event.clientY - current.y) > Math.abs(distance)) { finish(true); return; }
      current.dragged = true;
      current.bar.classList.add("is-dragging");
      // Capture only after the threshold so ordinary button clicks still work.
      try { current.bar.setPointerCapture(current.id); }
      catch { /* The pointer may already have left the browser. */ }
    }
    event.preventDefault();
    current.bar.scrollLeft = current.scroll - distance;
  }, { passive: false });

  window.addEventListener("pointerup", (event) => {
    if (gesture?.id === event.pointerId) finish();
  });
  window.addEventListener("pointercancel", (event) => {
    if (gesture?.id === event.pointerId) finish(true);
  });
  container.addEventListener("lostpointercapture", (event) => {
    if (gesture?.id === event.pointerId) finish(true);
  });
  window.addEventListener("blur", () => { finish(true); blockedClickBar = null; });

  // Inline filter handlers run at the target, so suppress a drag-click in capture.
  container.addEventListener("click", (event) => {
    if (event.detail === 0 || !blockedClickBar) return; // Keyboard/assistive clicks.
    const bar = blockedClickBar;
    blockedClickBar = null;
    if (!bar.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
