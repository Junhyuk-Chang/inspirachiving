import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { Item } from "./types";
import { supabase } from "./lib/supabase";
import { classifyItem, extractImageColors } from "./lib/classifier";
import { saveItem, getAllItems, deleteItem } from "./lib/storage";
import { uploadImage } from "./lib/imageUpload";
import PasteZone from "./components/PasteZone";
import ItemCard from "./components/ItemCard";
import FilterBar from "./components/FilterBar";
import AttributeGraph from "./components/AttributeGraph";
import Auth from "./components/Auth";
import "./App.css";

type View = "grid" | "graph";

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 인증 상태 감지
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 로그인 후 아이템 불러오기
  useEffect(() => {
    if (user) getAllItems().then(setItems);
    else setItems([]);
  }, [user]);

  const addItem = useCallback(async (partial: Omit<Item, "id" | "attributes" | "createdAt">) => {
    setLoading(true);
    try {
      const id = genId();
      const attributes = await classifyItem(partial.type, partial.content);

      let content = partial.content;

      if (partial.type === "image") {
        // dataURL → Supabase Storage 업로드
        const { palette, brightness } = await extractImageColors(content);
        for (const color of palette) {
          attributes.push({ key: "color", value: color, label: `🎨 ${color}` });
        }
        attributes.push({ key: "brightness", value: brightness, label: `💡 ${brightness}` });
        content = await uploadImage(content, id);
      }

      const item: Item = {
        id,
        ...partial,
        content,
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

  // 인증 준비 전 로딩
  if (!authReady) {
    return <div className="auth-loading">...</div>;
  }

  // 비로그인 → 로그인 화면
  if (!user) {
    return <Auth user={null} />;
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">inspirachiving</h1>
        <div className="header-right">
          <div className="view-toggle">
            <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>
              ▦ 그리드
            </button>
            <button className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}>
              ◎ 그래프
            </button>
          </div>
          <Auth user={user} />
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
