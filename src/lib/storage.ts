import { supabase } from "./supabase";
import type { Item } from "../types";

// ─── 아이템 저장 ──────────────────────────────────────────
export async function saveItem(item: Item): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("items").upsert({
    id: item.id,
    user_id: user.id,
    type: item.type,
    content: item.content,
    meta: item.meta ?? null,
    attributes: item.attributes,
    note: item.note,
    is_public: false,
    created_at: item.createdAt,
  });
  if (error) throw error;
}

// ─── 전체 아이템 조회 ─────────────────────────────────────
export async function getAllItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    content: row.content,
    meta: row.meta ?? undefined,
    attributes: row.attributes,
    note: row.note,
    createdAt: row.created_at,
  }));
}

// ─── 아이템 삭제 ──────────────────────────────────────────
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

// ─── 아이템 수정 ──────────────────────────────────────────
export async function updateItem(item: Item): Promise<void> {
  return saveItem(item);
}
