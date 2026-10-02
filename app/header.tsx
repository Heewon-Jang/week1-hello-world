import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase/server";
import { signOut } from "./actions";
import LoginButton from "./login-button";

export default async function Header() {
  const { user, profile } = await getUserAndProfile();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <Link href="/" className="text-lg font-bold">
        Caption Rater
      </Link>

      {user ? (
        <nav className="flex items-center gap-4">
          <Link href="/upload" className="hover:underline">
            Upload
          </Link>
          <Link href="/top" className="hover:underline">
            Top
          </Link>
          <Link href="/profile" className="flex items-center gap-2 hover:underline">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : null}
            {profile?.first_name || user.email}
          </Link>
          <form action={signOut}>
            <button className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-100 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-900">
              Sign out
            </button>
          </form>
        </nav>
      ) : (
        <LoginButton />
      )}
    </header>
  );
}
