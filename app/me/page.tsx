import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { getMyStats } from "@/lib/stats";

export default async function MyStatsPage() {
  const { supabase, user, profile } = await getUserAndProfile();

  if (!user) redirect("/");

  let stats;
  try {
    stats = await getMyStats(supabase, user.id);
  } catch (error) {
    return <main className="p-6">Error: {(error as Error).message}</main>;
  }

  const tiles = [
    { emoji: "⚔️", value: stats.battleCount, label: "battles judged" },
    { emoji: "🎯", value: stats.agreeRate === null ? "–" : `${stats.agreeRate}%`, label: "agree with the crowd" },
    { emoji: "🔥", value: stats.streak, label: stats.streak === 1 ? "day streak" : "days streak" },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{profile?.first_name ? `${profile.first_name}'s stats` : "My stats"} 📊</h1>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-800"
          >
            <p className="text-2xl font-bold tabular-nums">
              {tile.emoji} {tile.value}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
        <span className="text-4xl">{stats.title.emoji}</span>
        <div>
          <p className="font-bold">{stats.title.name}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{stats.title.blurb}</p>
        </div>
      </div>

      {stats.streak === 0 && (
        <p className="mt-4 text-center">
          <Link href="/battle" className="font-semibold underline">
            Judge a battle
          </Link>{" "}
          to start a streak!
        </p>
      )}

      <h2 className="mb-3 mt-10 text-xl font-bold">📸 My photos ({stats.uploads.length})</h2>
      {stats.uploads.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          You haven&apos;t uploaded anything yet.{" "}
          <Link href="/upload" className="font-semibold underline">
            Upload a photo
          </Link>{" "}
          and watch its captions climb the rankings.
        </p>
      ) : (
        <ul className="space-y-3">
          {stats.uploads.map((upload) => (
            <li
              key={upload.id}
              className="flex items-center gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <Link href={`/#image-${upload.id}`} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={upload.image_url} alt="" className="h-16 w-16 rounded object-cover" />
              </Link>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Best caption</p>
                <p>{upload.best?.text ?? "No captions"}</p>
              </div>
              {upload.best && (
                <div className="shrink-0 text-right">
                  <p className="font-bold tabular-nums">{upload.best.rating}</p>
                  <p className="text-xs text-gray-500">
                    {upload.best.rank ? `#${upload.best.rank} overall` : "not battled yet"}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-10 text-xl font-bold">🗳️ Recent battles</h2>
      {stats.recent.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          No battles yet.{" "}
          <Link href="/battle" className="font-semibold underline">
            Start one!
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {stats.recent.map((battle) => {
            const withCrowd = battle.agreePercent > 50;
            return (
              <li key={battle.key} className="flex items-center gap-4 p-3">
                <span className="text-xl">{battle.totalVotes === 1 ? "🆕" : withCrowd ? "✅" : "🙃"}</span>
                <div className="flex-1">
                  <p>{battle.picked}</p>
                  <p className="text-sm text-gray-500 line-through">{battle.over}</p>
                </div>
                <p className="shrink-0 text-right text-sm text-gray-600 dark:text-gray-400">
                  {battle.totalVotes === 1
                    ? "only you so far"
                    : `${battle.agreePercent}% of ${battle.totalVotes} agree`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
