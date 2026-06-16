import { createClient } from "@/lib/supabase/server";
import GameBoard from "@/components/GameBoard";
import Link from "next/link";
import NicknameModal from "@/components/NicknameModal";
import { getHungarianDateString } from "@/lib/dateUtils";

// ÚJ: Segédfüggvény, ami a Q-kódból magyar szöveget csinál
async function getWikidataLabel(
  themeCode: string | null,
): Promise<string | null> {
  if (!themeCode) return null;

  // Ha nem "Q" betűvel kezdődik és nem számok követik, akkor valószínűleg már rendes szöveg
  if (!/^Q\d+$/.test(themeCode)) return themeCode;

  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${themeCode}&props=labels&languages=hu|en&format=json`,
      {
        next: { revalidate: 86400 }, // Cache-eljük 24 órára, hogy ne spammeljük a Wikidatát
      },
    );
    const data = await res.json();
    const entity = data.entities[themeCode];

    if (entity && entity.labels) {
      // Megpróbáljuk a magyar nevet, ha nincs, akkor az angolt, ha az sincs, visszaadjuk a kódot
      return entity.labels.hu?.value || entity.labels.en?.value || themeCode;
    }
  } catch (e) {
    console.error("Hiba a Wikidata név lekérésénél:", e);
  }
  return themeCode;
}

export default async function DailyGamePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const targetDate = resolvedParams.date || getHungarianDateString();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Kiegészített lekérdezés a theme oszloppal
  const { data: challenge, error } = await supabase
    .from("daily_challenges")
    .select("events_json, theme, date_property")
    .eq("date", targetDate)
    .eq("language", "hu")
    .single();

  if (error || !challenge) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ChronoSort</h1>
          <p className="text-gray-600">
            Erre a napra ({targetDate}) nem található feladvány az archívumban.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline font-bold">
            Vissza a főoldalra
          </Link>
        </div>
      </main>
    );
  }

  // ÚJ: Lefordítjuk a témát, mielőtt átadjuk a kliensnek
  let displayTheme = await getWikidataLabel(challenge.theme);

  // Ha sikeres a fordítás, nagybetűsítsük az első karaktert, hogy szép legyen a címben
  if (displayTheme) {
    displayTheme = displayTheme.charAt(0).toUpperCase() + displayTheme.slice(1);
  }

  let existingScore = null;
  if (user) {
    const { data } = await supabase
      .from("daily_scores")
      .select("*")
      .eq("date", targetDate)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) existingScore = data;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-10 font-sans">
      <div className="w-full max-w-6xl mx-auto mb-4 md:mb-8 flex justify-between items-center px-4">
        <Link
          href="/"
          className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-2 font-bold">
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
          <span className="hidden md:inline">Vissza</span>
        </Link>
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            ChronoSort
          </h1>
          {resolvedParams.date && (
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-2 py-1 rounded-md mt-1 inline-block">
              Archívum: {targetDate}
            </span>
          )}
        </div>
        <div className="w-20"></div>
      </div>

      {/* Átadjuk a lefordított témát is! */}
      <GameBoard
        initialCards={challenge.events_json}
        user={user}
        existingScore={existingScore}
        gameDate={targetDate}
        theme={displayTheme}
        dateProperty={challenge.date_property}
      />

      <NicknameModal user={user} />
    </main>
  );
}
