import type { KeyboardEvent } from 'react';

/** Shared SVG building blocks for the architecture diagrams. */

export type NodeKind = 'io' | 'agent' | 'model' | 'store' | 'gate';

export type DiagramNode = {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: NodeKind;
};

export type EdgeKind = 'flow' | 'loop' | 'data';

export type DiagramEdge = {
  id: string;
  d: string;
  kind: EdgeKind;
  label?: { text: string; x: number; y: number; anchor?: 'start' | 'middle' | 'end'; rotate?: number };
};

export function Markers({ id }: { id: string }) {
  return (
    <defs>
      {(['flow', 'loop', 'data', 'on'] as const).map((k) => (
        <marker
          key={k}
          id={`${id}-arrow-${k}`}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M1 1 L9 5 L1 9" className={`dg-arrow dg-arrow--${k}`} />
        </marker>
      ))}
    </defs>
  );
}

type NodeProps = {
  node: DiagramNode;
  state?: 'idle' | 'active' | 'visited' | 'warn' | 'dim';
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export function Node({ node, state = 'idle', selected, onSelect }: NodeProps) {
  const interactive = !!onSelect;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(node.id);
    }
  };
  const cx = node.x + node.w / 2;
  const isGate = node.kind === 'gate';
  return (
    <g
      className={`dg-node dg-node--${node.kind} is-${state}${selected ? ' is-selected' : ''}${interactive ? ' is-interactive' : ''}`}
      data-node={node.id}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? !!selected : undefined}
      onClick={interactive ? () => onSelect?.(node.id) : undefined}
      onKeyDown={interactive ? onKey : undefined}
    >
      {isGate ? (
        <polygon
          className="dg-node__box"
          points={`${cx},${node.y} ${node.x + node.w},${node.y + node.h / 2} ${cx},${node.y + node.h} ${node.x},${node.y + node.h / 2}`}
        />
      ) : (
        <rect className="dg-node__box" x={node.x} y={node.y} width={node.w} height={node.h} rx={node.kind === 'store' ? 14 : 5} />
      )}
      <text className="dg-node__label" x={cx} y={node.y + node.h / 2 + (node.sub && !isGate ? -3 : 4)} textAnchor="middle">
        {node.label}
      </text>
      {node.sub && !isGate && (
        <text className="dg-node__sub" x={cx} y={node.y + node.h / 2 + 14} textAnchor="middle">
          {node.sub}
        </text>
      )}
    </g>
  );
}

type EdgeProps = { edge: DiagramEdge; markerId: string; state?: 'idle' | 'on' | 'dim' };

export function Edge({ edge, markerId, state = 'idle' }: EdgeProps) {
  const marker = state === 'on' && edge.kind !== 'loop' ? 'on' : edge.kind;
  return (
    <g className={`dg-edge dg-edge--${edge.kind} is-${state}`}>
      <path d={edge.d} markerEnd={edge.kind === 'data' ? undefined : `url(#${markerId}-arrow-${marker})`} />
      {edge.label && (
        <text
          className="dg-edge__label"
          x={edge.label.x}
          y={edge.label.y}
          textAnchor={edge.label.anchor ?? 'middle'}
          transform={edge.label.rotate ? `rotate(${edge.label.rotate} ${edge.label.x} ${edge.label.y})` : undefined}
        >
          {edge.label.text}
        </text>
      )}
    </g>
  );
}
