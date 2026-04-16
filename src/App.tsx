import { useState, useEffect, useCallback } from "react";
import type { Item } from "./types";
import { classifyItem, extractImageColors } from "./lib/classifier";
import { saveItem, getAllItems, deleteItem } from "./lib/storage";
import PasteZone from "./components/PasteZone";
import ItemCard from "./components/ItemCard";
import FilterBar from "./components/FilterBar";
import AttributeGraph from "./components/AttributeGraph";
import "./App.css";

type View = "grid" | "graph";

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllItems().then(setItems);
  }, []);

  const addItem = useCallback(async (partial: Omit<Item, "id" | "attributes" | "createdAt">) => {
    setLoading(true);
    try {
      const attributes = await classifyItem(partial.type, partial.content);

      if (partial.type === "image") {
        const { palette, brightness } = await extractImageColors(partial.content);
        for (const color of palette) {
          attributes.push({ key: "color", value: color, label: `🎨 ${color}` });
        }
        attributes.push({ key: "brightness", value: brightness, label: `💡 ${brightness}` });
      }

      const item: Item = {
        id: genId(),
        ...partial,
        attributes,
        createdAt: new Date().toISOString(),
      };
      await saveItem(item);
      setItems((prev) => [item, ...prev]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleText = (text: string) =>
    addItem({ type: "text", content: text, note: "" });

  const handleImage = (dataUrl: string) =>
    addItem({ type: "image", content: dataUrl, note: "" });

  const handleUrl = async (url: string) => {
    let meta: Item["meta"] = { domain: new URL(url).hostname.replace("www.", "") };
    try {
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      const { contents } = await res.json();
      const parser = new DOMParser();
      const doc = parser.parseFromString(contents, "text/html");
      const og = (prop: string) =>
        doc.querySelector(`meta[property='og:${prop}']`)?.getAttribute("content") ??
        doc.querySelector(`meta[name='${prop}']`)?.getAttribute("content") ??
        undefined;
      meta = {
        title: og("title") ?? doc.title,
        description: og("description"),
        image: og("image"),
        domain: new URL(url).hostname.replace("www.", ""),
      };
    } catch {
      // 프록시 실패 시 URL만 저장
    }
    addItem({ type: "url", content: url, meta, note: "" });
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const filtered = items.filter((item) => {
    if (activeFilter) {
      const [fKey, fVal] = activeFilter.split(":");
      if (!item.attributes.some((a) => a.key === fKey && a.value === fVal)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const inContent = item.content.toLowerCase().includes(q);
      const inTitle = item.meta?.title?.toLowerCase().includes(q) ?? false;
      const inAttr = item.attributes.some((a) => a.value.toLowerCase().includes(q));
      if (!inContent && !inTitle && !inAttr) return false;
    }
    return true;
  });

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">inspirachiving</h1>
        <div className="view-toggle">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>
            ▦ 그리드
          </button>
          <button className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}>
            ◎ 그래프
          </button>
        </div>
      </header>

      <PasteZone onText={handleText} onImage={handleImage} onUrl={handleUrl} />

      {loading && <div className="loading">분류 중...</div>}

      <FilterBar
        items={items}
        activeFilter={activeFilter}
        onFilter={setActiveFilter}
        search={search}
        onSearch={setSearch}
      />

      {view === "graph" ? (
        <AttributeGraph
          items={items}
          onSelectFilter={(k) => { setActiveFilter(k); setView("grid"); }}
        />
      ) : (
        <main className="grid">
          {filtered.length === 0 && (
            <p className="empty">아직 아이템이 없습니다. 글귀나 이미지를 붙여넣어 보세요.</p>
          )}
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
              onDelete={() => handleDelete(item.id)}
              highlightAttr={activeFilter ?? undefined}
            />
          ))}
        </main>
      )}

      <footer className="footer">
        {items.length}개 아카이빙됨 · inspirachiving by Junhyuk-Chang
      </footer>
    </div>
  );
}
