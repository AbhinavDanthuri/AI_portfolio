import { useEffect, useId, useRef, useState } from 'react';
import { emit, on } from '../asta/bus';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Edge, Markers, Node, type DiagramEdge, type DiagramNode } from './diagram';

/** SILENT's routing: the CNN answers alone when confident; agents step in when it isn't. */

const THRESHOLD = 60; // example value for the demo, not the project's tuned threshold

type Layout = { w: number; h: number; nodes: DiagramNode[]; edges: DiagramEdge[] };

const WIDE: Layout = {
  w: 820,
  h: 300,
  nodes: [
    { id: 'video', label: 'Video', sub: 'frames', x: 8, y: 92, w: 104, h: 56, kind: 'io' },
    { id: 'lips', label: 'Lip region', sub: 'OpenCV', x: 146, y: 92, w: 118, h: 56, kind: 'model' },
    { id: 'cnn', label: 'CNN', sub: 'PyTorch', x: 298, y: 92, w: 110, h: 56, kind: 'model' },
    { id: 'gate', label: 'confident?', x: 444, y: 76, w: 112, h: 88, kind: 'gate' },
    { id: 'agents', label: 'Agent correction', sub: 'LangGraph · FAISS RAG · LLM', x: 418, y: 222, w: 214, h: 60, kind: 'agent' },
    { id: 'final', label: 'Final sentence', sub: 'FastAPI UI', x: 664, y: 92, w: 148, h: 56, kind: 'io' },
  ],
  edges: [
    { id: 'video-lips', d: 'M112 120 H140', kind: 'flow' },
    { id: 'lips-cnn', d: 'M264 120 H292', kind: 'flow' },
    { id: 'cnn-gate', d: 'M408 120 H438', kind: 'flow' },
    { id: 'direct', d: 'M556 120 H658', kind: 'flow', label: { text: 'yes', x: 607, y: 110 } },
    { id: 'unsure', d: 'M500 164 V216', kind: 'loop', label: { text: 'no', x: 512, y: 196, anchor: 'start' } },
    { id: 'corrected', d: 'M632 252 H700 C 726 252, 738 240, 738 214 V154', kind: 'loop' },
  ],
};

const TALL: Layout = {
  w: 340,
  h: 600,
  nodes: [
    { id: 'video', label: 'Video', sub: 'frames', x: 100, y: 8, w: 140, h: 52, kind: 'io' },
    { id: 'lips', label: 'Lip region', sub: 'OpenCV', x: 100, y: 96, w: 140, h: 52, kind: 'model' },
    { id: 'cnn', label: 'CNN', sub: 'PyTorch', x: 100, y: 184, w: 140, h: 52, kind: 'model' },
    { id: 'gate', label: 'confident?', x: 110, y: 270, w: 120, h: 86, kind: 'gate' },
    { id: 'agents', label: 'Agent correction', sub: 'LangGraph · RAG · LLM', x: 150, y: 396, w: 182, h: 56, kind: 'agent' },
    { id: 'final', label: 'Final sentence', sub: 'FastAPI UI', x: 60, y: 536, w: 160, h: 52, kind: 'io' },
  ],
  edges: [
    { id: 'video-lips', d: 'M170 60 V90', kind: 'flow' },
    { id: 'lips-cnn', d: 'M170 148 V178', kind: 'flow' },
    { id: 'cnn-gate', d: 'M170 236 V264', kind: 'flow' },
    { id: 'direct', d: 'M130 340 C 104 380, 104 470, 120 530', kind: 'flow', label: { text: 'yes', x: 92, y: 440, anchor: 'end' } },
    { id: 'unsure', d: 'M212 340 C 240 360, 241 372, 241 390', kind: 'loop', label: { text: 'no', x: 252, y: 372, anchor: 'start' } },
    { id: 'corrected', d: 'M241 452 C 241 500, 214 512, 196 530', kind: 'loop' },
  ],
};

