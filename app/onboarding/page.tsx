import { redirect } from "next/navigation";
import { getUserAndProfile, needsName } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const { user, profile } = await getUserAndProfile();

  if (!user) redirect("/");
  if (!needsName(profile)) redirect("/members");

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">Welcome! 👋</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Before you continue, tell us your name.
      </p>
      <OnboardingForm
        firstName={profile?.first_name}
        lastName={profile?.last_name}
      />
    </main>
  );
}
