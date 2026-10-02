"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { describeImage, writeCaptions } from "@/lib/gemini";

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
        "Your profile wasn't saved. Check the profiles table and its RLS policies.",
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

// Uploaded images are resized in the browser; the Server Action limit is 1MB.
const MAX_IMAGE_LENGTH = 950_000;

// Upload an image, then run the prompt chain:
// image -> description (LLM call 1) -> funny captions (LLM call 2).
export async function uploadImage(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to upload images." };
  }

  const dataUrl = String(formData.get("image") ?? "");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match || dataUrl.length > MAX_IMAGE_LENGTH) {
    return { error: "Choose an image to upload." };
  }
  const [, mimeType, base64] = match;

  let step1, step2;
  try {
    step1 = await describeImage(base64, mimeType);
    step2 = await writeCaptions(step1.description);
  } catch (error) {
    return { error: `Couldn't caption that image: ${(error as Error).message}` };
  }

  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, Buffer.from(base64, "base64"), { contentType: mimeType });
  if (uploadError) {
    return { error: uploadError.message };
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(path);

  const { data: image, error: imageError } = await supabase
    .from("images")
    .insert({
      user_id: user.id,
      storage_path: path,
      image_url: publicUrl,
      description: step1.description,
      description_prompt: step1.prompt,
      description_model: step1.model,
    })
    .select("id")
    .single();
  if (imageError) {
    return { error: imageError.message };
  }

  const { error: captionError } = await supabase
    .from("captions")
    .insert(
      step2.captions.map((text) => ({
        image_id: image.id,
        text,
        prompt: step2.prompt,
        model: step2.model,
      }))
    );
  if (captionError) {
    return { error: captionError.message };
  }

  revalidatePath("/", "layout");
  redirect(`/#image-${image.id}`);
}

// Records the user's vote on a caption. Voting the same way again removes it.
export async function voteOnCaption(captionId: number, vote: 1 | -1) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to vote." };
  }
  if (!Number.isInteger(captionId) || (vote !== 1 && vote !== -1)) {
    return { error: "Invalid vote." };
  }

  const { data: existing } = await supabase
    .from("caption_votes")
    .select("id, vote")
    .eq("caption_id", captionId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } =
    existing?.vote === vote
      ? await supabase.from("caption_votes").delete().eq("id", existing.id)
      : existing
        ? await supabase.from("caption_votes").update({ vote }).eq("id", existing.id)
        : await supabase
            .from("caption_votes")
            .insert({ caption_id: captionId, user_id: user.id, vote });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