export function ConfidenceGate() {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const layout = width < 560 ? TALL : WIDE;
  const [confidence, setConfidence] = useState(42);
  const confident = confidence >= THRESHOLD;
  const sliderId = useId();
  const sawAgentRoute = useRef(!confident);

  // Asta can move the slider during its tour.
  useEffect(() => on('asta:gate', ({ value }) => setConfidence(value)), []);
  useEffect(() => {
    if (!confident) sawAgentRoute.current = true;
    else if (sawAgentRoute.current) emit('asta:gate-flipped');
  }, [confident]);
  const mid = 'cg';

  const nodeState = (id: string) => {
    if (id === 'agents') return confident ? 'dim' : 'warn';
    return 'active';
  };
  const edgeState = (id: string): 'on' | 'dim' => {
    if (id === 'direct') return confident ? 'on' : 'dim';
    if (id === 'unsure' || id === 'corrected') return confident ? 'dim' : 'on';
    return 'on';
  };

  return (
    <div className="cg">
      <FrameStrip />

      <div className="cg__canvas" ref={wrapRef}>
        <svg className="dg" viewBox={`0 0 ${layout.w} ${layout.h}`} role="img" aria-label={`SILENT routing. CNN confidence ${confidence}%: ${confident ? 'the CNN prediction is used directly' : 'the agents correct the prediction'}.`}>
          <Markers id={mid} />
          {layout.edges.map((e) => (
            <Edge key={e.id} edge={e} markerId={mid} state={edgeState(e.id)} />
          ))}
          {layout.nodes.map((n) => (
            <Node key={n.id} node={n} state={nodeState(n.id)} />
          ))}
        </svg>
      </div>

      <div className="cg__control">
        <div className="cg__control-head">
          <label htmlFor={sliderId} className="mono">
            CNN confidence for this clip
          </label>
          <output htmlFor={sliderId} className={`cg__value${confident ? '' : ' is-warn'}`}>
            {confidence}%
          </output>
        </div>
        <div className="cg__track">
          <input
            id={sliderId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            aria-describedby={`${sliderId}-route`}
            style={{ ['--pct' as string]: `${confidence}%` }}
          />
          <span className="cg__threshold" style={{ left: `${THRESHOLD}%` }} aria-hidden="true">
            <span className="mono">threshold</span>
          </span>
        </div>
        <p id={`${sliderId}-route`} className="cg__route" aria-live="polite">
          {confident ? (
            <>
              <strong>Above the threshold.</strong> The CNN’s prediction goes straight to the final sentence. No LLM call.
            </>
          ) : (
            <>
              <strong className="is-warn">Below the threshold.</strong> The LangGraph agents pull context with FAISS-based RAG and an LLM corrects the prediction.
            </>
          )}
        </p>
        <p className="cg__note">Drag to try both routes. The threshold here is an example value.</p>
      </div>
    </div>
  );
}

/** Abstract lip-region frames, scanned left to right. An illustration, not project data. */
function FrameStrip() {
  const openness = [0.25, 0.55, 0.85, 0.6, 0.3, 0.45, 0.75, 0.35, 0.2];
  return (
    <figure className="cg__frames" aria-label="Illustration of lip-region frames read in sequence">
      <div className="cg__frames-row">
        {openness.map((o, i) => (
          <svg key={i} viewBox="0 0 60 44" className="cg__frame" aria-hidden="true" style={{ animationDelay: `${i * 0.18}s` }}>
            <rect x="0.5" y="0.5" width="59" height="43" rx="3" className="cg__frame-box" />
            <path
              className="cg__lip"
              d={`M12 22 Q 30 ${22 - 6 - o * 8}, 48 22 Q 30 ${22 + 6 + o * 10}, 12 22 Z`}
            />
            <path className="cg__lip-inner" d={`M18 22 Q 30 ${22 - o * 6}, 42 22 Q 30 ${22 + o * 8}, 18 22 Z`} />
          </svg>
        ))}
      </div>
      <figcaption className="mono">Lip region, frame by frame · illustration</figcaption>
    </figure>
  );
}
