import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const { user, profile } = await getUserAndProfile();

  if (!user) redirect("/");

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">Profile</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">{user.email}</p>
      <ProfileForm
        firstName={profile?.first_name}
        lastName={profile?.last_name}
        avatarUrl={profile?.avatar_url}
      />
    </main>
  );
}
