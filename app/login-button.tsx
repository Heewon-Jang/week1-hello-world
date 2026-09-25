"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginButton() {
  const handleLogin = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Login error:", error.message);
      alert(error.message);
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 active:bg-blue-800 cursor-pointer"
    >
      Sign in with Google
    </button>
  );
}
