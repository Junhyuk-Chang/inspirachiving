import { useRef, useState, useCallback } from "react";

interface Props {
  onText: (text: string) => void;
  onImage: (dataUrl: string) => void;
  onUrl: (url: string) => void;
}

const URL_RE = /^https?:\/\//i;

export default function PasteZone({ onText, onImage, onUrl }: Props) {
  const [dragging, setDragging] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);

      // 이미지 우선
      const imgItem = items.find((i) => i.type.startsWith("image/"));
      if (imgItem) {
        e.preventDefault();
        const file = imgItem.getAsFile()!;
        const reader = new FileReader();
        reader.onload = () => onImage(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      // 텍스트
      const text = e.clipboardData.getData("text/plain").trim();
      if (!text) return;
      e.preventDefault();

      if (URL_RE.test(text)) {
        onUrl(text);
      } else {
        onText(text);
      }
    },
    [onText, onImage, onUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => onImage(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }
      const text = e.dataTransfer.getData("text/plain").trim();
      if (URL_RE.test(text)) onUrl(text);
      else if (text) onText(text);
    },
    [onText, onImage, onUrl]
  );

  const handleSubmit = () => {
    const val = inputVal.trim();
    if (!val) return;
    if (URL_RE.test(val)) onUrl(val);
    else onText(val);
    setInputVal("");
  };

  return (
    <div className="paste-zone-wrapper">
      <div
        className={`paste-zone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          className="paste-textarea"
          placeholder="여기에 글귀, URL을 붙여넣거나 이미지를 드래그하세요 (Ctrl+V)"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          rows={3}
        />
        <div className="paste-zone-footer">
          <span className="hint">⌘ Enter로 저장</span>
          <button className="save-btn" onClick={handleSubmit}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
