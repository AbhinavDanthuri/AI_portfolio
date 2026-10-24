import { CLUSTERS } from './space';

/** HTML labels that float over the canvas at each cluster centre, plus one for the query. */
export function createLabelLayer(host: HTMLElement) {
  const layer = document.createElement('div');
  layer.className = 'vf-labels';
  layer.setAttribute('aria-hidden', 'true');
  const clusterEls = CLUSTERS.map((c) => {
    const el = document.createElement('span');
    el.className = 'vf-label';
    el.textContent = c.label;
    layer.appendChild(el);
    return el;
  });
  const queryEl = document.createElement('span');
  queryEl.className = 'vf-label vf-label--query';
  queryEl.textContent = 'query';
  layer.appendChild(queryEl);
  host.appendChild(layer);

  return {
    placeCluster(i: number, x: number, y: number, active: boolean) {
      const el = clusterEls[i];
      if (!el) return;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.classList.toggle('is-active', active);
    },
    placeQuery(x: number, y: number) {
      queryEl.style.transform = `translate3d(${(x + 16).toFixed(1)}px, ${(y - 22).toFixed(1)}px, 0)`;
    },
    setQueryText(text: string) {
      if (queryEl.textContent !== text) queryEl.textContent = text;
    },
    destroy() {
      layer.remove();
    },
  };
}

/** Which clusters hold at least one of the current neighbours. */
export function activeClusters(clusterOf: Uint8Array, idx: Int32Array): Set<number> {
  const s = new Set<number>();
  for (const i of idx) if (i >= 0 && clusterOf[i] !== 255) s.add(clusterOf[i]!);
  return s;
}
