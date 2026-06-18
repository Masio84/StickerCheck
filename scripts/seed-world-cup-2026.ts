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

    // Clear old mappings to avoid orphaned slots from the old 4x5 layout
    const { error: deleteError } = await supabase
      .from("page_stickers")
      .delete()
      .eq("album_page_id", page.id);
    if (deleteError) throw deleteError;

    const isTeamPage = section.stickers.length >= 18 && section.stickers.length <= 20;

    const pageMappings = section.stickers
      .map((sticker, index) => {
        const stickerId = stickerIdByCode[sticker.code];
        if (!stickerId) return null;

        let row_index = Math.floor(index / section.cols);
        let col_index = index % section.cols;

        if (isTeamPage) {
          const mapping = [
            { row: 0, col: 3 }, // index 0 (MEX 1 / KOR 1 / CAN 1 / SCO 1) - Badge
            { row: 1, col: 3 }, // index 1 (MEX 2 / KOR 2 / CAN 2 / SCO 2) - Goalkeeper
            { row: 0, col: 1 }, // index 2 (MEX 3 / KOR 3 / CAN 3 / SCO 3)
            { row: 1, col: 1 }, // index 3 (MEX 4 / KOR 4 / CAN 4 / SCO 4)
            { row: 2, col: 1 }, // index 4 (MEX 5 / KOR 5 / CAN 5 / SCO 5)
            { row: 3, col: 1 }, // index 5 (MEX 6 / KOR 6 / CAN 6 / SCO 6)
            { row: 0, col: 2 }, // index 6 (MEX 7 / KOR 7 / CAN 7 / SCO 7)
            { row: 1, col: 2 }, // index 7 (MEX 8 / KOR 8 / CAN 8 / SCO 8)
            { row: 2, col: 2 }, // index 8 (MEX 9 / KOR 9 / CAN 9 / SCO 9)
            { row: 3, col: 2 }, // index 9 (MEX 10 / KOR 10 / CAN 10 / SCO 10)
            { row: 0, col: 6 }, // index 10 (MEX 11 / KOR 11 / CAN 11 / SCO 11) - Right page top-right
            { row: 1, col: 6 }, // index 11 (MEX 12 / KOR 12 / CAN 12 / SCO 12)
            { row: 2, col: 6 }, // index 12 (MEX 13 / KOR 13 / CAN 13 / SCO 13)
            { row: 0, col: 5 }, // index 13 (MEX 14 / KOR 14 / CAN 14 / SCO 14)
            { row: 1, col: 5 }, // index 14 (MEX 15 / KOR 15 / CAN 15 / SCO 15)
            { row: 2, col: 5 }, // index 15 (MEX 16 / KOR 16 / CAN 16 / SCO 16)
            { row: 3, col: 5 }, // index 16 (MEX 17 / KOR 17 / CAN 17 / SCO 17)
            { row: 1, col: 4 }, // index 17 (MEX 18 / KOR 18 / CAN 18 / SCO 18)
            { row: 2, col: 4 }, // index 18 (MEX 19 / KOR 19 / CAN 19 / SCO 19)
            { row: 3, col: 4 }, // index 19 (MEX 20 / KOR 20 / CAN 20 / SCO 20)
          ];
          if (index < mapping.length) {
            row_index = mapping[index].row;
            col_index = mapping[index].col;
          }
        }

        return {
          album_page_id: page.id,
          sticker_id: stickerId,
          row_index,
          col_index,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (pageMappings.length > 0) {
      const { error } = await supabase
        .from("page_stickers")
        .insert(pageMappings);
      if (error) throw error;
    }
  }

  console.log(`Seed completed: ${rows.length} stickers, ${sections.length} pages`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
