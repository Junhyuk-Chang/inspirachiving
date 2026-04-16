import { useEffect, useRef } from "react";
import type { Item } from "../types";
import { groupByAttribute } from "../lib/classifier";

interface Props {
  items: Item[];
  onSelectFilter: (key: string) => void;
}

interface Node {
  id: string;
  label: string;
  type: "attr" | "item";
  count?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
}

export default function AttributeGraph({ items, onSelectFilter }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;

    const grouped = groupByAttribute(items);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeMap = new Map<string, Node>();

    // 속성 노드 (2개 이상 아이템 공유하는 것만)
    for (const [attrKey, attrItems] of grouped.entries()) {
      if (attrItems.length < 2) continue;
      const [, val] = attrKey.split(":");
      const attrNode: Node = {
        id: attrKey,
        label: attrItems[0].attributes.find(
          (a) => `${a.key}:${a.value}` === attrKey
        )?.label ?? val,
        type: "attr",
        count: attrItems.length,
        x: W / 2 + (Math.random() - 0.5) * 200,
        y: H / 2 + (Math.random() - 0.5) * 200,
        vx: 0, vy: 0,
      };
      nodes.push(attrNode);
      nodeMap.set(attrKey, attrNode);

      for (const item of attrItems) {
        if (!nodeMap.has(item.id)) {
          const itemNode: Node = {
            id: item.id,
            label: item.type === "text"
              ? item.content.slice(0, 12) + "…"
              : item.meta?.title?.slice(0, 12) ?? item.type,
            type: "item",
            x: W / 2 + (Math.random() - 0.5) * 300,
            y: H / 2 + (Math.random() - 0.5) * 300,
            vx: 0, vy: 0,
          };
          nodes.push(itemNode);
          nodeMap.set(item.id, itemNode);
        }
        edges.push({ source: attrKey, target: item.id });
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Force-directed layout (간단 버전)
    const tick = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const k = 80;

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = (k * k) / dist;
          ns[i].vx -= (force * dx) / dist;
          ns[i].vy -= (force * dy) / dist;
          ns[j].vx += (force * dx) / dist;
          ns[j].vy += (force * dy) / dist;
        }
      }

      // Attraction
      for (const e of es) {
        const s = nodeMap.get(e.source)!;
        const t = nodeMap.get(e.target)!;
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist * dist) / k;
        s.vx += (force * dx) / dist;
        s.vy += (force * dy) / dist;
        t.vx -= (force * dx) / dist;
        t.vy -= (force * dy) / dist;
      }

      // Apply + damping + bounds
      for (const n of ns) {
        n.x = Math.max(20, Math.min(W - 20, n.x + n.vx * 0.1));
        n.y = Math.max(20, Math.min(H - 20, n.y + n.vy * 0.1));
        n.vx *= 0.8;
        n.vy *= 0.8;
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Edges
      ctx.strokeStyle = "rgba(150,150,180,0.3)";
      ctx.lineWidth = 1;
      for (const e of es) {
        const s = nodeMap.get(e.source)!;
        const t = nodeMap.get(e.target)!;
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }

      // Nodes
      for (const n of ns) {
        const r = n.type === "attr" ? 14 + (n.count ?? 1) * 2 : 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.min(r, 28), 0, Math.PI * 2);
        ctx.fillStyle = n.type === "attr" ? "#7c6ef7" : "#c4bfff55";
        ctx.fill();
        ctx.strokeStyle = n.type === "attr" ? "#5a4de6" : "#7c6ef7";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = n.type === "attr" ? "#fff" : "#ccc";
        ctx.font = n.type === "attr" ? "bold 11px sans-serif" : "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, n.x, n.y + (n.type === "attr" ? 0 : 18));
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (const n of nodesRef.current) {
        const dx = n.x - mx;
        const dy = n.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 20 && n.type === "attr") {
          onSelectFilter(n.id);
        }
      }
    };
    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("click", handleClick);
    };
  }, [items, onSelectFilter]);

  if (items.length < 2) {
    return (
      <div className="graph-empty">
        아이템을 2개 이상 저장하면 속성 연결 그래프가 나타납니다.
      </div>
    );
  }

  return (
    <div className="graph-wrapper">
      <p className="graph-hint">속성 노드(보라색)를 클릭하면 필터됩니다</p>
      <canvas ref={canvasRef} width={600} height={400} className="graph-canvas" />
    </div>
  );
}
