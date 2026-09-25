"use client";

import { useActionState } from "react";
import { completeOnboarding } from "../actions";
import NameFields from "../name-fields";

type Props = {
  firstName?: string | null;
  lastName?: string | null;
};

export default function OnboardingForm({ firstName, lastName }: Props) {
  const [state, action, pending] = useActionState(completeOnboarding, {});

  return (
    <form action={action} className="space-y-4">
      <NameFields firstName={firstName} lastName={lastName} />
      {state.error && <p className="text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
