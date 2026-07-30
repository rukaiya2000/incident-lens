"use client";

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
} from "d3-force";
import { useEffect, useRef, useState } from "react";
import { getGraphData, GraphNode, GraphNodeType } from "../../../lib/api";

interface SimNode extends GraphNode, SimulationNodeDatum {}
type SimLink = SimulationLinkDatum<SimNode> & { type: string };

const TYPE_COLOR: Record<GraphNodeType, string> = {
  Investigation: "#0f172a",
  Video: "#2563eb",
  Scene: "#94a3b8",
  Event: "#d97706",
  Person: "#059669",
  Officer: "#0d9488",
  Object: "#7c3aed",
  Document: "#4f46e5",
};

const TYPE_RADIUS: Record<GraphNodeType, number> = {
  Investigation: 15,
  Video: 11,
  Scene: 5,
  Event: 6,
  Person: 8,
  Officer: 8,
  Object: 7,
  Document: 9,
};

const WIDTH = 640;
const HEIGHT = 520;

export default function GraphView({
  investigationId,
  highlightVideoIds,
}: {
  investigationId: string;
  highlightVideoIds?: Set<string>;
}) {
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<SimLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SimNode | null>(null);
  const dragRef = useRef<{ node: SimNode } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/id change
    setLoading(true);
    setError(null);
    getGraphData(investigationId)
      .then((data) => {
        if (cancelled) return;
        const simNodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
        const simLinks: SimLink[] = data.edges.map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
        }));

        const simulation = forceSimulation(simNodes)
          .force(
            "link",
            forceLink<SimNode, SimLink>(simLinks)
              .id((d) => d.id)
              .distance(45)
              .strength(0.5)
          )
          .force("charge", forceManyBody().strength(-140))
          .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
          .force(
            "collide",
            forceCollide<SimNode>((d) => (TYPE_RADIUS[d.type] ?? 6) + 6)
          )
          .stop();

        for (let i = 0; i < 300; i++) simulation.tick();

        setNodes(simNodes);
        setLinks(simLinks);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load graph"))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [investigationId]);

  function handlePointerDown(node: SimNode, e: React.PointerEvent) {
    e.stopPropagation();
    dragRef.current = { node };
    node.fx = node.x;
    node.fy = node.y;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    dragRef.current.node.fx = x;
    dragRef.current.node.fy = y;
    dragRef.current.node.x = x;
    dragRef.current.node.y = y;
    forceRerender((n) => n + 1);
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  if (loading) {
    return <div className="h-[520px] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />;
  }
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        {(Object.keys(TYPE_COLOR) as GraphNodeType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TYPE_COLOR[type] }}
            />
            {type}
          </span>
        ))}
      </div>

      <div className="flex gap-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {links.map((link, i) => {
            const source = link.source as SimNode;
            const target = link.target as SimNode;
            if (typeof source === "string" || typeof target === "string") return null;
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="currentColor"
                className="text-zinc-300 dark:text-zinc-700"
                strokeWidth={1}
              />
            );
          })}
          {nodes.map((node) => {
            const isHighlighted = highlightVideoIds?.has(node.id);
            const radius = TYPE_RADIUS[node.type] ?? 6;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                onPointerDown={(e) => handlePointerDown(node, e)}
                onClick={() => setSelected(node)}
                className="cursor-pointer"
              >
                {isHighlighted && (
                  <circle r={radius + 5} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.8} />
                )}
                <circle
                  r={radius}
                  fill={TYPE_COLOR[node.type] ?? "#999"}
                  stroke={selected?.id === node.id ? "#f59e0b" : "white"}
                  strokeWidth={selected?.id === node.id ? 2.5 : 1}
                />
              </g>
            );
          })}
        </svg>

        <div className="w-56 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
          {selected ? (
            <div className="flex flex-col gap-1">
              <span
                className="w-fit rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: TYPE_COLOR[selected.type] }}
              >
                {selected.type}
              </span>
              <p className="mt-1 break-words">{selected.label}</p>
            </div>
          ) : (
            <p className="text-zinc-500">Click a node to see details. Drag to reposition.</p>
          )}
        </div>
      </div>
    </div>
  );
}
