import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!collection) {
    return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  }

  await supabase.from("user_collections").upsert(
    { user_id: user.id, collection_id: collection.id },
    { onConflict: "user_id,collection_id" }
  );

  return NextResponse.redirect(
    new URL(`/collections/${slug}`, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
  );
}
