import { createAdminClient } from "@/lib/supabase/admin";
import { captionHeadline } from "@/lib/gemini";

const FEEDS = [
  { source: "Columbia Spectator", url: "https://www.columbiaspectator.com/arc/outboundfeeds/rss/?outputType=xml" },
  { source: "Bwog", url: "https://bwog.com/feed/" },
  { source: "amNY", url: "https://www.amny.com/feed/" },
];

const HEADLINES_PER_FEED = 10;

type Headline = { headline: string; url: string; source: string };

// Today's date in New York, as YYYY-MM-DD.
export function newsDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(date);
}

function decode(text: string) {
  return text
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

async function fetchFeed({ source, url }: (typeof FEEDS)[number]): Promise<Headline[]> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return [];
  const xml = await res.text();

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => ({
      headline: decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      url: decode(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""),
      source,
    }))
    .filter((item) => item.headline && item.url.startsWith("http"))
    .slice(0, HEADLINES_PER_FEED);
}

// Creates today's news headline and its captions if they don't exist yet.
// Runs on the server after a page render; safe to call more than once.
export async function ensureTodaysNews() {
  const supabase = createAdminClient();
  const today = newsDate();

  const { data: existing } = await supabase
    .from("news_items")
    .select("id")
    .eq("news_date", today)
    .maybeSingle();
  if (existing) return;

  const feeds = await Promise.allSettled(FEEDS.map(fetchFeed));
  const headlines = feeds.flatMap((feed) => (feed.status === "fulfilled" ? feed.value : []));
  if (!headlines.length) throw new Error("No news headlines available.");

  const { index, captions } = await captionHeadline(headlines.map((h) => h.headline));
  const pick = headlines[index];

  const { data: news, error } = await supabase
    .from("news_items")
    .insert({ news_date: today, ...pick })
    .select("id")
    .single();
  // Unique violation: another request created today's headline first.
  if (error?.code === "23505") return;
  if (error) throw new Error(error.message);

  const { error: captionError } = await supabase
    .from("captions")
    .insert(captions.map((text) => ({ news_id: news.id, text })));
  if (captionError) throw new Error(captionError.message);
}
