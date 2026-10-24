import { CLUSTERS, K, buildSpace, cssVar, describe, idleQuery, nearest, type SceneHandle, type SceneOptions } from './space';
import { activeClusters, createLabelLayer } from './labels';
import { on } from '../asta/bus';

/**
 * Canvas 2D version of the hero scene for devices without WebGL.
 * Same data, same retrieval, simpler drawing.
 */
export function createCanvasScene(host: HTMLElement, opts: SceneOptions): SceneHandle {
  let reduced = opts.reducedMotion;
  const space = buildSpace(opts.compact ? 420 : 800);
  const canvas = document.createElement('canvas');
  canvas.className = 'vf-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const labels = createLabelLayer(host);

  let colors = { base: '#a7afc2', hi: '#a9c4ff', line: '#7fa8ff', query: '#e8ebf3' };
  let baseAlpha = 0.85;
  const refreshTheme = () => {
    colors = {
      base: cssVar('--text-2') || colors.base,
      hi: cssVar('--signal-strong') || colors.hi,
      line: cssVar('--signal') || colors.line,
      query: cssVar('--text') || colors.query,
    };
    baseAlpha = getComputedStyle(document.documentElement).colorScheme === 'light' ? 0.5 : 0.85;
    requestFrame();
  };

  let width = 1;
  let height = 1;
  let dpr = 1;
  let scale = 1;
  let camZ = 8.4;
  const resize = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const aspect = width / height;
    camZ = aspect < 1.25 ? 8.4 + (1.25 - aspect) * 5.5 : 8.4;
    // Matches the WebGL camera's 40° vertical field of view.
    scale = height / 2 / Math.tan((40 * Math.PI) / 360);
    requestFrame();
  };

  let rotY = -0.35;
  const tilt = 0.16;
  const project = (x: number, y: number, z: number) => {
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const y2 = y * ct - z1 * st;
    const z2 = y * st + z1 * ct;
    const depth = camZ - z2;
    const f = scale / depth;
    return { sx: width / 2 + x1 * f, sy: height / 2 - y2 * f, depth };
  };
  // Inverse of the rotation, used to bring the pointer into the scene's local frame (z = 0 plane).
  const unproject = (sx: number, sy: number): [number, number, number] => {
    const f = scale / camZ;
    const wx = (sx - width / 2) / f;
    const wy = -(sy - height / 2) / f;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const y = wy * ct;
    const z1 = -wy * st;
    const cy = Math.cos(rotY);
    const sy2 = Math.sin(rotY);
    return [wx * cy - z1 * sy2, y, wx * sy2 + z1 * cy];
  };

  let pointer: [number, number] | null = null;
  let lastPointer = -Infinity;
  let touchDragging = false;
  let astaDriving = false;
  const pointAtClient = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    pointer = [clientX - r.left, clientY - r.top];
    lastPointer = performance.now();
    requestFrame();
  };
  const setPointer = (e: PointerEvent) => {
    if (!astaDriving) pointAtClient(e.clientX, e.clientY);
  };
  const offAsta = on('asta:query', ({ x, y }) => {
    astaDriving = true;
    labels.setQueryText('asta');
    pointAtClient(x, y);
  });
  const offAstaEnd = on('asta:query-end', () => {
    astaDriving = false;
    pointer = null;
    labels.setQueryText('query');
  });
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || touchDragging) setPointer(e);
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      touchDragging = true;
      setPointer(e);
    }
  };
  const onUp = () => (touchDragging = false);
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !astaDriving) pointer = null;
  };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  host.addEventListener('pointerleave', onLeave);

  const idx = new Int32Array(K).fill(-1);
  const q: [number, number, number] = idleQuery(2);
  let clock = 2;
  let raf = 0;
  let visible = true;
  let last = performance.now();
  let readoutText = '';

  function requestFrame() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    if (!ctx) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduced) {
      clock += dt;
      rotY += dt * 0.045;
    }
    // After the mouse leaves, hold the last position briefly before drifting again.
    if (!pointer && now - lastPointer > 1800) lastPointer = -Infinity;
    const target = pointer ? unproject(pointer[0], pointer[1]) : lastPointer > 0 ? q.slice() as typeof q : idleQuery(clock);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
    for (let a = 0; a < 3; a++) q[a] = q[a]! + (target[a]! - q[a]!) * k;
    nearest(space, q[0], q[1], q[2], K, idx);
    const neighbours = new Set(idx);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = colors.base;
    for (let i = 0; i < space.count; i++) {
      if (neighbours.has(i)) continue;
      const p = project(space.positions[i * 3]!, space.positions[i * 3 + 1]!, space.positions[i * 3 + 2]!);
      const c = space.cluster[i]!;
      const tone = c === 255 ? 0.2 : CLUSTERS[c]!.tone;
      const fade = Math.min(1, Math.max(0, (p.depth - 6) / 5));
      ctx.globalAlpha = baseAlpha * (0.5 + 0.5 * tone) * (1 - 0.6 * fade);
      const r = (space.size[i]! * 22) / p.depth / 2;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const qp = project(q[0], q[1], q[2]);
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const i of idx) {
      if (i < 0) continue;
      const p = project(space.positions[i * 3]!, space.positions[i * 3 + 1]!, space.positions[i * 3 + 2]!);
      ctx.moveTo(qp.sx, qp.sy);
      ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.hi;
    for (const i of idx) {
      if (i < 0) continue;
      const p = project(space.positions[i * 3]!, space.positions[i * 3 + 1]!, space.positions[i * 3 + 2]!);
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = colors.query;
    ctx.fillStyle = colors.query;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(qp.sx, qp.sy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(qp.sx, qp.sy, 3, 0, Math.PI * 2);
    ctx.fill();

    const active = activeClusters(space.cluster, idx);
    CLUSTERS.forEach((c, i) => {
      const p = project(c.center[0], c.center[1] + c.spread[1] * 0.9, c.center[2]);
      labels.placeCluster(i, p.sx, p.sy, active.has(i));
    });
    labels.placeQuery(qp.sx, qp.sy);

    const text = describe(space, idx);
    if (opts.readout && text !== readoutText) {
      readoutText = text;
      opts.readout.textContent = text;
    }
    if (!reduced) requestFrame();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) {
      last = performance.now();
      requestFrame();
    }
  });
  io.observe(host);
  const onVisibility = () => {
    if (!document.hidden) {
      last = performance.now();
      requestFrame();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  refreshTheme();
  resize();

  return {
    refreshTheme,
    setReducedMotion(v) {
      reduced = v;
      requestFrame();
    },
    destroy() {
      cancelAnimationFrame(raf);
      offAsta();
      offAstaEnd();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerup', onUp);
      canvas.remove();
      labels.destroy();
    },
  };
}
