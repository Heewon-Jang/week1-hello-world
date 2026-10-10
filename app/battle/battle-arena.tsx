"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordBattle, type BattleResult } from "../actions";
import type { BattleCaption, Matchup } from "@/lib/battles";

export default function BattleArena({ matchup }: { matchup: Matchup }) {
  const router = useRouter();
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingNext, startNext] = useTransition();

  const { left, right, target } = matchup;
  const done = Boolean(result?.ratings);

  const pick = useCallback(
    (winner: BattleCaption, loser: BattleCaption) => {
      if (pickedId !== null) return;
      setPickedId(winner.id);
      startTransition(async () => {
        const outcome = await recordBattle(winner.id, loser.id);
        setResult(outcome);
        if (outcome.error) setPickedId(null);
      });
    },
    [pickedId]
  );

  const next = useCallback(() => startNext(() => router.refresh()), [router]);

  // Keyboard: ← / → to pick, Enter or Space for the next battle.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) return;
      if (!done && event.key === "ArrowLeft") pick(left, right);
      else if (!done && event.key === "ArrowRight") pick(right, left);
      else if (done && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, left, right, pick, next]);

  const card = (caption: BattleCaption, other: BattleCaption, side: string) => {
    const isWinner = pickedId === caption.id;
    const newRating = result?.ratings?.[caption.id];
    const change = newRating !== undefined ? newRating - caption.rating : null;

    let look = "border-gray-300 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950";
    if (pickedId !== null) {
      look = isWinner
        ? "border-green-600 bg-green-50 dark:bg-green-950"
        : "border-gray-200 opacity-60 dark:border-gray-800";
    }

    return (
      <button
        onClick={() => pick(caption, other)}
        disabled={pickedId !== null}
        className={`flex min-h-32 flex-col justify-between gap-3 rounded-xl border-2 p-5 text-left text-lg transition cursor-pointer disabled:cursor-default ${look}`}
      >
        <span>{caption.text}</span>
        <span className="flex items-center justify-between text-sm text-gray-500">
          <span>{done ? (isWinner ? "🏆 Your pick" : "") : side}</span>
          {done && change !== null && (
            <span className="font-semibold tabular-nums">
              {newRating}{" "}
              <span className={change >= 0 ? "text-green-600" : "text-red-600"}>
                ({change >= 0 ? "+" : ""}
                {change})
              </span>
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <section>
      {target.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={target.image_url}
          alt={target.description ?? "Photo"}
          className="mb-6 max-h-[24rem] w-full rounded-lg bg-gray-100 object-contain dark:bg-gray-900"
        />
      ) : (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            📰 Headline · {target.source}
          </p>
          <p className="text-lg font-bold">{target.headline}</p>
        </div>
      )}

      <p className="mb-3 text-center font-semibold">Which caption is funnier?</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {card(left, right, "← Left")}
        {card(right, left, "Right →")}
      </div>

      <div className="mt-6 flex min-h-12 flex-col items-center gap-3 text-center">
        {pending && <p className="text-gray-500">Counting votes…</p>}
        {result?.error && <p className="text-red-600">{result.error}</p>}
        {done && (
          <>
            <p>
              {result!.totalVotes === 1 ? (
                <>You&apos;re the first to judge this pair!</>
              ) : (
                <>
                  <span className="font-bold">{result!.agreePercent}%</span> of{" "}
                  {result!.totalVotes} voters agree with you.
                </>
              )}
            </p>
            <button
              onClick={next}
              disabled={loadingNext}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 cursor-pointer disabled:opacity-60"
            >
              {loadingNext ? "Loading…" : "Next battle →"}
            </button>
          </>
        )}
        {!done && !pending && (
          <button onClick={next} disabled={loadingNext} className="text-sm text-gray-500 hover:underline cursor-pointer">
            Skip
          </button>
        )}
      </div>
    </section>
  );
}
