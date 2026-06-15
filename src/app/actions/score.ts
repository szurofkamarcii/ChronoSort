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

  const { error } = await supabase.from("daily_scores").upsert(
    {
      user_id: user.id,
      date: dateStr,
      attempts: attempts,
      score: score,
      time_seconds: time_seconds,
    },
    { onConflict: "user_id, date" },
  );

  if (error) {
    console.error("Hiba a pontmentésnél:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
