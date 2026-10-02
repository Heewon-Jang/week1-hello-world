import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import UploadForm from "./upload-form";

export default async function UploadPage() {
  const { user } = await getUserAndProfile();

  if (!user) redirect("/");

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">Upload a photo 📸</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Snap something from campus or around the city. AI will describe it,
        then write captions for everyone to vote on.
      </p>
      <UploadForm />
    </main>
  );
}
