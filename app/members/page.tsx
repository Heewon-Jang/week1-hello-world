import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, needsName } from "@/lib/supabase/server";

// Members-only page: proxy.ts sends logged-out visitors back to "/".
export default async function MembersPage() {
  const { user, profile } = await getUserAndProfile();

  if (!user) redirect("/");
  if (needsName(profile)) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Members only 🔒</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Hi {profile?.first_name} {profile?.last_name}, only logged-in users can
        see this page.
      </p>

      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="mb-2 text-lg font-semibold">Secret joke of the day</h2>
        <p>
          Why did the user log in? To get past the proxy — it was a real
          gatekeeper.
        </p>
      </div>

      <Link href="/profile" className="mt-6 inline-block font-semibold underline">
        Edit your profile →
      </Link>
    </main>
  );
}
