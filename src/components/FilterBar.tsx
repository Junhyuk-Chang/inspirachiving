import type { Item, AttributeKey } from "../types";

interface Props {
  items: Item[];
  activeFilter: string | null; // "emotion:고요"
  onFilter: (key: string | null) => void;
  search: string;
  onSearch: (v: string) => void;
}

const KEY_PRIORITY: AttributeKey[] = [
  "emotion", "keyword", "source", "language", "length", "brightness",
];

export default function FilterBar({
  items,
  activeFilter,
  onFilter,
  search,
  onSearch,
}: Props) {
  // 전체 속성 빈도 계산
  const freq = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    for (const attr of item.attributes) {
      const k = `${attr.key}:${attr.value}`;
      const prev = freq.get(k);
      freq.set(k, { label: attr.label, count: (prev?.count ?? 0) + 1 });
    }
  }

  // 우선순위 순 정렬
  const sorted = [...freq.entries()].sort((a, b) => {
    const [aKey] = a[0].split(":");
    const [bKey] = b[0].split(":");
    const ai = KEY_PRIORITY.indexOf(aKey as AttributeKey);
    const bi = KEY_PRIORITY.indexOf(bKey as AttributeKey);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return b[1].count - a[1].count;
  });

  return (
    <div className="filter-bar">
      <input
        className="search-input"
        type="text"
        placeholder="검색..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="filter-chips">
        <button
          className={`chip chip-all ${!activeFilter ? "active" : ""}`}
          onClick={() => onFilter(null)}
        >
          전체
        </button>
        {sorted.map(([key, { label, count }]) => (
          <button
            key={key}
            className={`chip ${activeFilter === key ? "active" : ""}`}
            onClick={() => onFilter(activeFilter === key ? null : key)}
          >
            {label}
            <span className="chip-count">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
