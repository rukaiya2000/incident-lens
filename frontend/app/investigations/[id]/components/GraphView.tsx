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
type ViewTransform = { x: number; y: number; scale: number };

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

const COMPACT_SIZE = { width: 640, height: 520 };
const EXPANDED_SIZE = { width: 1400, height: 820 };

export default function GraphView({
  investigationId,
  highlightVideoIds,
  expanded = false,
  onExpand,
}: {
  investigationId: string;
  highlightVideoIds?: Set<string>;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const size = expanded ? EXPANDED_SIZE : COMPACT_SIZE;
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<SimLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SimNode | null>(null);
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ node: SimNode } | null>(null);
  const panRef = useRef<{ clientX: number; clientY: number; transform: ViewTransform } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/id change
    setLoading(true);
    setError(null);
    setSelected(null);
    setTransform({ x: 0, y: 0, scale: 1 });
    getGraphData(investigationId)
      .then((data) => {
        if (cancelled) return;
        const simNodes: SimNode[] = data.nodes.map((node) => ({ ...node }));
        const simLinks: SimLink[] = data.edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          type: edge.type,
        }));
        const simulation = forceSimulation(simNodes)
          .force(
            "link",
            forceLink<SimNode, SimLink>(simLinks)
              .id((node) => node.id)
              .distance(expanded ? 70 : 45)
              .strength(0.5)
          )
          .force("charge", forceManyBody().strength(expanded ? -240 : -140))
          .force("center", forceCenter(size.width / 2, size.height / 2))
          .force(
            "collide",
            forceCollide<SimNode>((node) => (TYPE_RADIUS[node.type] ?? 6) + (expanded ? 9 : 6))
          )
          .stop();

        for (let index = 0; index < 300; index++) simulation.tick();
        setNodes(simNodes);
        setLinks(simLinks);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load graph"))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [expanded, investigationId, size.height, size.width]);

  function graphPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * size.width,
      y: ((clientY - rect.top) / rect.height) * size.height,
    };
  }

  function handleNodePointerDown(node: SimNode, event: React.PointerEvent<SVGGElement>) {
    event.stopPropagation();
    dragRef.current = { node };
    node.fx = node.x;
    node.fy = node.y;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const target = event.target as Element;
    if (target.closest("[data-graph-node]")) return;
    panRef.current = { clientX: event.clientX, clientY: event.clientY, transform };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current) {
      const point = graphPoint(event.clientX, event.clientY);
      if (!point) return;
      const nodePoint = {
        x: (point.x - transform.x) / transform.scale,
        y: (point.y - transform.y) / transform.scale,
      };
      dragRef.current.node.fx = nodePoint.x;
      dragRef.current.node.fy = nodePoint.y;
      dragRef.current.node.x = nodePoint.x;
      dragRef.current.node.y = nodePoint.y;
      forceRerender((value) => value + 1);
      return;
    }
    if (panRef.current) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const start = panRef.current;
      setTransform({
        ...start.transform,
        x: start.transform.x + ((event.clientX - start.clientX) / rect.width) * size.width,
        y: start.transform.y + ((event.clientY - start.clientY) / rect.height) * size.height,
      });
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
    panRef.current = null;
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const point = graphPoint(event.clientX, event.clientY);
    if (!point) return;
    const factor = event.deltaY < 0 ? 1.12 : 0.88;
    setTransform((current) => {
      const scale = Math.min(4, Math.max(0.35, current.scale * factor));
      const ratio = scale / current.scale;
      return {
        scale,
        x: point.x - (point.x - current.x) * ratio,
        y: point.y - (point.y - current.y) * ratio,
      };
    });
  }

  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });
  const zoom = (factor: number) => setTransform((current) => ({ ...current, scale: Math.min(4, Math.max(0.35, current.scale * factor)) }));

  if (loading) {
    return <div className={`${expanded ? "h-[min(70vh,760px)]" : "h-[520px]"} animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900`} />;
  }
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          {(Object.keys(TYPE_COLOR) as GraphNodeType[]).map((type) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] }} />
              {type}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoom(1.2)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoom(0.8)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Zoom out">−</button>
          <button type="button" onClick={resetView} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">Reset</button>
          {onExpand && <button type="button" onClick={onExpand} className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90">Open full graph</button>}
        </div>
      </div>

      <div className={`flex ${expanded ? "flex-col xl:flex-row" : "flex-col"} gap-4`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.width} ${size.height}`}
          className={`${expanded ? "h-[min(70vh,760px)]" : "h-[360px]"} min-w-0 flex-1 touch-none rounded-xl border border-[var(--border)] bg-[var(--surface)]`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
            {links.map((link, index) => {
              const source = link.source as SimNode;
              const target = link.target as SimNode;
              if (typeof source === "string" || typeof target === "string") return null;
              return <line key={index} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="currentColor" className="text-zinc-300 dark:text-zinc-700" strokeWidth={1} />;
            })}
            {nodes.map((node) => {
              const isHighlighted = highlightVideoIds?.has(node.id);
              const radius = TYPE_RADIUS[node.type] ?? 6;
              return (
                <g key={node.id} data-graph-node transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`} onPointerDown={(event) => handleNodePointerDown(node, event)} onClick={() => setSelected(node)} className="cursor-grab active:cursor-grabbing">
                  {isHighlighted && <circle r={radius + 5} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.8} />}
                  <circle r={radius} fill={TYPE_COLOR[node.type] ?? "#999"} stroke={selected?.id === node.id ? "#f59e0b" : "white"} strokeWidth={selected?.id === node.id ? 2.5 : 1} />
                </g>
              );
            })}
          </g>
        </svg>

        <div className={`${expanded ? "w-full xl:w-72" : "w-full"} shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm`}>
          {selected ? (
            <div className="flex flex-col gap-1">
              <span className="w-fit rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: TYPE_COLOR[selected.type] }}>{selected.type}</span>
              <p className="mt-1 break-words">{selected.label}</p>
            </div>
          ) : (
            <p className="text-zinc-500">Scroll to zoom, drag the canvas to pan, or drag a node to reposition it.</p>
          )}
        </div>
      </div>
    </div>
  );
}