import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Caption = {
  id: number;
  text: string;
  score: number;
  myVote: number;
};

export type FeedImage = {
  id: number;
  image_url: string;
  description: string | null;
  created_at: string;
  captions: Caption[];
};

const SIGNED_URL_SECONDS = 60 * 60;

// The images bucket is private, so each photo gets a short-lived signed URL.
async function signImageUrls(supabase: Supabase, paths: string[]) {
  const urls = new Map<string, string>();
  if (!paths.length) return urls;

  const { data, error } = await supabase.storage
    .from("images")
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);

  for (const { path, signedUrl } of data) {
    if (path && signedUrl) urls.set(path, signedUrl);
  }
  return urls;
}

// Newest images first, each with its captions sorted by score.
export async function getFeed(supabase: Supabase, userId: string, limit = 30) {
  const { data: images, error } = await supabase
    .from("images")
    .select("id, storage_path, description, created_at, captions(id, text)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const captionIds = images.flatMap((image) => image.captions.map((c) => c.id));
  const [{ scores, myVotes }, urls] = await Promise.all([
    getVotes(supabase, userId, captionIds),
    signImageUrls(supabase, images.map((image) => image.storage_path)),
  ]);

  return images.map(
    (image): FeedImage => ({
      id: image.id,
      image_url: urls.get(image.storage_path) ?? "",
      description: image.description,
      created_at: image.created_at,
      captions: image.captions
        .map((c) => ({
          ...c,
          score: scores.get(c.id) ?? 0,
          myVote: myVotes.get(c.id) ?? 0,
        }))
        .sort((a, b) => b.score - a.score || a.id - b.id),
    })
  );
}

export type NewsItem = {
  id: number;
  news_date: string;
  headline: string;
  url: string;
  source: string;
  captions: Caption[];
};

// The most recent daily headline with its captions sorted by score.
export async function getLatestNews(supabase: Supabase, userId: string) {
  const { data: news, error } = await supabase
    .from("news_items")
    .select("id, news_date, headline, url, source, captions(id, text)")
    .order("news_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!news) return null;

  const { scores, myVotes } = await getVotes(
    supabase,
    userId,
    news.captions.map((c) => c.id)
  );

  return {
    ...news,
    captions: news.captions
      .map((c) => ({ ...c, score: scores.get(c.id) ?? 0, myVote: myVotes.get(c.id) ?? 0 }))
      .sort((a, b) => b.score - a.score || a.id - b.id),
  } as NewsItem;
}

// Highest-scoring captions (on photos or news) from the last `days` days.
export async function getTopCaptions(
  supabase: Supabase,
  userId: string,
  { days = 7, limit = 10 } = {}
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: captions, error } = await supabase
    .from("captions")
    .select("id, text, images(id, storage_path), news_items(id, headline)")
    .gte("created_at", since);

  if (error) throw new Error(error.message);

  // Many-to-one embeds: PostgREST returns one object (or null), not an array.
  const rows = captions.map((c) => ({
    ...c,
    image: c.images as unknown as { id: number; storage_path: string } | null,
    news: c.news_items as unknown as { id: number; headline: string } | null,
  }));
  const [{ scores, myVotes }, urls] = await Promise.all([
    getVotes(supabase, userId, rows.map((c) => c.id)),
    signImageUrls(supabase, rows.flatMap((c) => (c.image ? [c.image.storage_path] : []))),
  ]);

  return rows
    .map((c) => ({
      id: c.id,
      text: c.text,
      image: c.image && { id: c.image.id, image_url: urls.get(c.image.storage_path) ?? "" },
      news: c.news,
      score: scores.get(c.id) ?? 0,
      myVote: myVotes.get(c.id) ?? 0,
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, limit);
}

async function getVotes(supabase: Supabase, userId: string, captionIds: number[]) {
  const scores = new Map<number, number>();
  const myVotes = new Map<number, number>();
  if (!captionIds.length) return { scores, myVotes };

  const { data: votes, error } = await supabase
    .from("caption_votes")
    .select("caption_id, user_id, vote")
    .in("caption_id", captionIds);

  if (error) throw new Error(error.message);

  for (const v of votes) {
    scores.set(v.caption_id, (scores.get(v.caption_id) ?? 0) + v.vote);
    if (v.user_id === userId) myVotes.set(v.caption_id, v.vote);
  }
  return { scores, myVotes };
}
