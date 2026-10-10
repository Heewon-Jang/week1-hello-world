import type { createClient } from "@/lib/supabase/server";
import { signImageUrls } from "./captions";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const START_RATING = 1000;
const K_FACTOR = 32;
const PAGE_SIZE = 1000;

type BattleRow = { user_id: string; winner_id: number; loser_id: number };

export type BattleCaption = { id: number; text: string; rating: number };

export type BattleTarget =
  | { kind: "image"; image_url: string; description: string | null }
  | { kind: "news"; headline: string; source: string };

export type Matchup = {
  left: BattleCaption;
  right: BattleCaption;
  target: BattleTarget;
  myBattles: number;
};

export function pairKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// Every battle ever, oldest first. Supabase caps a select at 1000 rows, so page.
export async function getAllBattles(supabase: Supabase) {
  const battles: BattleRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("caption_battles")
      .select("user_id, winner_id, loser_id")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    battles.push(...data);
    if (data.length < PAGE_SIZE) return battles;
  }
}

// Standard Elo: replay battles in order; the winner takes points from the
// loser, more of them for an upset.
export function computeRatings(battles: BattleRow[]) {
  const ratings = new Map<number, number>();
  const wins = new Map<number, number>();
  const losses = new Map<number, number>();

  for (const { winner_id, loser_id } of battles) {
    const winner = ratings.get(winner_id) ?? START_RATING;
    const loser = ratings.get(loser_id) ?? START_RATING;
    const expected = 1 / (1 + 10 ** ((loser - winner) / 400));
    const change = K_FACTOR * (1 - expected);
    ratings.set(winner_id, winner + change);
    ratings.set(loser_id, loser - change);
    wins.set(winner_id, (wins.get(winner_id) ?? 0) + 1);
    losses.set(loser_id, (losses.get(loser_id) ?? 0) + 1);
  }
  return { ratings, wins, losses };
}

// Picks two captions on the same photo or headline that this user hasn't
// judged yet, preferring the pairs with the fewest votes so far.
export async function getNextMatchup(
  supabase: Supabase,
  userId: string
): Promise<Matchup | null> {
  const [{ data: captions, error }, battles] = await Promise.all([
    supabase
      .from("captions")
      .select("id, text, image_id, news_id")
      .order("created_at", { ascending: false })
      .limit(500),
    getAllBattles(supabase),
  ]);
  if (error) throw new Error(error.message);

  const { ratings } = computeRatings(battles);
  const pairVotes = new Map<string, number>();
  const judgedByMe = new Set<string>();
  for (const b of battles) {
    const key = pairKey(b.winner_id, b.loser_id);
    pairVotes.set(key, (pairVotes.get(key) ?? 0) + 1);
    if (b.user_id === userId) judgedByMe.add(key);
  }

  const groups = new Map<string, typeof captions>();
  for (const c of captions) {
    const key = c.image_id ? `image-${c.image_id}` : `news-${c.news_id}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  const candidates: [(typeof captions)[number], (typeof captions)[number]][] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (!judgedByMe.has(pairKey(group[i].id, group[j].id))) {
          candidates.push([group[i], group[j]]);
        }
      }
    }
  }
  if (!candidates.length) return null;

  const votes = (pair: (typeof candidates)[number]) =>
    pairVotes.get(pairKey(pair[0].id, pair[1].id)) ?? 0;
  const fewest = Math.min(...candidates.map(votes));
  const pool = candidates.filter((pair) => votes(pair) === fewest);
  const pair = pool[Math.floor(Math.random() * pool.length)];
  const [a, b] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];

  let target: BattleTarget;
  if (a.image_id) {
    const { data: image, error: imageError } = await supabase
      .from("images")
      .select("storage_path, description")
      .eq("id", a.image_id)
      .single();
    if (imageError) throw new Error(imageError.message);
    const urls = await signImageUrls(supabase, [image.storage_path]);
    target = {
      kind: "image",
      image_url: urls.get(image.storage_path) ?? "",
      description: image.description,
    };
  } else {
    const { data: news, error: newsError } = await supabase
      .from("news_items")
      .select("headline, source")
      .eq("id", a.news_id)
      .single();
    if (newsError) throw new Error(newsError.message);
    target = { kind: "news", ...news };
  }

  const toCaption = (c: typeof a) => ({
    id: c.id,
    text: c.text,
    rating: Math.round(ratings.get(c.id) ?? START_RATING),
  });

  return {
    left: toCaption(a),
    right: toCaption(b),
    target,
    myBattles: judgedByMe.size,
  };
}

// Highest-rated captions that have been in at least one battle.
export async function getBattleLeaderboard(supabase: Supabase, limit = 10) {
  const { ratings, wins, losses } = computeRatings(await getAllBattles(supabase));
  const topIds = [...ratings.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([id]) => id);
  if (!topIds.length) return [];

  const { data: captions, error } = await supabase
    .from("captions")
    .select("id, text, images(id, storage_path), news_items(id, headline)")
    .in("id", topIds);
  if (error) throw new Error(error.message);

  // Many-to-one embeds: PostgREST returns one object (or null), not an array.
  const rows = captions.map((c) => ({
    ...c,
    image: c.images as unknown as { id: number; storage_path: string } | null,
    news: c.news_items as unknown as { id: number; headline: string } | null,
  }));
  const urls = await signImageUrls(
    supabase,
    rows.flatMap((c) => (c.image ? [c.image.storage_path] : []))
  );

  return rows
    .map((c) => ({
      id: c.id,
      text: c.text,
      image: c.image && { id: c.image.id, image_url: urls.get(c.image.storage_path) ?? "" },
      news: c.news,
      rating: Math.round(ratings.get(c.id) ?? START_RATING),
      wins: wins.get(c.id) ?? 0,
      losses: losses.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.rating - a.rating || a.id - b.id);
}
