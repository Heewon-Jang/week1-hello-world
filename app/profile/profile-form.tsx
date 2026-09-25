"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "../actions";
import NameFields from "../name-fields";

type Props = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

const AVATAR_SIZE = 256;

// Crops the photo to a square and shrinks it to a small JPEG data URL.
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      canvas
        .getContext("2d")!
        .drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_SIZE,
          AVATAR_SIZE
        );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export default function ProfileForm({ firstName, lastName, avatarUrl }: Props) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [photoError, setPhotoError] = useState("");

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPhotoError("");
      setAvatar(await resizeImage(file));
    } catch (error) {
      setPhotoError((error as Error).message);
    }
  };

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt="Your photo"
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-gray-800">
            No photo
          </div>
        )}
        <label className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900">
          Upload photo
          <input
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
          />
        </label>
      </div>
      {photoError && <p className="text-red-600">{photoError}</p>}
      <input type="hidden" name="avatar_url" value={avatar} />

      <NameFields firstName={firstName} lastName={lastName} />

      {state.error && <p className="text-red-600">{state.error}</p>}
      {state.message && <p className="text-green-600">{state.message}</p>}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
