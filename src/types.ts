export type ItemType = "text" | "image" | "url";

export type AttributeKey =
  | "emotion"
  | "keyword"
  | "color"
  | "brightness"
  | "language"
  | "source"
  | "length"
  | "aspect";

export type Attribute = {
  key: AttributeKey;
  value: string;
  label: string; // 화면 표시용 (e.g. "😌 고요")
};

export type Item = {
  id: string;
  type: ItemType;
  // text: 원문, image: dataURL, url: 링크
  content: string;
  // url 타입일 때 og 메타
  meta?: {
    title?: string;
    description?: string;
    image?: string;
    domain?: string;
  };
  attributes: Attribute[];
  note: string; // 사용자 메모
  createdAt: string; // ISO string
};
