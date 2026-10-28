/*
 * D3 border-glow spotlight (DIG-1009 spec 4.1). Pointer-fine devices
 * only; reduced motion exits at the gate; without JS the overlay never
 * paints (the .is-spot class never lands) and hover stays border-only.
 * rAF-throttled: one custom-property write per frame, rect read inside
 * the frame callback. No layout writes, no listeners on the document.
 */
const fine = matchMedia('(pointer: fine)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
if (fine.matches && !reduce.matches) {
  const els = document.querySelectorAll<HTMLElement>('[data-spotlight]');
  let raf = 0;
  let pending: { el: HTMLElement; x: number; y: number } | null = null;
  const frame = () => {
    raf = 0;
    if (!pending) return;
    const { el, x, y } = pending;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${Math.round(((x - rect.left) / rect.width) * 100)}%`);
    el.style.setProperty('--spot-y', `${Math.round(((y - rect.top) / rect.height) * 100)}%`);
  };
  els.forEach((el) => {
    el.addEventListener('pointerenter', () => el.classList.add('is-spot'));
    el.addEventListener('pointermove', (event: PointerEvent) => {
      pending = { el, x: event.clientX, y: event.clientY };
      if (!raf) raf = requestAnimationFrame(frame);
    });
    el.addEventListener('pointerleave', () => {
      pending = null;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el.classList.remove('is-spot');
    });
  });
}
