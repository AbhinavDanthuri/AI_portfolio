import { emit } from './bus';

/**
 * Asta's body in motion. Runs its own requestAnimationFrame loop and writes transforms
 * straight to the DOM, so React never re-renders per frame. Stops itself when Asta is
 * at rest and wakes on scroll, pointer movement or a new target.
 */

export type Vec = { x: number; y: number };

type Options = {
  root: HTMLElement; // positioned wrapper (fixed layer child)
  body: HTMLElement; // the clickable/draggable button
  inner: HTMLElement; // lean wrapper
  pupil: SVGGElement;
  bubble: HTMLElement;
  line: SVGPathElement;
  lineDot: SVGCircleElement;
  onFastScroll: () => void;
  onThrowLanded: () => void;
  onDrop: () => void;
  onClick: () => void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const NAV = 64;

export const astaSize = () => (window.innerWidth < 720 ? 46 : 60);

export function createEngine(o: Options) {
  let size = astaSize();
  let reduced = false;
  let active = true;
  const pos: Vec = { x: window.innerWidth + 80, y: window.innerHeight - 60 };
  const vel: Vec = { x: 0, y: 0 };
  let customHome: Vec | null = null;
  let target: (() => Vec | null) | null = null;
  let pointEl: Element | null = null;
  let mouse: Vec | null = null;
  let lastMouse = 0;
  let scrollReactive = true;
  let lastScrollY = window.scrollY;
  let fastAccum = 0;
  let lastFast = 0;
  let thrownUntil = 0;
  let throwPending = false;
  let suppressClick = false;
  let raf = 0;
  let last = performance.now();
  let lastKick = performance.now();
  let queryInside = false;
  let stage: Element | null = null;
  let stageCheckedAt = 0;
  let drag: {
    id: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
    samples: { x: number; y: number; t: number }[];
  } | null = null;

  const bounds = () => {
    const m = size / 2 + 10;
    return { minX: m, maxX: window.innerWidth - m, minY: NAV + size / 2 + 6, maxY: window.innerHeight - m };
  };

  const home = (): Vec => {
    const b = bounds();
    if (customHome) return { x: clamp(customHome.x, b.minX, b.maxX), y: clamp(customHome.y, b.minY, b.maxY) };
    const gap = window.innerWidth < 720 ? 16 : 28;
    return { x: window.innerWidth - gap - size / 2, y: window.innerHeight - gap - size / 2 };
  };

  function frame(now: number) {
    raf = 0;
    if (!active) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;

    // ---- reads (keep layout reads together, before writes)
    const sy = window.scrollY;
    const dy = sy - lastScrollY;
    lastScrollY = sy;
    const bubbleShown = !o.bubble.hidden;
    const bw = bubbleShown ? o.bubble.offsetWidth : 0;
    const bh = bubbleShown ? o.bubble.offsetHeight : 0;
    const pr = pointEl && pointEl.isConnected ? pointEl.getBoundingClientRect() : null;
    if (now - stageCheckedAt > 1000) {
      stage = document.querySelector('.vf-stage');
      stageCheckedAt = now;
    }
    const sr = stage ? stage.getBoundingClientRect() : null;
    const b = bounds();
    const raw = (target && target()) || home();
    const t = { x: clamp(raw.x, b.minX, b.maxX), y: clamp(raw.y, b.minY, b.maxY) };

    // ---- scroll: weight + dizziness
    if (scrollReactive) {
      const speed = Math.abs(dy) / dt;
      fastAccum = speed > 3200 ? fastAccum + dt : Math.max(0, fastAccum - dt);
      if (fastAccum > 0.3 && now - lastFast > 2500) {
        lastFast = now;
        fastAccum = 0;
        o.onFastScroll();
      }
      if (!drag && !reduced && dy !== 0) vel.y -= clamp(dy, -60, 60) * 9;
    }

    // ---- motion
    if (drag) {
      // position follows the pointer (set in pointermove)
    } else if (reduced) {
      pos.x = t.x;
      pos.y = t.y;
      vel.x = vel.y = 0;
    } else {
      const thrown = now < thrownUntil;
      const k = thrown ? 3.5 : 30;
      const damp = thrown ? 0.8 : 9;
      vel.x += (t.x - pos.x) * k * dt;
      vel.y += (t.y - pos.y) * k * dt;
      const f = Math.exp(-damp * dt);
      vel.x *= f;
      vel.y *= f;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      if (throwPending) {
        // Bounce off the screen edges while thrown.
        if (pos.x < b.minX) {
          pos.x = b.minX;
          vel.x = Math.abs(vel.x) * 0.55;
        }
        if (pos.x > b.maxX) {
          pos.x = b.maxX;
          vel.x = -Math.abs(vel.x) * 0.55;
        }
        if (pos.y < b.minY) {
          pos.y = b.minY;
          vel.y = Math.abs(vel.y) * 0.55;
        }
        if (pos.y > b.maxY) {
          pos.y = b.maxY;
          vel.y = -Math.abs(vel.y) * 0.55;
        }
        if (!thrown) {
          throwPending = false;
          o.onThrowLanded();
        }
      }
    }

    // ---- writes
    o.root.style.transform = `translate3d(${(pos.x - size / 2).toFixed(1)}px, ${(pos.y - size / 2).toFixed(1)}px, 0)`;

    // Eye: looks at what it's pointing at, else at the cursor.
    const look = pr ? { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 } : mouse && now - lastMouse < 5000 ? mouse : null;
    let px = 0;
    let py = 0;
    if (look) {
      const dx = look.x - pos.x;
      const dy2 = look.y - pos.y;
      const d = Math.hypot(dx, dy2) || 1;
      const m = Math.min(1, d / 120) * 5.5;
      px = (dx / d) * m;
      py = (dy2 / d) * m;
    }
    o.pupil.setAttribute('transform', `translate(${px.toFixed(2)} ${py.toFixed(2)})`);

    // Lean toward a nearby cursor.
    let lx = 0;
    let ly = 0;
    let near = false;
    if (mouse && !drag && now - lastMouse < 3000) {
      const dx = mouse.x - pos.x;
      const dy2 = mouse.y - pos.y;
      const d = Math.hypot(dx, dy2);
      if (d < 150 && d > 0) {
        near = true;
        const s = (1 - d / 150) * 7;
        lx = (dx / d) * s;
        ly = (dy2 / d) * s;
      }
    }
    o.inner.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
    o.inner.classList.toggle('is-near', near);

    // Speech bubble rides above Asta (below if there's no room).
    if (bubbleShown) {
      let bx = pos.x + size / 2 - bw;
      let by = pos.y - size / 2 - 14 - bh;
      if (by < NAV + 8) by = pos.y + size / 2 + 14;
      bx = clamp(bx, 12, window.innerWidth - 12 - bw);
      by = clamp(by, NAV + 8, window.innerHeight - 12 - bh);
      o.bubble.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;
    }

    // Pointing line from Asta to the element it's talking about.
    if (pr && pr.bottom > 0 && pr.top < window.innerHeight && pr.width > 0) {
      const inside = pos.x > pr.left && pos.x < pr.right && pos.y > pr.top && pos.y < pr.bottom;
      const ex = inside ? pr.left + pr.width / 2 : clamp(pos.x, pr.left + 6, pr.right - 6);
      const ey = inside ? pr.top + pr.height / 2 : clamp(pos.y, pr.top + 4, pr.bottom - 4);
      const dx = ex - pos.x;
      const dy2 = ey - pos.y;
      const d = Math.hypot(dx, dy2) || 1;
      const sx = pos.x + (dx / d) * size * 0.45;
      const sy2 = pos.y + (dy2 / d) * size * 0.45;
      const cx = (sx + ex) / 2 - (dy2 / d) * Math.min(60, d * 0.18);
      const cy = (sy2 + ey) / 2 + (dx / d) * Math.min(60, d * 0.18);
      o.line.setAttribute('d', `M${sx.toFixed(1)} ${sy2.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
      o.lineDot.setAttribute('cx', ex.toFixed(1));
      o.lineDot.setAttribute('cy', ey.toFixed(1));
      o.line.style.display = '';
      o.lineDot.style.display = '';
    } else {
      o.line.style.display = 'none';
      o.lineDot.style.display = 'none';
    }

    // Inside the hero scene, Asta becomes the retrieval query.
    const inStage = !!sr && pos.x > sr.left && pos.x < sr.right && pos.y > sr.top && pos.y < sr.bottom;
    if (inStage) {
      emit('asta:query', { x: pos.x, y: pos.y });
      queryInside = true;
    } else if (queryInside) {
      emit('asta:query-end');
      queryInside = false;
    }

    const settled =
      !drag &&
      !target &&
      !pr &&
      !throwPending &&
      Math.hypot(vel.x, vel.y) < 2 &&
      Math.hypot(t.x - pos.x, t.y - pos.y) < 0.5 &&
      now - lastMouse > 600 &&
      now - lastKick > 700;
    if (!settled) raf = requestAnimationFrame(frame);
  }

  function kick() {
    lastKick = performance.now();
    if (!raf && active && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  // ---- global listeners
  const onScroll = () => kick();
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    mouse = { x: e.clientX, y: e.clientY };
    lastMouse = performance.now();
    kick();
  };
  const onResize = () => {
    size = astaSize();
    kick();
  };
  const onVisibility = () => kick();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  // ---- drag & throw
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - pos.x, oy: e.clientY - pos.y, moved: false, samples: [] };
  };
  const onDragMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      drag.moved = true;
      try {
        o.body.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      o.root.classList.add('is-dragging');
    }
    if (drag.moved) {
      pos.x = e.clientX - drag.ox;
      pos.y = e.clientY - drag.oy;
      const t = performance.now();
      drag.samples.push({ x: pos.x, y: pos.y, t });
      drag.samples = drag.samples.filter((s) => t - s.t < 90);
      kick();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    o.root.classList.remove('is-dragging');
    if (!d.moved) return; // the native click event handles taps
    suppressClick = true;
    const s = d.samples;
    const first = s[0];
    const lastS = s[s.length - 1];
    let vx = 0;
    let vy = 0;
    if (first && lastS && lastS.t - first.t > 8) {
      vx = ((lastS.x - first.x) / (lastS.t - first.t)) * 1000;
      vy = ((lastS.y - first.y) / (lastS.t - first.t)) * 1000;
    }
    if (Math.hypot(vx, vy) > 700 && !reduced) {
      vel.x = vx;
      vel.y = vy;
      thrownUntil = performance.now() + 1000;
      throwPending = true;
    } else {
      customHome = { x: pos.x, y: pos.y };
      vel.x = vel.y = 0;
      o.onDrop();
    }
    kick();
  };
  const onClick = () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    o.onClick();
  };
  o.body.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  o.body.addEventListener('click', onClick);

  kick();

  return {
    home,
    getPos: () => ({ ...pos }),
    size: () => size,
    placeAt(v: Vec) {
      pos.x = v.x;
      pos.y = v.y;
      vel.x = vel.y = 0;
      kick();
    },
    setTarget(fn: (() => Vec | null) | null) {
      target = fn;
      kick();
    },
    pointAt(el: Element | null) {
      pointEl = el;
      kick();
    },
    setReduced(v: boolean) {
      reduced = v;
      kick();
    },
    setScrollReactive(v: boolean) {
      scrollReactive = v;
      lastScrollY = window.scrollY;
    },
    resetHome() {
      customHome = null;
      kick();
    },
    kick,
    setActive(v: boolean) {
      active = v;
      if (v) kick();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
        if (queryInside) emit('asta:query-end');
        queryInside = false;
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      if (queryInside) emit('asta:query-end');
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      o.body.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      o.body.removeEventListener('click', onClick);
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
