"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { uploadImage } from "../actions";
import { resizeImage } from "@/lib/resize-image";

const MAX_IMAGE_SIZE = 1024;

// Shown one after another while the server runs the two Gemini calls.
const PROGRESS_STEPS = [
  "Uploading your photo…",
  "AI is looking at the photo…",
  "Writing captions about what it sees…",
  "Almost done…",
];

export default function UploadForm() {
  const [state, action, pending] = useActionState(uploadImage, {});
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(
      () => setProgress((step) => Math.min(step + 1, PROGRESS_STEPS.length - 1)),
      4000
    );
    return () => {
      clearInterval(timer);
      setProgress(0);
    };
  }, [pending]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("That file isn't an image. Try a JPG, PNG, or HEIC photo.");
      return;
    }
    try {
      setPhotoError("");
      setImage(await resizeImage(file, MAX_IMAGE_SIZE, { quality: 0.8 }));
      setFileName(file.name);
    } catch (error) {
      setPhotoError((error as Error).message);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!pending) pickPhoto(event.dataTransfer.files?.[0]);
  };

  const clearPhoto = () => {
    setImage("");
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <form action={action} className="space-y-5">
      <div>
        <StepLabel number={1} text="Choose a photo" />
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
          } ${pending ? "pointer-events-none opacity-70" : ""}`}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Your upload" className="max-h-96 w-full rounded-lg object-contain" />
          ) : (
            <>
              <span className="text-4xl">🖼️</span>
              <span className="font-semibold">Click to choose a photo</span>
              <span className="text-sm text-gray-500">or drag and drop it here · JPG, PNG, HEIC</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(event) => pickPhoto(event.target.files?.[0])}
            disabled={pending}
            className="hidden"
          />
        </label>
        {image && !pending && (
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span className="truncate">✅ {fileName}</span>
            <button type="button" onClick={clearPhoto} className="shrink-0 font-medium text-blue-600 hover:underline cursor-pointer">
              Change photo
            </button>
          </div>
        )}
      </div>
      <input type="hidden" name="image" value={image} />

      <div>
        <StepLabel number={2} text="Add context" optional />
        <input
          name="hint"
          maxLength={200}
          disabled={pending}
          placeholder="e.g. my roommate after her first 8am, Butler Library during finals"
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700"
        />
        <p className="mt-1 text-sm text-gray-500">
          Who or what is in the photo? A few words help the AI write captions that fit.
        </p>
      </div>

      {photoError && <p className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">{photoError}</p>}
      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error} Please try again.
        </p>
      )}

      <div>
        <StepLabel number={3} text="Let AI caption it" />
        <button
          disabled={!image || pending}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {PROGRESS_STEPS[progress]}
            </span>
          ) : image ? (
            "✨ Generate captions"
          ) : (
            "Choose a photo first"
          )}
        </button>
        {pending && (
          <p className="mt-2 text-center text-sm text-gray-500">
            This usually takes 10–20 seconds. Don&apos;t close the page.
          </p>
        )}
      </div>
    </form>
  );
}

function StepLabel({ number, text, optional }: { number: number; text: string; optional?: boolean }) {
  return (
    <p className="mb-2 flex items-center gap-2 font-semibold">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
        {number}
      </span>
      {text}
      {optional && <span className="text-sm font-normal text-gray-500">(optional)</span>}
    </p>
  );
}
