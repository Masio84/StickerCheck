/**
 * Seed script for World Cup 2026 Panini collection.
 *
 * Usage:
 *   1. Copy .env.example to .env.local and fill Supabase credentials
 *   2. Run the SQL migration in Supabase SQL Editor
 *   3. npx tsx scripts/seed-world-cup-2026.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  albumPageLayouts,
  getTotalStickerCount,
  worldCup2026Seed,
} from "../src/lib/seed-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function seed() {
  console.log("Seeding World Cup 2026 Panini...");

  const totalCount = getTotalStickerCount();

  const { data: collection, error: colError } = await supabase
    .from("collections")
    .upsert(
      {
        slug: "world-cup-2026-panini",
        name: "World Cup 2026 Stickers Panini",
        total_count: totalCount,
        year: 2026,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (colError) throw colError;
  console.log(`Collection: ${collection.name} (${totalCount} stickers)`);

  const stickerIdByCode: Record<string, string> = {};

  for (let catIndex = 0; catIndex < worldCup2026Seed.length; catIndex++) {
    const cat = worldCup2026Seed[catIndex];

    const { data: category, error: catError } = await supabase
      .from("categories")
      .upsert(
        {
          collection_id: collection.id,
          name: cat.name,
          sort_order: catIndex,
        },
        { onConflict: "collection_id,name" }
      )
      .select()
      .single();

    if (catError) {
      const { data: existing } = await supabase
        .from("categories")
        .select()
        .eq("collection_id", collection.id)
        .eq("name", cat.name)
        .single();

      if (!existing) throw catError;

      for (let i = 0; i < cat.stickers.length; i++) {
        const sticker = cat.stickers[i];
        const { data: s } = await supabase
          .from("stickers")
          .upsert(
            {
              collection_id: collection.id,
              category_id: existing.id,
              code: sticker.code,
              name: sticker.name,
              number: sticker.number,
              sort_order: i,
            },
            { onConflict: "collection_id,code" }
          )
          .select()
          .single();
        if (s) stickerIdByCode[s.code] = s.id;
      }
      continue;
    }

    for (let i = 0; i < cat.stickers.length; i++) {
      const sticker = cat.stickers[i];
      const { data: s, error: sError } = await supabase
        .from("stickers")
        .upsert(
          {
            collection_id: collection.id,
            category_id: category.id,
            code: sticker.code,
            name: sticker.name,
            number: sticker.number,
            sort_order: i,
          },
          { onConflict: "collection_id,code" }
        )
        .select()
        .single();

      if (sError) throw sError;
      stickerIdByCode[s.code] = s.id;
    }
  }

  for (const layout of albumPageLayouts) {
    const { data: page, error: pageError } = await supabase
      .from("album_pages")
      .upsert(
        {
          collection_id: collection.id,
          page_number: layout.page_number,
          rows: layout.rows,
          cols: layout.cols,
        },
        { onConflict: "collection_id,page_number" }
      )
      .select()
      .single();

    if (pageError) throw pageError;

    for (let i = 0; i < layout.sticker_codes.length; i++) {
      const code = layout.sticker_codes[i];
      const stickerId = stickerIdByCode[code];
      if (!stickerId) continue;

      const row = Math.floor(i / layout.cols);
      const col = i % layout.cols;

      await supabase.from("page_stickers").upsert(
        {
          album_page_id: page.id,
          sticker_id: stickerId,
          row_index: row,
          col_index: col,
        },
        { onConflict: "album_page_id,row_index,col_index" }
      );
    }
  }

  console.log("Seed completed successfully!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
