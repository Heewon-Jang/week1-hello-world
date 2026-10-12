import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase/server";
import { signOut } from "./actions";
import LoginButton from "./login-button";
import NavLinks from "./nav-links";

export default async function Header() {
  const { user, profile } = await getUserAndProfile();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-background/90 backdrop-blur dark:border-gray-800">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span>😂</span>
          Caption Rater
        </Link>

        {user ? (
          <>
            <div className="flex items-center gap-2 sm:order-last">
              <Link
                href="/profile"
                title="Edit profile"
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-semibold dark:bg-gray-800">
                    {(profile?.first_name || user.email || "?")[0].toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline">{profile?.first_name || user.email}</span>
              </Link>
              <form action={signOut}>
                <button className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer dark:text-gray-400 dark:hover:bg-gray-900">
                  Sign out
                </button>
              </form>
            </div>
            <nav className="w-full sm:w-auto">
              <NavLinks />
            </nav>
          </>
        ) : (
          <LoginButton />
        )}
      </div>
    </header>
  );
}
