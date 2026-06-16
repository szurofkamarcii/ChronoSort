"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveDailyScore(
  attempts: number,
  score: number,
  time_seconds: number,
  dateStr: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nem vagy bejelentkezve." };
  }

  const playerName = user.user_metadata?.nickname || "Névtelen Játékos";

  const { error } = await supabase.from("daily_scores").upsert(
    {
      user_id: user.id,
      date: dateStr,
      attempts: attempts,
      score: score,
      time_seconds: time_seconds,
      player_name: playerName,
    },
    { onConflict: "user_id, date" },
  );

  if (error) {
    console.error("Hiba a pontmentésnél:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ÚJ: Kontextuális Ranglista lekérdezése (Top 5 + a User környezete)
export async function getContextualLeaderboard(
  dateStr: string,
  currentUserId?: string,
) {
  const supabase = await createClient();

  // Lekérjük az összes aznapi pontot, rendezve
  const { data, error } = await supabase
    .from("daily_scores")
    .select("user_id, player_name, score, attempts, time_seconds")
    .eq("date", dateStr)
    .order("score", { ascending: false })
    .order("time_seconds", { ascending: true });

  if (error || !data) {
    console.error("Hiba a ranglista lekérésénél:", error?.message);
    return { success: false, data: [] };
  }

  // 1. Felállítjuk a rangsort
  const rankedData = data.map((item, index) => ({
    ...item,
    rank: index + 1,
    isCurrentUser: currentUserId === item.user_id,
  }));

  let displayIndices = new Set<number>();

  // 2. Hozzáadjuk a Top 5 játékost
  for (let i = 0; i < Math.min(5, rankedData.length); i++) {
    displayIndices.add(i);
  }

  // 3. Hozzáadjuk a User környezetét (maga a user, 2 felette, 2 alatta)
  if (currentUserId) {
    const userIndex = rankedData.findIndex(
      (item) => item.user_id === currentUserId,
    );
    if (userIndex !== -1) {
      for (
        let i = Math.max(0, userIndex - 2);
        i <= Math.min(rankedData.length - 1, userIndex + 2);
        i++
      ) {
        displayIndices.add(i);
      }
    }
  }

  // 4. Sorba rendezzük és visszaadjuk a végső listát
  const result = Array.from(displayIndices)
    .sort((a, b) => a - b)
    .map((index) => rankedData[index]);

  return { success: true, data: result };
}

// ÚJ: Archívum adatok lekérése (Létező napok + a játékos eredményei)
export async function getArchiveData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0]; // Itt jó az UTC alapú leolvasás a Supabase határok miatt, de a kliens felülbírálja

  // 1. Lekérjük az összes eddigi (mai vagy régebbi) legenerált napot
  const { data: challenges } = await supabase
    .from("daily_challenges")
    .select("date")
    .eq("language", "hu")
    .lte("date", today) // Csak a mai napig bezárólag, a jövőt ne mutassa!
    .order("date", { ascending: false });

  const availableDates = challenges?.map((c) => c.date) || [];

  // 2. Lekérjük a felhasználó saját eddigi pontszámait (ha be van lépve)
  let userScores: Record<string, { won: boolean; score: number }> = {};

  if (user) {
    const { data: scores } = await supabase
      .from("daily_scores")
      .select("date, score")
      .eq("user_id", user.id);

    if (scores) {
      scores.forEach((s) => {
        userScores[s.date] = {
          won: s.score > 0,
          score: s.score,
        };
      });
    }
  }

  return { availableDates, userScores };
}
