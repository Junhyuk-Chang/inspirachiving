import type { Item } from "../types";

interface Props {
  item: Item;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  highlightAttr?: string; // "emotion:고요" 같은 형태
}

export default function ItemCard({
  item,
  isSelected,
  onClick,
  onDelete,
  highlightAttr,
}: Props) {
  const timeStr = new Date(item.createdAt).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`item-card ${item.type} ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      {/* 콘텐츠 */}
      <div className="item-content">
        {item.type === "image" && (
          <img src={item.content} alt="archived" className="item-image" />
        )}

        {item.type === "text" && (
          <p className="item-text">{item.content}</p>
        )}

        {item.type === "url" && (
          <div className="item-url">
            {item.meta?.image && (
              <img src={item.meta.image} alt="og" className="og-image" />
            )}
            <div className="url-info">
              <span className="url-domain">{item.meta?.domain}</span>
              <p className="url-title">{item.meta?.title || item.content}</p>
              {item.meta?.description && (
                <p className="url-desc">{item.meta.description}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 속성 태그 */}
      <div className="attr-tags">
        {item.attributes.map((attr) => {
          const key = `${attr.key}:${attr.value}`;
          return (
            <span
              key={key}
              className={`attr-tag attr-${attr.key} ${
                highlightAttr === key ? "highlighted" : ""
              }`}
            >
              {attr.label}
            </span>
          );
        })}
      </div>

      {/* 푸터 */}
      <div className="item-footer">
        <span className="item-time">{timeStr}</span>
        <button
          className="delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="삭제"
        >
          ×
        </button>
      </div>
    </div>
  );
}
