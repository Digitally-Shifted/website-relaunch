/*
 * Promise numeral count-up (DIG-993 spec 6.3). The numeral renders `20`
 * in server HTML, so reduced motion and no-JS both keep the real value.
 * Counts up once on intersect, never on re-scroll. No library, no React.
 *
 * Exception to the spec's snippet, recorded for the decision log: the
 * spec captured `start = performance.now()` at setup time, which makes
 * the first animation frame compute p = 1 whenever the band enters the
 * view later than one animation after load — the count then completes
 * instantly and never animates. `start` is captured when the intersection
 * fires, which is the behavior the spec states ("counts up once on
 * intersect").
 */
const el = document.querySelector<HTMLElement>('.promise-count');
if (el && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const target = Number(el.textContent);
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / 560, 1);
        el.textContent = String(Math.round(p * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.2 });
  io.observe(el);
}
