import { useEffect, useMemo, useRef, useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { useReducedMotion } from '../../hooks/useMediaQuery';
import { emit, on } from '../asta/bus';
import { Edge, Markers, Node, type DiagramEdge, type DiagramNode } from './diagram';

/** The Bug Investigator's LangGraph pipeline, as described on the resume. */

const DETAILS: Record<string, { title: string; body: string }> = {
  issue: { title: 'GitHub issue', body: 'The input. A bug report pulled from the repository through the GitHub API.' },
  planner: { title: 'Planner agent', body: 'Works out how to approach the investigation before any searching starts.' },
  investigator: {
    title: 'Investigator agent',
    body: 'Searches the repo’s code, docs, past issues and commits for the likely root cause, using FAISS for retrieval.',
  },
  fix: { title: 'Fix agent', body: 'Turns the root cause into a suggested fix and test cases.' },
  critic: {
    title: 'Critic agent',
    body: 'Reviews the answer before anyone sees it. If it’s weak, the graph sends it back for another pass.',
  },
  report: { title: 'Report', body: 'A debugging report, a suggested fix and test cases.' },
  mysql: { title: 'Run history', body: 'Every run is saved in MySQL, so any result can be traced back later.' },
  sources: {
    title: 'Retrieval sources',
    body: 'Code, docs, past issues and commits. Root causes often show up in an old issue or a commit message before they show up in code.',
  },
};

type Layout = { w: number; h: number; nodes: DiagramNode[]; edges: DiagramEdge[]; sources: { x: number; y: number; w: number; label: string }[]; bus: { d: string; label: { x: number; y: number } } };

const WIDE: Layout = (() => {
  const W = 150;
  const H = 58;
  const y = 168;
  const nodes: DiagramNode[] = [
    { id: 'issue', label: 'GitHub issue', sub: 'input', x: 16, y, w: 132, h: H, kind: 'io' },
    { id: 'planner', label: 'Planner', sub: 'agent', x: 196, y, w: W, h: H, kind: 'agent' },
    { id: 'investigator', label: 'Investigator', sub: 'agent', x: 384, y, w: W, h: H, kind: 'agent' },
    { id: 'fix', label: 'Fix', sub: 'agent', x: 572, y, w: W, h: H, kind: 'agent' },
    { id: 'critic', label: 'Critic', sub: 'agent', x: 760, y, w: W, h: H, kind: 'agent' },
    { id: 'report', label: 'Report', sub: 'root cause · fix · tests', x: 760, y: 352, w: W + 40, h: H, kind: 'io' },
    { id: 'mysql', label: 'Run history', sub: 'MySQL', x: 520, y: 352, w: W, h: H, kind: 'store' },
  ];
  const edges: DiagramEdge[] = [
    { id: 'issue-planner', d: 'M148 197 H190', kind: 'flow' },
    { id: 'planner-investigator', d: 'M346 197 H378', kind: 'flow' },
    { id: 'investigator-fix', d: 'M534 197 H566', kind: 'flow' },
    { id: 'fix-critic', d: 'M722 197 H754', kind: 'flow' },
    {
      id: 'critic-investigator',
      d: 'M800 226 C 800 284, 760 290, 700 290 L 520 290 C 470 290, 459 278, 459 232',
      kind: 'loop',
      label: { text: 'weak answer → another pass', x: 630, y: 280 },
    },
    {
      id: 'critic-report',
      d: 'M870 226 V346',
      kind: 'flow',
      label: { text: 'accepted', x: 880, y: 292, anchor: 'start' },
    },
    { id: 'report-mysql', d: 'M760 381 H676', kind: 'flow' },
  ];
  const cx = 459;
  const sources = ['code', 'docs', 'past issues', 'commits'].map((label, i) => ({
    x: cx + (i - 1.5) * 112 - 50,
    y: 24,
    w: 100,
    label,
  }));
  return {
    w: 960,
    h: 430,
    nodes,
    edges,
    sources,
    bus: { d: `M${cx - 168} 92 H${cx + 168} M${cx} 92 V162`, label: { x: cx + 176, y: 96 } },
  };
})();

const TALL: Layout = (() => {
  const W = 168;
  const H = 54;
  const x = 96;
  const nodes: DiagramNode[] = [
    { id: 'issue', label: 'GitHub issue', sub: 'input', x, y: 12, w: W, h: H, kind: 'io' },
    { id: 'planner', label: 'Planner', sub: 'agent', x, y: 104, w: W, h: H, kind: 'agent' },
    { id: 'investigator', label: 'Investigator', sub: 'agent', x, y: 300, w: W, h: H, kind: 'agent' },
    { id: 'fix', label: 'Fix', sub: 'agent', x, y: 392, w: W, h: H, kind: 'agent' },
    { id: 'critic', label: 'Critic', sub: 'agent', x, y: 484, w: W, h: H, kind: 'agent' },
    { id: 'report', label: 'Report', sub: 'root cause · fix · tests', x: x - 16, y: 600, w: W + 32, h: H, kind: 'io' },
    { id: 'mysql', label: 'Run history', sub: 'MySQL', x, y: 696, w: W, h: H, kind: 'store' },
  ];
  const edges: DiagramEdge[] = [
    { id: 'issue-planner', d: 'M180 66 V98', kind: 'flow' },
    { id: 'planner-investigator', d: 'M180 158 V182', kind: 'data' },
    { id: 'investigator-fix', d: 'M180 354 V386', kind: 'flow' },
    { id: 'fix-critic', d: 'M180 446 V478', kind: 'flow' },
    {
      id: 'critic-investigator',
      d: 'M96 511 C 40 511, 34 500, 34 470 L 34 360 C 34 333, 44 327, 90 327',
      kind: 'loop',
      label: { text: 'weak → another pass', x: 24, y: 420, rotate: -90 },
    },
    { id: 'critic-report', d: 'M180 538 V594', kind: 'flow', label: { text: 'accepted', x: 190, y: 570, anchor: 'start' } },
    { id: 'report-mysql', d: 'M180 654 V690', kind: 'flow' },
  ];
  const sources = ['code', 'docs', 'past issues', 'commits'].map((label, i) => ({
    x: 12 + i * 85,
    y: 186,
    w: 80,
    label,
  }));
  return {
    w: 360,
    h: 760,
    nodes,
    edges,
    sources,
    bus: { d: 'M52 252 H308 M180 252 V294', label: { x: 316, y: 248 } },
  };
})();

type Step = { node: string; edge?: string; log: string; tone?: 'warn' | 'ok' };
const RUN: Step[] = [
  { node: 'issue', log: 'issue received' },
  { node: 'planner', edge: 'issue-planner', log: 'planner: lay out what to check' },
  { node: 'investigator', edge: 'planner-investigator', log: 'investigator: search code, docs, issues, commits' },
  { node: 'fix', edge: 'investigator-fix', log: 'fix: draft a fix and tests' },
  { node: 'critic', edge: 'fix-critic', log: 'critic: answer is weak', tone: 'warn' },
  { node: 'investigator', edge: 'critic-investigator', log: 'investigator: pass 2', tone: 'warn' },
  { node: 'fix', edge: 'investigator-fix', log: 'fix: revise' },
  { node: 'critic', edge: 'fix-critic', log: 'critic: accepted', tone: 'ok' },
  { node: 'report', edge: 'critic-report', log: 'report: root cause, fix, test cases' },
  { node: 'mysql', edge: 'report-mysql', log: 'run saved to history' },
];

export function AgentGraph() {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const layout = width < 620 ? TALL : WIDE;
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState('critic');
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = () => {
    window.clearTimeout(timer.current);
    if (reduced) {
      setStep(RUN.length - 1);
      return;
    }
    setRunning(true);
    setStep(0);
    const advance = (i: number) => {
      timer.current = window.setTimeout(() => {
        if (i >= RUN.length) {
          setRunning(false);
          return;
        }
        setStep(i);
        advance(i + 1);
      }, 850);
    };
    advance(1);
  };

  // Let Asta start a run, and tell it where the trace is.
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => on('asta:run-trace', () => runRef.current()), []);
  useEffect(() => {
    if (step < 0) return;
    const s = RUN[step]!;
    emit('asta:trace-step', { node: s.node, tone: s.tone });
    if (step === RUN.length - 1) emit('asta:trace-done');
  }, [step]);

  const { nodeState, edgeState, sourcesOn } = useMemo(() => {
    const nodeState: Record<string, 'idle' | 'active' | 'visited' | 'warn'> = {};
    const edgeState: Record<string, 'idle' | 'on'> = {};
    let sourcesOn = false;
    if (step >= 0) {
      for (let i = 0; i <= step; i++) {
        const s = RUN[i]!;
        nodeState[s.node] = 'visited';
        if (s.edge) edgeState[s.edge] = 'on';
      }
      const cur = RUN[step]!;
      nodeState[cur.node] = cur.tone === 'warn' ? 'warn' : 'active';
      sourcesOn = cur.node === 'investigator';
    }
    return { nodeState, edgeState, sourcesOn };
  }, [step]);

  const detail = DETAILS[selected] ?? DETAILS.critic!;
  const mid = 'ag';

  return (
    <div className="ag">
      <div className="ag__canvas" ref={wrapRef}>
        <svg
          className="dg"
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          role="group"
          aria-label="Bug Investigator agent graph. Select a node to read what it does."
        >
          <Markers id={mid} />
          <g className={`dg-sources${sourcesOn ? ' is-on' : ''}`}>
            {layout.sources.map((s) => (
              <g
                key={s.label}
                className={`dg-chip${selected === 'sources' ? ' is-selected' : ''}`}
                role="button"
                tabIndex={0}
                
                onClick={() => setSelected('sources')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected('sources');
                  }
                }}
              >
                <rect x={s.x} y={s.y} width={s.w} height={34} rx={17} />
                <text x={s.x + s.w / 2} y={s.y + 21} textAnchor="middle">
                  {s.label}
                </text>
                <path d={`M${s.x + s.w / 2} ${s.y + 34} V${layout === WIDE ? 92 : s.y + 66}`} className="dg-chip__drop" />
              </g>
            ))}
            <path d={layout.bus.d} className="dg-bus" markerEnd={`url(#${mid}-arrow-flow)`} />
            <text className="dg-edge__label dg-bus__label" x={layout.bus.label.x} y={layout.bus.label.y} textAnchor="start">
              FAISS
            </text>
          </g>
          {layout.edges.map((e) => (
            <Edge key={e.id} edge={e} markerId={mid} state={edgeState[e.id] ?? 'idle'} />
          ))}
          {layout.nodes.map((n) => (
            <Node key={n.id} node={n} state={nodeState[n.id] ?? 'idle'} selected={selected === n.id} onSelect={setSelected} />
          ))}
        </svg>
      </div>

      <div className="ag__side">
        <div className="ag__detail" aria-live="polite">
          <p className="mono ag__kicker">Selected node</p>
          <h4>{detail.title}</h4>
          <p>{detail.body}</p>
        </div>

        <div className="ag__run">
          <button type="button" className="btn" onClick={run} disabled={running}>
            {running ? 'Running…' : step >= 0 ? 'Run it again' : 'Run a trace'}
          </button>
          <ol className="ag__log mono" aria-live="polite">
            {step < 0 ? (
              <li className="ag__log-empty">Press run to step through one investigation.</li>
            ) : (
              RUN.slice(0, step + 1).map((s, i) => (
                <li key={i} className={s.tone ? `is-${s.tone}` : undefined}>
                  <span className="ag__log-n">{String(i + 1).padStart(2, '0')}</span>
                  {s.log}
                </li>
              ))
            )}
          </ol>
          <p className="ag__note">Illustrative run. It shows the control flow, not real output.</p>
        </div>
      </div>
    </div>
  );
}
