import type { Caption } from "@/lib/captions";
import VoteButtons from "./vote-buttons";

// Captions arrive sorted by score; the leader gets a crown once it has votes.
export default function CaptionList({ captions }: { captions: Caption[] }) {
  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
      {captions.map((caption, index) => {
        const leading = index === 0 && caption.score > 0;
        return (
          <li
            key={caption.id}
            className={`flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-900/60 ${
              leading ? "bg-yellow-50/60 dark:bg-yellow-950/20" : ""
            }`}
          >
            <div className="min-w-0">
              {leading && (
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                  <span>👑</span>
                  Top caption
                </span>
              )}
              <p className={leading ? "font-semibold" : ""}>{caption.text}</p>
            </div>
            <VoteButtons captionId={caption.id} score={caption.score} myVote={caption.myVote} signedIn />
          </li>
        );
      })}
    </ul>
  );
}
