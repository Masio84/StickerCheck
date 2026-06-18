import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { StickerStatus } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get or select the default collection
  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", "world-cup-2026-panini")
    .single();

  if (!collection) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 text-center text-slate-400">
          No se encontró la colección base en la base de datos. Por favor ejecuta el seed primero.
        </main>
        <Footer />
      </div>
    );
  }

  // Auto-initialize collection for user if they don't have it
  const { data: userCol } = await supabase
    .from("user_collections")
    .select("id")
    .eq("user_id", user.id)
    .eq("collection_id", collection.id)
    .maybeSingle();

  if (!userCol) {
    await supabase.from("user_collections").insert({
      user_id: user.id,
      collection_id: collection.id,
    });
  }

  // Fetch all stickers in the collection
  const { data: stickers } = await supabase
    .from("stickers")
    .select("*")
    .eq("collection_id", collection.id)
    .order("sort_order");

  // Fetch album pages grid configurations
  const { data: albumPages } = await supabase
    .from("album_pages")
    .select("*")
    .eq("collection_id", collection.id)
    .order("page_number");

  // Fetch page sticker coordinates mapping
  const pageIds = albumPages?.map((p) => p.id) ?? [];
  let pageStickers: any[] = [];
  if (pageIds.length > 0) {
    const { data } = await supabase
      .from("page_stickers")
      .select("*")
      .in("album_page_id", pageIds);
    pageStickers = data ?? [];
  }

  // Fetch user progress
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
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1">
        <DashboardClient
          collection={collection}
          stickers={stickers ?? []}
          albumPages={albumPages ?? []}
          pageStickers={pageStickers}
          initialUserStatus={userStatus}
          userEmail={user.email ?? "Usuario"}
        />
      </main>
      <Footer />
    </div>
  );
}


