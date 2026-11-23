// EMBERFALL input: mouse clicks and hover against the regions the
// renderer records each frame, plus the keyboard shortcuts. The canvas is
// scaled by CSS, so client coordinates are mapped back to the 1280x720
// view before hit-testing.

import { VIEW_W, VIEW_H } from './config.js';

export function makeInput(canvas, handlers) {
  function toView(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (VIEW_W / rect.width),
      y: (event.clientY - rect.top) * (VIEW_H / rect.height),
    };
  }

  function hitAt(x, y) {
    const hits = handlers.getHits();
    // Last drawn region wins: cards overlap in the fan, so test in reverse.
    for (let i = hits.length - 1; i >= 0; i -= 1) {
      const h = hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = toView(event);
    handlers.onHover(hitAt(p.x, p.y), p);
  });

  canvas.addEventListener('mouseleave', () => {
    handlers.onHover(null, null);
  });

  canvas.addEventListener('click', (event) => {
    const p = toView(event);
    const hit = hitAt(p.x, p.y);
    handlers.onClick(hit, p);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    handlers.onKey(event.key.toLowerCase());
  });
}
