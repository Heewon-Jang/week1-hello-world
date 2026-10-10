import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { getBattleLeaderboard, getNextMatchup } from "@/lib/battles";
import BattleArena from "./battle-arena";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function BattlePage() {
  const { supabase, user } = await getUserAndProfile();

  if (!user) redirect("/");

  let matchup, leaderboard;
  try {
    [matchup, leaderboard] = await Promise.all([
      getNextMatchup(supabase, user.id),
      getBattleLeaderboard(supabase),
    ]);
  } catch (error) {
    return <main className="p-6">Error: {(error as Error).message}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">Caption Battle ⚔️</h1>
        {matchup && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You&apos;ve judged {matchup.myBattles} {matchup.myBattles === 1 ? "battle" : "battles"}
          </p>
        )}
      </div>

      {matchup ? (
        // A new key per pair resets the arena after "Next battle".
        <BattleArena key={`${matchup.left.id}-${matchup.right.id}`} matchup={matchup} />
      ) : (
        <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-600 dark:bg-gray-900 dark:text-gray-400">
          You&apos;ve judged every battle! 🎉{" "}
          <Link href="/upload" className="font-semibold underline">
            Upload a photo
          </Link>{" "}
          to start new ones.
        </p>
      )}

      <h2 className="mb-1 mt-12 text-xl font-bold">Battle rankings 🏆</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Elo rating: every caption starts at 1000. Beating a higher-rated caption earns more points.
      </p>

      {leaderboard.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No battles yet. Be the first!</p>
      ) : (
        <ol className="space-y-3">
          {leaderboard.map((caption, index) => (
            <li
              key={caption.id}
              className="flex items-center gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <span className="w-8 text-center text-xl font-bold">{MEDALS[index] ?? index + 1}</span>
              {caption.image ? (
                <Link href={`/#image-${caption.image.id}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={caption.image.image_url} alt="" className="h-14 w-14 rounded object-cover" />
                </Link>
              ) : (
                <span
                  title={caption.news?.headline}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-amber-100 text-2xl dark:bg-amber-950"
                >
                  📰
                </span>
              )}
              <p className="flex-1">{caption.text}</p>
              <div className="shrink-0 text-right">
                <p className="font-bold tabular-nums">{caption.rating}</p>
                <p className="text-xs text-gray-500 tabular-nums">
                  {caption.wins}W {caption.losses}L
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
