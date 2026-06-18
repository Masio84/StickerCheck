import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase-url.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !key) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const { data: page } = await supabase
    .from("album_pages")
    .select("id, section_name, rows, cols")
    .eq("section_name", "SCOTLAND")
    .single();

  if (!page) {
    console.error("Page not found");
    return;
  }

  console.log(`Page: ${page.section_name}, ID: ${page.id}, Grid: ${page.rows}x${page.cols}`);

  const { data: mappings } = await supabase
    .from("page_stickers")
    .select("row_index, col_index, stickers (code, key_code)")
    .eq("album_page_id", page.id);

  if (!mappings) {
    console.error("Mappings not found");
    return;
  }

  // Sort by row, then col
  mappings.sort((a: any, b: any) => {
    if (a.row_index !== b.row_index) return a.row_index - b.row_index;
    return a.col_index - b.col_index;
  });

  mappings.forEach((m: any) => {
    console.log(`Row: ${m.row_index}, Col: ${m.col_index} -> Code: ${m.stickers?.code} (Key: ${m.stickers?.key_code})`);
  });
}

run().catch(console.error);
