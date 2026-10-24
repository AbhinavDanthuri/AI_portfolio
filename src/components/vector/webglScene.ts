import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Plane,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CLUSTERS, K, buildSpace, cssVar, describe, idleQuery, nearest, type SceneHandle, type SceneOptions } from './space';
import { activeClusters, createLabelLayer } from './labels';
import { on } from '../asta/bus';

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aTone;
  attribute float aHi;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uIntro;
  varying float vHi;
  varying float vTone;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position * mix(0.86, 1.0, uIntro), 1.0);
    gl_Position = projectionMatrix * mv;
    float z = -mv.z;
    gl_PointSize = aSize * (1.0 + aHi * 1.7) * uScale * uPixelRatio / z;
    vHi = aHi;
    vTone = aTone;
    vFade = clamp((z - 6.0) / 5.0, 0.0, 1.0);
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uHi;
  uniform float uOpacity;
  uniform float uIntro;
  varying float vHi;
  varying float vTone;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float edge = smoothstep(0.5, 0.3, d);
    vec3 col = mix(uBase, uHi, vHi);
    float base = uOpacity * (0.5 + 0.5 * vTone) * (1.0 - 0.6 * vFade);
    gl_FragColor = vec4(col, edge * mix(base, 1.0, vHi) * uIntro);
  }
`;

const QUERY_VERT = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPixelRatio;
  }
`;

const QUERY_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntro;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float ring = smoothstep(0.5, 0.45, d) * smoothstep(0.37, 0.42, d);
    float dotc = smoothstep(0.13, 0.07, d);
    float a = max(ring * 0.85, dotc);
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a * uIntro);
  }
