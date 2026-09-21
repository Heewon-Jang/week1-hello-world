import { createClient } from "@supabase/supabase-js";

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("*")
    .order("id");

  if (error) {
    return <main>Error: {error.message}</main>;
  }

  return (
    <main>
      <h1>Jokes from Supabase</h1>

      <ul>
        {jokes?.map((joke) => (
          <li key={joke.id}>{joke.joke}</li>
        ))}
      </ul>
    </main>
  );
}