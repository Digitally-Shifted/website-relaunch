/*
 * Scroll reveal (DIG-993 spec 6.2). Progressive enhancement: content is
 * fully visible without JavaScript. The page adds `js-reveal` to <html>
 * in an inline head script; this observer then adds `is-in` once per
 * element when it intersects. Elements reveal once (unobserve), in
 * reading order, and are never hidden more than one animation after the
 * trigger.
 */
const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      el.style.setProperty('--reveal-i', el.dataset.revealIndex ?? '0');
      el.classList.add('is-in');
      io.unobserve(el);
    }
  },
  { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
);
els.forEach((el) => io.observe(el));