`;

export function createWebGLScene(host: HTMLElement, opts: SceneOptions): SceneHandle {
  let reduced = opts.reducedMotion;
  const space = buildSpace(opts.compact ? 640 : 1300);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.compact ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'vf-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const labels = createLabelLayer(host);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0, 0, 8.4);
  const group = new Group();
  group.rotation.set(0.16, -0.35, 0);
  scene.add(group);

  // Points
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(space.positions, 3));
  geo.setAttribute('aSize', new BufferAttribute(space.size, 1));
  const tone = new Float32Array(space.count);
  for (let i = 0; i < space.count; i++) {
    const c = space.cluster[i]!;
    tone[i] = c === 255 ? 0.2 : CLUSTERS[c]!.tone;
  }
  geo.setAttribute('aTone', new BufferAttribute(tone, 1));
  const hi = new Float32Array(space.count);
  const hiTarget = new Float32Array(space.count);
  const hiAttr = new BufferAttribute(hi, 1);
  hiAttr.setUsage(DynamicDrawUsage);
  geo.setAttribute('aHi', hiAttr);

  const pointUniforms = {
    uBase: { value: new Color() },
    uHi: { value: new Color() },
    uScale: { value: 24 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uOpacity: { value: 0.85 },
    uIntro: { value: reduced ? 1 : 0 },
  };
  const pointMat = new ShaderMaterial({
    uniforms: pointUniforms,
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const points = new Points(geo, pointMat);
  group.add(points);

  // Lines from the query to its neighbours
  const linePos = new Float32Array(K * 2 * 3);
  const lineGeo = new BufferGeometry();
  const lineAttr = new BufferAttribute(linePos, 3);
  lineAttr.setUsage(DynamicDrawUsage);
  lineGeo.setAttribute('position', lineAttr);
  const lineMat = new LineBasicMaterial({ transparent: true, opacity: 0.75, depthWrite: false });
  const lines = new LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  group.add(lines);

  // Query marker
  const qPos = new Float32Array(3);
  const qGeo = new BufferGeometry();
  const qAttr = new BufferAttribute(qPos, 3);
  qAttr.setUsage(DynamicDrawUsage);
  qGeo.setAttribute('position', qAttr);
  const qUniforms = {
    uColor: { value: new Color() },
    uSize: { value: 30 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uIntro: pointUniforms.uIntro,
  };
  const qMat = new ShaderMaterial({
    uniforms: qUniforms,
    vertexShader: QUERY_VERT,
    fragmentShader: QUERY_FRAG,
    transparent: true,
    depthTest: false,
  });
  const qPoint = new Points(qGeo, qMat);
  qPoint.frustumCulled = false;
  group.add(qPoint);

  const refreshTheme = () => {
    pointUniforms.uBase.value.set(cssVar('--text-2') || '#a7afc2');
    pointUniforms.uHi.value.set(cssVar('--signal-strong') || '#a9c4ff');
    lineMat.color.set(cssVar('--signal') || '#7fa8ff');
    qUniforms.uColor.value.set(cssVar('--text') || '#e8ebf3');
    // Dark dots on paper read heavier than light dots on ink, so the light theme uses less opacity.
    pointUniforms.uOpacity.value = getComputedStyle(document.documentElement).colorScheme === 'light' ? 0.5 : 0.85;
    requestFrame();
  };

  // Pointer handling
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const hit = new Vector3();
  const pointerWorld = new Vector3();
  let pointerActive = false;
  let lastPointer = -Infinity;
  let touchDragging = false;

  let astaDriving = false;
  const pointAtClient = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      pointerWorld.set(Math.max(-3.4, Math.min(3.4, hit.x)), Math.max(-2.3, Math.min(2.3, hit.y)), 0);
      pointerActive = true;
      lastPointer = performance.now();
      requestFrame();
    }
  };
  const updatePointer = (e: PointerEvent) => {
    if (!astaDriving) pointAtClient(e.clientX, e.clientY);
  };
  // Asta, the site guide, becomes the query while it's inside the scene.
  const offAsta = on('asta:query', ({ x, y }) => {
    astaDriving = true;
    labels.setQueryText('asta');
    pointAtClient(x, y);
  });
  const offAstaEnd = on('asta:query-end', () => {
    astaDriving = false;
    pointerActive = false;
    labels.setQueryText('query');
  });
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || touchDragging) updatePointer(e);
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      touchDragging = true;
      updatePointer(e);
    }
  };
  const onUp = () => {
    touchDragging = false;
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !astaDriving) pointerActive = false;
  };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  host.addEventListener('pointerleave', onLeave);

  // Sizing
  let width = 1;
  let height = 1;
  const resize = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1.25 ? 8.4 + (1.25 - camera.aspect) * 5.5 : 8.4;
    camera.updateProjectionMatrix();
    pointUniforms.uScale.value = Math.max(20, Math.min(40, height * 0.056));
    requestFrame();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // Loop
  const q = new Vector3(...idleQuery(2));
  const target = new Vector3();
  const local = new Vector3();
  const tmp = new Vector3();
  const idx = new Int32Array(K).fill(-1);
  const prevIdx = new Int32Array(K).fill(-1);
  let raf = 0;
  let visible = true;
  let last = performance.now();
  let clock = 2;
  let introStart = -1;
  let readoutText = '';

  function requestFrame() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let animating = false;

    if (!reduced) {
      clock += dt;
      group.rotation.y += dt * 0.045;
      if (introStart < 0) introStart = now;
      const k = Math.min(1, (now - introStart) / 1400);
      pointUniforms.uIntro.value = 1 - Math.pow(1 - k, 3);
      animating = true;
    }

    // Target query in world space, then into the rotating group's local space.
    const usePointer = pointerActive || now - lastPointer < 1800;
    if (usePointer) target.copy(pointerWorld);
    else target.set(...idleQuery(clock));
    group.updateMatrixWorld();
    local.copy(target);
    group.worldToLocal(local);
    if (reduced) q.copy(local);
    else q.lerp(local, 1 - Math.exp(-dt * 7));

    nearest(space, q.x, q.y, q.z, K, idx);

    // Highlights ease toward the new neighbour set.
    let changed = false;
    for (let j = 0; j < K; j++) if (idx[j] !== prevIdx[j]) changed = true;
    if (changed) {
      for (const i of prevIdx) if (i >= 0) hiTarget[i] = 0;
      for (const i of idx) if (i >= 0) hiTarget[i] = 1;
      prevIdx.set(idx);
    }
    const rate = reduced ? 1 : 1 - Math.exp(-dt * 10);
    let settling = false;
    for (let i = 0; i < space.count; i++) {
      const d = hiTarget[i]! - hi[i]!;
      if (d !== 0) {
        hi[i] = Math.abs(d) < 0.002 ? hiTarget[i]! : hi[i]! + d * rate;
        settling = true;
      }
    }
    hiAttr.needsUpdate = true;

    for (let j = 0; j < K; j++) {
      const i = idx[j]!;
      const o = j * 6;
      linePos[o] = q.x;
      linePos[o + 1] = q.y;
      linePos[o + 2] = q.z;
      linePos[o + 3] = i >= 0 ? space.positions[i * 3]! : q.x;
      linePos[o + 4] = i >= 0 ? space.positions[i * 3 + 1]! : q.y;
      linePos[o + 5] = i >= 0 ? space.positions[i * 3 + 2]! : q.z;
    }
    lineAttr.needsUpdate = true;
    qPos[0] = q.x;
    qPos[1] = q.y;
    qPos[2] = q.z;
    qAttr.needsUpdate = true;

    // Labels
    const active = activeClusters(space.cluster, idx);
    CLUSTERS.forEach((c, i) => {
      tmp.set(c.center[0], c.center[1] + c.spread[1] * 0.9, c.center[2]);
      group.localToWorld(tmp).project(camera);
      labels.placeCluster(i, (tmp.x * 0.5 + 0.5) * width, (-tmp.y * 0.5 + 0.5) * height, active.has(i));
    });
    tmp.copy(q);
    group.localToWorld(tmp).project(camera);
    labels.placeQuery((tmp.x * 0.5 + 0.5) * width, (-tmp.y * 0.5 + 0.5) * height);

    const text = describe(space, idx);
    if (opts.readout && text !== readoutText) {
      readoutText = text;
      opts.readout.textContent = text;
    }

    renderer.render(scene, camera);
    if (animating || settling || q.distanceToSquared(local) > 1e-5) requestFrame();
  }

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
  const onContextLost = (e: Event) => e.preventDefault();
  canvas.addEventListener('webglcontextlost', onContextLost);

  refreshTheme();
  resize();

  return {
    refreshTheme,
    setReducedMotion(v) {
      reduced = v;
      if (v) pointUniforms.uIntro.value = 1;
      requestFrame();
    },
    destroy() {
      cancelAnimationFrame(raf);
      offAsta();
      offAstaEnd();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      geo.dispose();
      lineGeo.dispose();
      qGeo.dispose();
      pointMat.dispose();
      lineMat.dispose();
      qMat.dispose();
      renderer.dispose();
      canvas.remove();
      labels.destroy();
    },
  };
}
