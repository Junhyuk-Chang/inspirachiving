import { supabase } from "./supabase";

// dataURL → Supabase Storage 업로드 후 공개 URL 반환
export async function uploadImage(dataUrl: string, itemId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // dataURL → Blob 변환
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.split("/")[1] || "png";
  const path = `${user.id}/${itemId}.${ext}`;

  const { error } = await supabase.storage
    .from("images")
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) throw error;

  // Signed URL (1년 유효) - private 버킷이므로
  const { data: signed, error: signErr } = await supabase.storage
    .from("images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signErr || !signed) throw signErr;
  return signed.signedUrl;
}
