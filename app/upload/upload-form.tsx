"use client";

import { useActionState, useState } from "react";
import { uploadImage } from "../actions";
import { resizeImage } from "@/lib/resize-image";

const MAX_IMAGE_SIZE = 1024;

export default function UploadForm() {
  const [state, action, pending] = useActionState(uploadImage, {});
  const [image, setImage] = useState("");
  const [photoError, setPhotoError] = useState("");

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPhotoError("");
      setImage(await resizeImage(file, MAX_IMAGE_SIZE, { quality: 0.8 }));
    } catch (error) {
      setPhotoError((error as Error).message);
    }
  };

  return (
    <form action={action} className="space-y-4">
      <label className="flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Your upload" className="max-h-96 w-full object-contain" />
        ) : (
          <span className="font-medium text-gray-500">Choose a photo</span>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          disabled={pending}
          className="hidden"
        />
      </label>
      <input type="hidden" name="image" value={image} />

      {photoError && <p className="text-red-600">{photoError}</p>}
      {state.error && <p className="text-red-600">{state.error}</p>}

      <button
        disabled={!image || pending}
        className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Writing captions..." : "Generate captions"}
      </button>
    </form>
  );
}
