import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChecklistClient } from "@/components/checklist/ChecklistClient";
import type { StickerStatus } from "@/lib/types";

export default async function CollectionPage({
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

  const { data: userCollection } = await supabase
    .from("user_collections")
    .select("id")
    .eq("user_id", user.id)
    .eq("collection_id", collection.id)
    .single();

  if (!userCollection) redirect("/dashboard");

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("collection_id", collection.id)
    .order("sort_order");

  const { data: stickers } = await supabase
    .from("stickers")
    .select("*")
    .eq("collection_id", collection.id)
    .order("sort_order");

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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <ChecklistClient
          collection={collection}
          categories={categories ?? []}
          stickers={stickers ?? []}
          initialUserStatus={userStatus}
        />
      </main>
      <Footer />
    </div>
  );
}
