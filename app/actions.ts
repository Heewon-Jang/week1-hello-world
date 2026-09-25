"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

// Photos are resized in the browser to a small JPEG data URL before upload.
const MAX_AVATAR_LENGTH = 400_000;

async function saveProfile(formData: FormData, includeAvatar: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "Please enter both your first and last name." };
  }

  const updates: Record<string, string> = {
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString(),
  };

  if (includeAvatar) {
    const avatar = String(formData.get("avatar_url") ?? "");
    if (avatar) {
      if (!avatar.startsWith("data:image/") || avatar.length > MAX_AVATAR_LENGTH) {
        return { error: "That photo couldn't be used. Try a different image." };
      }
      updates.avatar_url = avatar;
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email, ...updates })
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data?.length) {
    return {
      error:
        "Your profile wasn't saved. Check that the profiles table exists and RLS is off.",
    };
  }

  revalidatePath("/", "layout");
  return null;
}

export async function completeOnboarding(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const result = await saveProfile(formData, false);
  if (result) return result;
  redirect("/members");
}

export async function updateProfile(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const result = await saveProfile(formData, true);
  if (result) return result;
  return { message: "Profile saved!" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
