import type { createClient } from "@/lib/supabase/server";
import { signImageUrls } from "./captions";
import { computeRatings, getAllBattles, pairKey, START_RATING } from "./battles";
import { newsDate } from "./news";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// A title needs at least this many battles where other people also voted.
const MIN_BATTLES_FOR_TITLE = 5;

export type Title = { name: string; emoji: string; blurb: string };

function pickTitle(agreeRate: number | null, comparable: number): Title {
  if (agreeRate === null || comparable < MIN_BATTLES_FOR_TITLE) {
    return {
      name: "Rookie",
      emoji: "🐣",
      blurb: `Judge ${MIN_BATTLES_FOR_TITLE - comparable} more contested battles to earn a title.`,
    };
  }
  if (agreeRate >= 70) {
    return { name: "Trendsetter", emoji: "🎯", blurb: "You pick what the crowd picks." };
  }
  if (agreeRate < 40) {
    return { name: "Contrarian", emoji: "🤡", blurb: "Your sense of humor marches to its own beat." };
  }
  return { name: "Balanced Judge", emoji: "⚖️", blurb: "Sometimes with the crowd, sometimes not." };
}

// Consecutive New York days with a battle or vote, ending today (or
// yesterday, so the streak isn't "broken" before you've played today).
function currentStreak(days: Set<string>) {
  const day = new Date();
  if (!days.has(newsDate(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (days.has(newsDate(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export async function getMyStats(supabase: Supabase, userId: string) {
  const [battles, votesResult, imagesResult] = await Promise.all([
    getAllBattles(supabase),
    supabase.from("caption_votes").select("created_at").eq("user_id", userId),
    supabase
      .from("images")
      .select("id, storage_path, created_at, captions(id, text)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (votesResult.error) throw new Error(votesResult.error.message);
  if (imagesResult.error) throw new Error(imagesResult.error.message);

  const { ratings } = computeRatings(battles);
  const rankOf = new Map(
    [...ratings.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([id], index) => [id, index + 1])
  );

  // Everyone's picks per pair, to compare each of my picks with the crowd.
  const byPair = new Map<string, typeof battles>();
  for (const b of battles) {
    const key = pairKey(b.winner_id, b.loser_id);
    byPair.set(key, [...(byPair.get(key) ?? []), b]);
  }

  const mine = battles.filter((b) => b.user_id === userId);
  let comparable = 0;
  let agreed = 0;
  const history = mine.map((b) => {
    const all = byPair.get(pairKey(b.winner_id, b.loser_id)) ?? [];
    const others = all.filter((o) => o.user_id !== userId);
    const othersSame = others.filter((o) => o.winner_id === b.winner_id).length;
    // Ties among other voters don't count either way.
    if (others.length && othersSame * 2 !== others.length) {
      comparable++;
      if (othersSame * 2 > others.length) agreed++;
    }
    return {
      ...b,
      totalVotes: all.length,
      agreePercent: Math.round((all.filter((o) => o.winner_id === b.winner_id).length / all.length) * 100),
    };
  });
  const agreeRate = comparable ? Math.round((agreed / comparable) * 100) : null;

  const activeDays = new Set([
    ...mine.map((b) => newsDate(new Date(b.created_at))),
    ...votesResult.data.map((v) => newsDate(new Date(v.created_at))),
  ]);

  // Most recent battles, with the caption text for both sides.
  const recent = history.slice(-10).reverse();
  const recentIds = [...new Set(recent.flatMap((b) => [b.winner_id, b.loser_id]))];
  const texts = new Map<number, string>();
  if (recentIds.length) {
    const { data, error } = await supabase.from("captions").select("id, text").in("id", recentIds);
    if (error) throw new Error(error.message);
    for (const c of data) texts.set(c.id, c.text);
  }

  const images = imagesResult.data;
  const urls = await signImageUrls(supabase, images.map((image) => image.storage_path));

  return {
    battleCount: mine.length,
    voteCount: votesResult.data.length,
    agreeRate,
    streak: currentStreak(activeDays),
    title: pickTitle(agreeRate, comparable),
    uploads: images.map((image) => {
      const best = image.captions
        .map((c) => ({ ...c, rating: Math.round(ratings.get(c.id) ?? START_RATING), rank: rankOf.get(c.id) ?? null }))
        .sort((a, b) => b.rating - a.rating || a.id - b.id)[0];
      return {
        id: image.id,
        image_url: urls.get(image.storage_path) ?? "",
        created_at: image.created_at,
        best: best ?? null,
      };
    }),
    recent: recent.map((b) => ({
      key: `${b.winner_id}-${b.loser_id}`,
      picked: texts.get(b.winner_id) ?? "",
      over: texts.get(b.loser_id) ?? "",
      totalVotes: b.totalVotes,
      agreePercent: b.agreePercent,
    })),
  };
}
