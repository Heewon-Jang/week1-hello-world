import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, needsName } from "@/lib/supabase/server";

export default async function Home() {
  const { supabase, user, profile } = await getUserAndProfile();

  // Logged in but no name yet: ask for it first.
  if (user && needsName(profile)) {
    redirect("/onboarding");
  }

  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("*")
    .order("id");

  if (error) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  return (
    <main className="p-6">
      {user ? (
        <p className="mb-6 rounded-lg bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-100">
          Welcome back, {profile?.first_name}! Check out the{" "}
          <Link href="/members" className="font-semibold underline">
            members-only page
          </Link>
          .
        </p>
      ) : (
        <p className="mb-6 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
          Sign in to unlock the members-only page and your profile.
        </p>
      )}

      <h1 className="mb-4 text-2xl font-bold">Jokes from Supabase</h1>

      <ul className="list-disc space-y-2 pl-6">
        {jokes?.map((joke) => (
          <li key={joke.id}>{joke.joke}</li>
        ))}
      </ul>
    </main>
  );
}
