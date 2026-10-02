"use client";

import { useOptimistic, useState, useTransition } from "react";
import { voteOnCaption } from "./actions";

type Props = {
  captionId: number;
  score: number;
  myVote: number;
  signedIn: boolean;
};

export default function VoteButtons({ captionId, score, myVote, signedIn }: Props) {
  const [optimistic, setOptimistic] = useOptimistic({ score, myVote });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return <span className="text-sm text-gray-500">Sign in to vote</span>;
  }

  const handleVote = (vote: 1 | -1) => {
    setError("");
    startTransition(async () => {
      // Voting the same way twice removes the vote.
      const nextVote = optimistic.myVote === vote ? 0 : vote;
      setOptimistic({
        score: optimistic.score - optimistic.myVote + nextVote,
        myVote: nextVote,
      });
      const result = await voteOnCaption(captionId, vote);
      if (result.error) setError(result.error);
    });
  };

  const buttonClass = (active: boolean, color: string) =>
    `flex h-8 w-8 items-center justify-center rounded-full border text-lg cursor-pointer disabled:opacity-60 ${
      active ? color : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
    }`;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        aria-label="Upvote"
        aria-pressed={optimistic.myVote === 1}
        disabled={pending}
        onClick={() => handleVote(1)}
        className={buttonClass(optimistic.myVote === 1, "border-green-600 bg-green-600 text-white")}
      >
        ▲
      </button>
      <span className="w-6 text-center font-semibold tabular-nums">{optimistic.score}</span>
      <button
        aria-label="Downvote"
        aria-pressed={optimistic.myVote === -1}
        disabled={pending}
        onClick={() => handleVote(-1)}
        className={buttonClass(optimistic.myVote === -1, "border-red-600 bg-red-600 text-white")}
      >
        ▼
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
