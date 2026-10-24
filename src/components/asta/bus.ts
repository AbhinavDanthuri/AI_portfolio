/**
 * Tiny event bus between Asta and the rest of the page.
 * Components stay independent: they announce what happened, Asta listens.
 */
export type AstaEvents = {
  /** Asta asks the agent graph to run its trace. */
  'asta:run-trace': undefined;
  /** The agent graph moved to a node during a trace. */
  'asta:trace-step': { node: string; tone?: 'warn' | 'ok' };
  /** A trace finished. */
  'asta:trace-done': undefined;
  /** Asta sets SILENT's confidence slider. */
  'asta:gate': { value: number };
  /** SILENT's route flipped from the agent path to the direct path. */
  'asta:gate-flipped': undefined;
  /** Asta is inside the hero scene and acts as the query (client coordinates). */
  'asta:query': { x: number; y: number };
  'asta:query-end': undefined;
};

export function emit<K extends keyof AstaEvents>(name: K, ...detail: AstaEvents[K] extends undefined ? [] : [AstaEvents[K]]) {
  window.dispatchEvent(new CustomEvent(name, { detail: detail[0] }));
}

export function on<K extends keyof AstaEvents>(name: K, fn: (detail: AstaEvents[K]) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<AstaEvents[K]>).detail);
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}
