import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getUserAndProfile, needsName } from "@/lib/supabase/server";
import { getFeed, getLatestNews } from "@/lib/captions";
import { ensureTodaysNews, newsDate } from "@/lib/news";
import LoginButton from "./login-button";
import CaptionList from "./caption-list";

const HOW_IT_WORKS = [
  { emoji: "📸", title: "Upload a photo", text: "AI looks at it and writes 5 captions." },
  { emoji: "👍", title: "Vote", text: "▲ the funny captions, ▼ the ones that miss." },
  { emoji: "⚔️", title: "Battle", text: "Pick the funnier of two captions to rank them." },
];

function HowItWorks() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {HOW_IT_WORKS.map((step, index) => (
        <li key={step.title} className="rounded-xl border border-gray-200 p-4 text-left dark:border-gray-800">
          <p className="text-2xl">{step.emoji}</p>
          <p className="mt-2 font-semibold">
            {index + 1}. {step.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}

function timeAgo(date: string) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const { supabase, user, profile } = await getUserAndProfile();
  const newImageId = Number((await searchParams).new) || null;

  // Content is members-only (also enforced by RLS): show a sign-in page.
  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-4xl font-bold">Caption Rater 😂</h1>
        <p className="max-w-md text-lg text-gray-600 dark:text-gray-400">
          Upload a photo, let AI caption it, and vote on the funniest captions
          from around Columbia and NYC.
        </p>
        <LoginButton />
        <p className="text-sm text-gray-500">Sign in with your Google account to get started.</p>
        <div className="mt-6 w-full">
          <HowItWorks />
        </div>
      </main>
    );
  }

  // Logged in but no name yet: ask for it first.
  if (needsName(profile)) {
    redirect("/onboarding");
  }

  let images, news;
  try {
    [images, news] = await Promise.all([
      getFeed(supabase, user.id),
      getLatestNews(supabase, user.id),
    ]);
  } catch (error) {
    return <main className="p-6">Error: {(error as Error).message}</main>;
  }

  // First visit of the day: pick today's headline in the background.
  if (news?.news_date !== newsDate()) {
    after(() => ensureTodaysNews().catch((error) => console.error("Daily news:", error)));
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      {newImageId ? (
        <div className="mb-6 rounded-xl bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-100">
          <p className="font-semibold">🎉 Your photo is live!</p>
          <p className="text-sm">
            AI wrote captions for it below. Vote on your favorites, or{" "}
            <Link href="/upload" className="font-semibold underline">
              upload another
            </Link>
            .
          </p>
        </div>
      ) : (
        <section className="mb-8">
          <h1 className="mb-1 text-2xl font-bold">Hey {profile?.first_name} 👋</h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">Here&apos;s how Caption Rater works:</p>
          <HowItWorks />
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
            >
              <span>📸</span>
              Upload a photo
            </Link>
            <Link
              href="/battle"
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
            >
              <span>⚔️</span>
              Start a battle
            </Link>
          </div>
        </section>
      )}

      {news && (
        <section
          id="news"
          className="mb-10 scroll-mt-24 overflow-hidden rounded-xl border border-amber-300 dark:border-amber-800"
        >
          <div className="bg-amber-50 p-4 dark:bg-amber-950">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              <span>📰</span>
              Today&apos;s headline · {news.source}
            </p>
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold hover:underline"
            >
              {news.headline} <span className="text-sm font-normal text-amber-700 dark:text-amber-400">↗</span>
            </a>
          </div>
          <CaptionList captions={news.captions} />
        </section>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-bold">Rate the captions</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tap ▲ if a caption made you laugh, ▼ if it missed. Tap again to undo.
        </p>
      </div>

      {images.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-4xl">📷</p>
          <p className="mt-2 font-semibold">No photos yet</p>
          <Link href="/upload" className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            Upload the first one
          </Link>
        </div>
      )}

      <div className="space-y-8">
        {images.map((image) => (
          <article
            key={image.id}
            id={`image-${image.id}`}
            className={`scroll-mt-24 overflow-hidden rounded-xl border shadow-sm ${
              image.id === newImageId
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {image.mine ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Your photo
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">📷 Community photo</span>
                )}
              </span>
              <time dateTime={image.created_at} className="text-gray-500">
                {timeAgo(image.created_at)}
              </time>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.image_url}
              alt={image.description ?? "Uploaded image"}
              className="max-h-[32rem] w-full bg-gray-100 object-contain dark:bg-gray-900"
            />
            {image.description && (
              <details className="border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-800">
                <summary className="cursor-pointer select-none text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                  <span className="ml-1">🤖 What the AI saw</span>
                </summary>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{image.description}</p>
              </details>
            )}
            <CaptionList captions={image.captions} />
          </article>
        ))}
      </div>
    </main>
  );
}
