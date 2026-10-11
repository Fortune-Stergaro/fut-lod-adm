import { supabase } from "./supabase.js";
import { VIDEO_BUCKET } from "./constants.js";

export async function uploadVideo(file) {
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(/size|exceed/i.test(error.message) ? "That video is too large (50 MB max)." : error.message);
  return supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}
