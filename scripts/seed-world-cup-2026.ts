/**
 * Seed script for World Cup 2026 Panini — full 992 stickers from CSV.
 *
 * Usage:
 *   1. Run migrations 001 + 002 in Supabase SQL Editor
 *   2. npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import {
  buildAlbumSections,
  getDefaultCsvPath,
  parseAlbumCsv,
} from "../src/lib/album-csv";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function seed() {
  const csvPath = getDefaultCsvPath();
  console.log(`Reading ${csvPath}...`);

  const rows = parseAlbumCsv(csvPath);
  const sections = buildAlbumSections(rows);
  const categories = [...new Set(rows.map((r) => r.seccionAlbum))];

  console.log(`Found ${rows.length} stickers in ${sections.length} album pages`);

  const { data: collection, error: colError } = await supabase
    .from("collections")
    .upsert(
      {
        slug: "world-cup-2026-panini",
        name: "World Cup 2026 Stickers Panini",
        total_count: rows.length,
        year: 2026,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (colError) throw colError;

  const categoryIdByName: Record<string, string> = {};

  for (let i = 0; i < categories.length; i++) {
    const name = categories[i];
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("collection_id", collection.id)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      categoryIdByName[name] = existing.id;
      continue;
    }

    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        collection_id: collection.id,
        name,
        sort_order: i,
      })
      .select()
      .single();

    if (error) throw error;
    categoryIdByName[name] = category.id;
  }

  const stickerIdByCode: Record<string, string> = {};
  const BATCH = 100;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((row) => ({
      collection_id: collection.id,
      category_id: categoryIdByName[row.seccionAlbum],
      code: row.code,
      name: row.nombre,
      number: row.orden,
      sort_order: row.orden,
      key_code: row.clave,
      album_number: row.numeroAlbum,
      country: row.pais || null,
      country_code: row.codigoPais || null,
      group_name: row.grupo || null,
      sticker_type: row.tipo || null,
      source: row.origen || null,
    }));

    const { data, error } = await supabase
      .from("stickers")
      .upsert(batch, { onConflict: "collection_id,code" })
      .select("id, code");

    if (error) throw error;
    data?.forEach((s) => {
      stickerIdByCode[s.code] = s.id;
    });

    console.log(`Stickers ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  for (const section of sections) {
    const { data: page, error: pageError } = await supabase
      .from("album_pages")
      .upsert(
        {
          collection_id: collection.id,
          page_number: section.pageNumber,
          rows: section.rows,
          cols: section.cols,
          section_name: section.sectionName,
          layout_json: {
            section: section.sectionName,
            sticker_codes: section.stickers.map((s) => s.code),
          },
        },
        { onConflict: "collection_id,page_number" }
      )
      .select()
      .single();

    if (pageError) throw pageError;

    const pageMappings = section.stickers
      .map((sticker, index) => {
        const stickerId = stickerIdByCode[sticker.code];
        if (!stickerId) return null;
        return {
          album_page_id: page.id,
          sticker_id: stickerId,
          row_index: Math.floor(index / section.cols),
          col_index: index % section.cols,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (pageMappings.length > 0) {
      const { error } = await supabase
        .from("page_stickers")
        .upsert(pageMappings, { onConflict: "album_page_id,row_index,col_index" });
      if (error) throw error;
    }
  }

  console.log(`Seed completed: ${rows.length} stickers, ${sections.length} pages`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
