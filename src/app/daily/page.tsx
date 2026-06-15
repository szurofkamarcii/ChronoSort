import { createClient } from "@/lib/supabase/server";
import GameBoard from "@/components/GameBoard";
import Link from "next/link";

export default async function DailyGamePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Ellenőrizzük, be van-e jelentkezve a felhasználó
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: challenge, error } = await supabase
    .from("daily_challenges")
    .select("events_json")
    .eq("date", today)
    .eq("language", "hu")
    .single();

  if (error || !challenge) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ChronoSort</h1>
          <p className="text-gray-600">Nem található a mai napi feladvány.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline">
            Vissza a főoldalra
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-10 font-sans">
      <div className="w-full max-w-6xl mx-auto mb-4 md:mb-8 flex justify-between items-center px-4">
        <Link
          href="/"
          className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="hidden md:inline font-medium">Főmenü</span>
        </Link>
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            ChronoSort
          </h1>
        </div>
        <div className="w-20 flex justify-end">
          {/* Ha akarunk fejlécbe profil ikont, ide jöhet később */}
        </div>
      </div>

      {/* Átadjuk a user objektumot a kliensnek */}
      <GameBoard initialCards={challenge.events_json} user={user} />
    </main>
  );
}
