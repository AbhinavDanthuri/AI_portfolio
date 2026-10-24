import { rlBenchmark } from '../../content/profile';
import { Edge, Markers, Node, type DiagramEdge, type DiagramNode } from './diagram';

/** Resume figures, indexed so static autoscaling = 100. Bars are drawn to the same 0–100 scale. */
export function BenchmarkChart() {
  const ticks = [0, 25, 50, 75, 100];
  return (
    <figure className="bench">
      <figcaption className="bench__caption">
        <span className="mono">Q-learning agent vs static autoscaling</span>
        <span className="bench__legend" aria-hidden="true">
          <span className="bench__key bench__key--base" /> static = 100
          <span className="bench__key bench__key--agent" /> RL agent
        </span>
      </figcaption>
      <div className="visually-hidden">
        <table>
        <caption>Benchmark indexed to static autoscaling = 100</caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Static autoscaling</th>
            <th scope="col">RL agent</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {rlBenchmark.map((r) => (
            <tr key={r.metric}>
              <th scope="row">{r.metric}</th>
              <td>{r.baseline}</td>
              <td>{r.agent}</td>
              <td>{r.change}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <div className="bench__plot" aria-hidden="true">
        <div className="bench__grid">
          {ticks.map((t) => (
            <span key={t} className="bench__tick" style={{ left: `${t}%` }}>
              <span className="bench__tick-label mono">{t}</span>
            </span>
          ))}
        </div>
        {rlBenchmark.map((r) => (
          <div className="bench__row" key={r.metric}>
            <div className="bench__label">
              <span>{r.metric}</span>
              <span className="bench__change">{r.change}</span>
            </div>
            <div className="bench__bars">
              <span className="bench__bar bench__bar--base" style={{ width: `${r.baseline}%` }}>
                <span className="bench__val mono">{r.baseline}</span>
              </span>
              <span className="bench__bar bench__bar--agent" style={{ width: `${r.agent}%` }}>
                <span className="bench__val mono">{r.agent}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="bench__note">Indexed values. Static autoscaling = 100, lower is better. Measured across varying cloud workloads.</p>
    </figure>
  );
}

const NODES: DiagramNode[] = [
  { id: 'env', label: 'Cloud workload', sub: 'environment', x: 8, y: 118, w: 138, h: 58, kind: 'io' },
  { id: 'agent', label: 'Q-learning agent', sub: 'learned policy', x: 206, y: 118, w: 146, h: 58, kind: 'agent' },
];
const EDGES: DiagramEdge[] = [
  {
    id: 'state',
    d: 'M77 112 C 77 52, 130 40, 180 40 C 230 40, 279 52, 279 108',
    kind: 'flow',
    label: { text: 'workload state', x: 180, y: 30 },
  },
  {
    id: 'action',
    d: 'M262 182 C 262 236, 226 252, 180 252 C 134 252, 96 236, 96 190',
    kind: 'flow',
    label: { text: 'scaling decision', x: 180, y: 274 },
  },
  {
    id: 'reward',
    d: 'M146 147 H200',
    kind: 'loop',
    label: { text: 'reward', x: 173, y: 139 },
  },
];

/** How the scaling problem is framed as RL. A simplified, standard Q-learning loop. */
export function QLoop() {
  return (
    <figure className="qloop">
      <svg className="dg" viewBox="0 0 360 290" role="img" aria-label="Reinforcement learning loop: the cloud workload provides state, the Q-learning agent picks a scaling decision, and a reward signal updates the agent.">
        <Markers id="ql" />
        {EDGES.map((e) => (
          <Edge key={e.id} edge={e} markerId="ql" state="on" />
        ))}
        {NODES.map((n) => (
          <Node key={n.id} node={n} state="active" />
        ))}
      </svg>
      <figcaption className="mono">How the problem is framed · simplified Q-learning loop</figcaption>
    </figure>
  );
}
