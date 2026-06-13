import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScannerClient } from "@/components/scanner/ScannerClient";

export default async function ScanPage({
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

  const { data: stickers } = await supabase
    .from("stickers")
    .select("*")
    .eq("collection_id", collection.id);

  const { data: albumPages } = await supabase
    .from("album_pages")
    .select("*")
    .eq("collection_id", collection.id)
    .order("page_number");

  const pageIds = albumPages?.map((p) => p.id) ?? [];
  let pageStickers: { album_page_id: string; sticker_id: string; row_index: number; col_index: number }[] = [];

  if (pageIds.length > 0) {
    const { data } = await supabase
      .from("page_stickers")
      .select("*")
      .in("album_page_id", pageIds);
    pageStickers = data ?? [];
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <ScannerClient
          collection={collection}
          stickers={stickers ?? []}
          albumPages={albumPages ?? []}
          pageStickers={pageStickers}
        />
      </main>
      <Footer />
    </div>
  );
}
