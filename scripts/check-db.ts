import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing credentials in env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { count: collectionsCount } = await supabase.from("collections").select("*", { count: 'exact', head: true });
  const { count: pagesCount } = await supabase.from("album_pages").select("*", { count: 'exact', head: true });
  const { count: stickersCount } = await supabase.from("stickers").select("*", { count: 'exact', head: true });
  const { count: pageStickersCount } = await supabase.from("page_stickers").select("*", { count: 'exact', head: true });
  
  console.log("=== Database Status ===");
  console.log("Collections:", collectionsCount);
  console.log("Album Pages:", pagesCount);
  console.log("Stickers:", stickersCount);
  console.log("Page-Sticker Mappings:", pageStickersCount);
}

check().catch(console.error);
