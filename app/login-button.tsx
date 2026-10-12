"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginButton() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Login error:", error.message);
      setError(`Couldn't sign in: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleLogin}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 cursor-pointer"
      >
        {loading ? "Redirecting to Google…" : "Sign in with Google"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
