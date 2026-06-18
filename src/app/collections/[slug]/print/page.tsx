import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintClient } from "@/components/print/PrintClient";
import type { StickerStatus } from "@/lib/types";

export default async function PrintPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!collection) notFound();

  // Load all stickers
  const { data: stickers } = await supabase
    .from("stickers")
    .select("*")
    .eq("collection_id", collection.id)
    .order("sort_order");

  // Load user stickers status
  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id, status, duplicate_count")
    .eq("user_id", user.id)
    .eq("collection_id", collection.id);

  const userStatus: Record<string, { status: StickerStatus; duplicate_count: number }> = {};
  userStickers?.forEach((us) => {
    userStatus[us.sticker_id] = {
      status: us.status as StickerStatus,
      duplicate_count: us.duplicate_count,
    };
  });

  return (
    <PrintClient
      collection={collection}
      stickers={stickers ?? []}
      userStatus={userStatus}
      userEmail={user.email ?? "Usuario"}
    />
  );
}
