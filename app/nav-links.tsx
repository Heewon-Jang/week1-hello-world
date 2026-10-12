"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Feed", emoji: "🏠" },
  { href: "/battle", label: "Battle", emoji: "⚔️" },
  { href: "/top", label: "Top", emoji: "🏆" },
  { href: "/me", label: "My Stats", emoji: "📊" },
];

// Highlights the current page so users always know where they are.
export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
            }`}
          >
            <span className="mr-1">{link.emoji}</span>
            {link.label}
          </Link>
        );
      })}
      <Link
        href="/upload"
        aria-current={pathname.startsWith("/upload") ? "page" : undefined}
        className="ml-1 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
      >
        + Upload
      </Link>
    </div>
  );
}
