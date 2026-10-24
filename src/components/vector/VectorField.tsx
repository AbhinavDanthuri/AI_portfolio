import { useEffect, useRef } from 'react';
import type { SceneHandle } from './space';
import { useMediaQuery, useReducedMotion } from '../../hooks/useMediaQuery';
import type { Theme } from '../../hooks/useTheme';
import './vector.css';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

type Props = { theme: Theme };

/**
 * The hero's retrieval scene. Starts after first paint so it never blocks the headline.
 * Desktop: three.js (code-split, fetched only here). Phones and browsers without WebGL:
 * the Canvas 2D renderer of the same scene.
 */
export function VectorField({ theme }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const reduced = useReducedMotion();
  const compact = useMediaQuery('(max-width: 719px)');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const opts = { readout: readoutRef.current, reducedMotion: reduced, compact };

    const start = async () => {
      try {
        // Phones get the Canvas 2D renderer: same scene, no three.js download or GPU warm-up.
        if (!compact && hasWebGL()) {
          const { createWebGLScene } = await import('./webglScene');
          if (!cancelled) handleRef.current = createWebGLScene(host, opts);
        } else throw new Error('use canvas');
      } catch {
        const { createCanvasScene } = await import('./canvasScene');
        if (!cancelled) handleRef.current = createCanvasScene(host, opts);
      }
      if (!cancelled) host.dataset.ready = 'true';
    };

    const hasIdle = typeof window.requestIdleCallback === 'function';
    const id = hasIdle
      ? window.requestIdleCallback(() => void start(), { timeout: 900 })
      : globalThis.setTimeout(() => void start(), 200);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(id as number);
      else globalThis.clearTimeout(id as ReturnType<typeof setTimeout>);
      handleRef.current?.destroy();
      handleRef.current = null;
      delete host.dataset.ready;
    };
    // Rebuild when the layout class changes (point count differs between compact and full).
  }, [compact]);

  useEffect(() => {
    // Wait a tick so the new CSS variables are applied before reading them.
    const t = window.setTimeout(() => handleRef.current?.refreshTheme(), 30);
    return () => window.clearTimeout(t);
  }, [theme]);

  useEffect(() => {
    handleRef.current?.setReducedMotion(reduced);
  }, [reduced]);

  return (
    <figure className="vf" aria-labelledby="vf-caption">
      <div className="vf-stage" ref={hostRef} />
      <figcaption id="vf-caption" className="vf-caption">
        <span className="vf-caption__row">
          <span className="mono vf-caption__key">top-6 retrieved</span>
          <span className="mono vf-caption__val" ref={readoutRef} aria-live="off">
            code 3 · past issues 2 · commits 1
          </span>
        </span>
        <span className="vf-caption__note">
          {compact ? 'Drag across the space' : 'Move your cursor'} to move the query. Lines show its six nearest
          neighbours across the four sources my bug investigator searches. Illustration, not real embeddings.
        </span>
      </figcaption>
    </figure>
  );
}
