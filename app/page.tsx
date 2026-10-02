import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getUserAndProfile, needsName } from "@/lib/supabase/server";
import { getFeed, getLatestNews } from "@/lib/captions";
import { ensureTodaysNews, newsDate } from "@/lib/news";
import VoteButtons from "./vote-buttons";

export default async function Home() {
  const { supabase, user, profile } = await getUserAndProfile();

  // Logged in but no name yet: ask for it first.
  if (user && needsName(profile)) {
    redirect("/onboarding");
  }

  let images, news;
  try {
    [images, news] = await Promise.all([
      getFeed(supabase, user?.id ?? null),
      getLatestNews(supabase, user?.id ?? null),
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
      {user ? (
        <p className="mb-6 rounded-lg bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-100">
          Hey {profile?.first_name}! Vote on the funniest captions, or{" "}
          <Link href="/upload" className="font-semibold underline">
            upload a photo
          </Link>{" "}
          and let AI caption it.
        </p>
      ) : (
        <p className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
          Sign in to vote on captions and upload your own photos.
        </p>
      )}

      {news && (
        <section
          id="news"
          className="mb-10 scroll-mt-6 overflow-hidden rounded-lg border border-amber-300 dark:border-amber-800"
        >
          <div className="bg-amber-50 p-4 dark:bg-amber-950">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              📰 Today&apos;s headline · {news.source}
            </p>
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold hover:underline"
            >
              {news.headline}
            </a>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {news.captions.map((caption) => (
              <li key={caption.id} className="flex items-center justify-between gap-4 p-4">
                <p>{caption.text}</p>
                <VoteButtons
                  captionId={caption.id}
                  score={caption.score}
                  myVote={caption.myVote}
                  signedIn={!!user}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <h1 className="mb-4 text-2xl font-bold">Rate the captions</h1>

      {images.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">
          No images yet.{" "}
          {user && (
            <Link href="/upload" className="font-semibold underline">
              Upload the first one!
            </Link>
          )}
        </p>
      )}

      <div className="space-y-8">
        {images.map((image) => (
          <article
            key={image.id}
            id={`image-${image.id}`}
            className="scroll-mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.image_url}
              alt={image.description ?? "Uploaded image"}
              className="max-h-[32rem] w-full bg-gray-100 object-contain dark:bg-gray-900"
            />
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {image.captions.map((caption) => (
                <li key={caption.id} className="flex items-center justify-between gap-4 p-4">
                  <p>{caption.text}</p>
                  <VoteButtons
                    captionId={caption.id}
                    score={caption.score}
                    myVote={caption.myVote}
                    signedIn={!!user}
                  />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
