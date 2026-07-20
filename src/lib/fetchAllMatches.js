// PostgREST (Supabase's REST layer) caps every single request at 1000 rows
// by default, regardless of what you pass to .limit(). Anything that needs
// the TRUE full matches table (total counts, per-player win/loss stats,
// ELO repair/replay) has to page through with .range() until it runs out —
// a single .select("*") call can never be trusted to return everything.
//
// Display lists (e.g. "recent match history") should keep using a normal
// capped query — they don't need this and shouldn't pay the cost of it.

import supabase from "@/api/supabaseClient";

const PAGE_SIZE = 1000;

export async function fetchAllMatches() {
  let all = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all = all.concat(data);

    if (data.length < PAGE_SIZE) break; // last page
    from += PAGE_SIZE;
  }

  return all;
}