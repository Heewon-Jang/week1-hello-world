import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { getTopCaptions } from "@/lib/captions";
import VoteButtons from "../vote-buttons";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function TopPage() {
  const { supabase, user } = await getUserAndProfile();

  if (!user) redirect("/");

  let captions;
  try {
    captions = await getTopCaptions(supabase, user.id);
  } catch (error) {
    return <main className="p-6">Error: {(error as Error).message}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Top captions this week 🏆</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        The highest-voted captions on photos and news from the last 7 days.
      </p>

      {captions.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">
          No votes yet this week.{" "}
          <Link href="/" className="font-semibold underline">
            Go vote!
          </Link>
        </p>
      )}

      <ol className="space-y-4">
        {captions.map((caption, index) => (
          <li
            key={caption.id}
            className="flex items-center gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
          >
            <span className="w-8 text-center text-xl font-bold">
              {MEDALS[index] ?? index + 1}
            </span>
            {caption.image ? (
              <Link href={`/#image-${caption.image.id}`} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={caption.image.image_url}
                  alt=""
                  className="h-16 w-16 rounded object-cover"
                />
              </Link>
            ) : (
              <Link
                href="/#news"
                title={caption.news?.headline}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-amber-100 text-3xl dark:bg-amber-950"
              >
                📰
              </Link>
            )}
            <p className="flex-1">{caption.text}</p>
            <VoteButtons
              captionId={caption.id}
              score={caption.score}
              myVote={caption.myVote}
              signedIn
            />
          </li>
        ))}
      </ol>
    </main>
  );
}
