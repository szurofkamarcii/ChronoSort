import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Megmondjuk a Vercelnek, hogy engedje 60 másodpercig futni a függvényt (10mp helyett)
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const generatedDays: string[] = [];

    // Végigmegyünk a következő 7 napon
    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split("T")[0];

      // Ellenőrizzük, van-e már adat
      const { data, error } = await supabase
        .from("daily_challenges")
        .select("id")
        .eq("date", dateStr)
        .eq("language", "hu")
        .maybeSingle();

      if (!data) {
        // HA NINCS ADAT, LEGENERÁLJUK AZ ADOTT NAPRA
        let selectedEvents: any[] = [];
        let attempts = 0;

        while (selectedEvents.length < 6 && attempts < 20) {
          attempts++;
          const randomMonth = Math.floor(Math.random() * 12) + 1;
          const randomDay = Math.floor(Math.random() * 28) + 1;

          const mm = randomMonth.toString().padStart(2, "0");
          const dd = randomDay.toString().padStart(2, "0");

          const wikiRes = await fetch(
            `https://hu.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`,
          );
          if (!wikiRes.ok) continue;

          const wikiData = await wikiRes.json();
          if (!wikiData.events || wikiData.events.length === 0) continue;

          const validEvents = wikiData.events.filter(
            (e: any) =>
              e.pages &&
              e.pages.length > 0 &&
              e.pages[0].thumbnail &&
              e.pages[0].thumbnail.source,
          );

          const shuffled = validEvents.sort(() => 0.5 - Math.random());
          for (const event of shuffled) {
            if (selectedEvents.length < 6) {
              selectedEvents.push({
                id: crypto.randomUUID(),
                title:
                  event.pages[0].titles?.normalized || event.pages[0].title,
                description: event.text,
                date: `${event.year}-${mm}-${dd}`,
                yearForSorting: event.year,
                image_url: event.pages[0].thumbnail.source,
              });
            }
          }
        }

        // Ha sikerült 6 eseményt találni, elmentjük
        if (selectedEvents.length === 6) {
          selectedEvents.sort((a, b) => a.yearForSorting - b.yearForSorting);
          const finalEvents = selectedEvents.map(
            ({ yearForSorting, ...rest }) => rest,
          );

          await supabase.from("daily_challenges").insert({
            date: dateStr,
            language: "hu",
            events_json: finalEvents,
          });

          generatedDays.push(dateStr);
        }
      }
    }

    if (generatedDays.length === 0) {
      return NextResponse.json(
        { message: "A 7 napos buffer már teljesen fel van töltve." },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Sikeres generálás a következő napokra: ${generatedDays.join(", ")}`,
        generatedDays,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Generálási hiba:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
