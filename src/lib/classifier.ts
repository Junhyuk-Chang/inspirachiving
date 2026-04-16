import type { Attribute, AttributeKey, Item, ItemType } from "../types";

// ─── 감정 사전 ────────────────────────────────────────────────────
const EMOTION_MAP: Record<string, string[]> = {
  "설렘":    ["설레", "두근", "기대", "excited", "thrilled", "flutter"],
  "기쁨":    ["행복", "웃음", "즐거", "기쁘", "좋아", "사랑", "happy", "joy", "love", "wonderful"],
  "고요":    ["평화", "조용", "여백", "잔잔", "고요", "calm", "still", "quiet", "peace", "serene"],
  "슬픔":    ["그리움", "외로", "눈물", "슬프", "아프", "sad", "miss", "lonely", "tears", "hurt"],
  "영감":    ["멋지", "대단", "배우", "영감", "inspire", "amazing", "brilliant", "creative", "insight"],
  "위로":    ["괜찮", "힘내", "응원", "위로", "comfort", "okay", "cheer", "support"],
  "사색":    ["생각", "고민", "철학", "질문", "wonder", "ponder", "reflect", "curious", "think"],
};

// ─── 언어 감지 ────────────────────────────────────────────────────
function detectLanguage(text: string): string {
  const ko = (text.match(/[\uAC00-\uD7A3]/g) || []).length;
  const ja = (text.match(/[\u3040-\u30FF]/g) || []).length;
  const total = text.length;
  if (ko / total > 0.2) return "한국어";
  if (ja / total > 0.2) return "日本語";
  return "English";
}

// ─── 감정 분류 ────────────────────────────────────────────────────
function detectEmotions(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [emotion, keywords] of Object.entries(EMOTION_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) matched.push(emotion);
  }
  return matched.length ? matched : ["기타"];
}

// ─── 핵심 키워드 추출 ─────────────────────────────────────────────
const STOP_WORDS = new Set([
  "이", "가", "을", "를", "은", "는", "의", "에", "와", "과", "도",
  "the", "a", "an", "is", "are", "was", "were", "and", "or", "in",
  "on", "at", "to", "for", "of", "with", "that", "this", "it",
]);

function extractKeywords(text: string): string[] {
  const words = text
    .replace(/[^\wㄱ-ㅎ가-힣\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  // 빈도 계산
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

// ─── 글 길이 분류 ─────────────────────────────────────────────────
function classifyLength(text: string): string {
  const len = text.trim().length;
  if (len < 50) return "짧은 글귀";
  if (len < 300) return "중간 글";
  return "긴 글";
}

// ─── 이미지 색상 추출 (Canvas API) ───────────────────────────────
export async function extractImageColors(dataUrl: string): Promise<{
  palette: string[];
  brightness: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 50; // 성능을 위해 50x50으로 다운샘플
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // 대표 색상 픽셀 샘플링
      const colorCounts: Record<string, number> = {};
      let totalBrightness = 0;

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
        // 색상을 32단위로 quantize
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const hex = `#${qr.toString(16).padStart(2, "0")}${qg.toString(16).padStart(2, "0")}${qb.toString(16).padStart(2, "0")}`;
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }

      const palette = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hex]) => hex);

      const avgBrightness = totalBrightness / (data.length / 16);
      const brightness =
        avgBrightness > 170 ? "밝음" : avgBrightness > 85 ? "중간" : "어두움";

      resolve({ palette, brightness });
    };
    img.src = dataUrl;
  });
}

// ─── URL 도메인 분류 ──────────────────────────────────────────────
function classifySource(url: string): string {
  const domain = new URL(url).hostname.replace("www.", "");
  const sourceMap: Record<string, string> = {
    "twitter.com": "Twitter",
    "x.com": "Twitter",
    "instagram.com": "Instagram",
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "github.com": "GitHub",
    "medium.com": "Medium",
    "naver.com": "Naver",
    "brunch.co.kr": "Brunch",
  };
  for (const [key, val] of Object.entries(sourceMap)) {
    if (domain.includes(key)) return val;
  }
  return domain;
}

// ─── 메인 분류 함수 ───────────────────────────────────────────────
export async function classifyItem(
  type: ItemType,
  content: string
): Promise<Attribute[]> {
  const attrs: Attribute[] = [];

  const add = (key: AttributeKey, value: string, label: string) =>
    attrs.push({ key, value, label });

  if (type === "text") {
    const lang = detectLanguage(content);
    add("language", lang, `🌐 ${lang}`);

    const length = classifyLength(content);
    add("length", length, `📏 ${length}`);

    const emotions = detectEmotions(content);
    for (const e of emotions) add("emotion", e, `💭 ${e}`);

    const keywords = extractKeywords(content);
    for (const kw of keywords) add("keyword", kw, `🏷 ${kw}`);
  }

  if (type === "image") {
    // 색상/밝기는 호출 후 별도로 머지 (비동기)
    // classifyItem 이후 extractImageColors 호출해서 추가
  }

  if (type === "url") {
    try {
      const source = classifySource(content);
      add("source", source, `🔗 ${source}`);
    } catch {
      add("source", "웹", "🔗 웹");
    }
  }

  return attrs;
}

// ─── 속성으로 아이템 그룹핑 ──────────────────────────────────────
export function groupByAttribute(
  items: Item[]
): Map<string, Item[]> {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    for (const attr of item.attributes) {
      const key = `${attr.key}:${attr.value}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
  }
  return map;
}

// ─── 두 아이템의 공통 속성 ────────────────────────────────────────
export function sharedAttributes(a: Item, b: Item): Attribute[] {
  return a.attributes.filter((attrA) =>
    b.attributes.some(
      (attrB) => attrB.key === attrA.key && attrB.value === attrA.value
    )
  );
}
