/**
 * The hero's embedding space. Points are grouped into the four sources the Bug Investigator
 * retrieves from. The layout is illustrative: positions are generated, not real embeddings.
 * Shared by the WebGL renderer and the Canvas 2D fallback.
 */

export type Cluster = {
  id: string;
  label: string;
  center: [number, number, number];
  spread: [number, number, number];
  share: number;
  /** 0..1 brightness bias so clusters read as separate groups without extra hues. */
  tone: number;
};

export const CLUSTERS: Cluster[] = [
  { id: 'code', label: 'code', center: [-1.75, 0.75, 0.3], spread: [0.8, 0.55, 0.65], share: 0.34, tone: 1 },
  { id: 'docs', label: 'docs', center: [1.6, 1.05, -0.5], spread: [0.65, 0.5, 0.6], share: 0.2, tone: 0.78 },
  { id: 'issues', label: 'past issues', center: [1.25, -1.15, 0.65], spread: [0.7, 0.5, 0.55], share: 0.22, tone: 0.9 },
  { id: 'commits', label: 'commits', center: [-1.05, -1.2, -0.7], spread: [0.75, 0.45, 0.6], share: 0.24, tone: 0.7 },
];

export const K = 6;

export type Space = {
  count: number;
  positions: Float32Array; // xyz per point
  cluster: Uint8Array; // index into CLUSTERS, 255 = background noise
  size: Float32Array;
};

/** Small deterministic PRNG so the layout is the same on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSpace(count: number, seed = 21): Space {
  const rand = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const positions = new Float32Array(count * 3);
  const cluster = new Uint8Array(count);
  const size = new Float32Array(count);
  const noiseShare = 0.08;

  for (let i = 0; i < count; i++) {
    const r = rand();
    let c = 255;
    if (r > noiseShare) {
      let acc = noiseShare;
      for (let j = 0; j < CLUSTERS.length; j++) {
        acc += (CLUSTERS[j]!.share * (1 - noiseShare));
        if (r <= acc) {
          c = j;
          break;
        }
      }
      if (c === 255) c = CLUSTERS.length - 1;
    }
    cluster[i] = c;
    if (c === 255) {
      positions[i * 3] = (rand() - 0.5) * 6.4;
      positions[i * 3 + 1] = (rand() - 0.5) * 4.2;
      positions[i * 3 + 2] = (rand() - 0.5) * 3.2;
      size[i] = 0.6 + rand() * 0.5;
    } else {
      const cl = CLUSTERS[c]!;
      positions[i * 3] = cl.center[0] + gauss() * cl.spread[0] * 0.6;
      positions[i * 3 + 1] = cl.center[1] + gauss() * cl.spread[1] * 0.6;
      positions[i * 3 + 2] = cl.center[2] + gauss() * cl.spread[2] * 0.6;
      size[i] = 0.75 + rand() * 0.75;
    }
  }
  return { count, positions, cluster, size };
}

/**
 * Indices of the k nearest points to q (squared Euclidean, brute force).
 * Brute force is the honest choice at this size: ~1k points, k = 6, well under a millisecond.
 */
export function nearest(space: Space, qx: number, qy: number, qz: number, k: number, out: Int32Array): void {
  const best = new Float64Array(k).fill(Infinity);
  out.fill(-1);
  const p = space.positions;
  for (let i = 0; i < space.count; i++) {
    const dx = p[i * 3]! - qx;
    const dy = p[i * 3 + 1]! - qy;
    const dz = p[i * 3 + 2]! - qz;
    const d = dx * dx + dy * dy + dz * dz;
    if (d >= best[k - 1]!) continue;
    let j = k - 1;
    while (j > 0 && best[j - 1]! > d) {
      best[j] = best[j - 1]!;
      out[j] = out[j - 1]!;
      j--;
    }
    best[j] = d;
    out[j] = i;
  }
}

/** Human-readable composition of the current top-k, e.g. "code 3 · past issues 2 · commits 1". */
export function describe(space: Space, idx: Int32Array): string {
  const counts = new Map<number, number>();
  for (const i of idx) {
    if (i < 0) continue;
    const c = space.cluster[i]!;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c === 255 ? 'other' : CLUSTERS[c]!.label} ${n}`)
    .join(' · ');
}

/** Idle path for the query when nobody is pointing at the scene. */
export function idleQuery(t: number): [number, number, number] {
  return [2.15 * Math.sin(t * 0.21), 1.25 * Math.sin(t * 0.29 + 1.1), 0.7 * Math.sin(t * 0.17 + 0.4)];
}

export type SceneOptions = {
  /** Live readout element for the retrieved composition. Updated only when it changes. */
  readout?: HTMLElement | null;
  reducedMotion: boolean;
  compact: boolean;
};

export type SceneHandle = {
  refreshTheme: () => void;
  setReducedMotion: (v: boolean) => void;
  destroy: () => void;
};

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
