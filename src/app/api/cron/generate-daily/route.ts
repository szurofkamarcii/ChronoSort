import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel limit emelése 60 másodpercre (az ingyenes csomag maximuma),
// hogy legyen ideje a SPARQL-nek lefutni több napra is!
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Regex szanáló kizárólag a leírások (description) "spoilereinek" eltávolítására
function sanitizeDescription(text: string): string {
  if (!text) return text;
  // 1. Zárójeles évszám blokkok teljes eltávolítása: pl. " (1914-1918)" -> ""
  let sanitized = text.replace(/\s*\([^)]*(?:1|2)\d{3}[^)]*\)/g, "");
  // 2. Szabadon lévő évszámok és esetleges toldalékok maszkolása: pl. "1956-ban" -> "***"
  sanitized = sanitized.replace(
    /(?:1|2)\d{3}(?:-[a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]+)?/g,
    "***",
  );
  return sanitized.trim();
}

export async function GET(request: Request) {
  // Biztonsági ellenőrzés
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const generatedDays: string[] = [];

    // Végigmegyünk a mai naptól kezdve a következő 7 napon
    for (let i = 0; i <= 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + i);

      const targetDateStr = targetDate.toISOString().split("T")[0];
      const month = String(targetDate.getMonth() + 1).padStart(2, "0");
      const day = String(targetDate.getDate()).padStart(2, "0");

      // 1. Megnézzük, le van-e már generálva ez a nap (elég az egyik nyelvet, pl. a magyart csekkolni)
      const { data: existing } = await supabaseAdmin
        .from("daily_challenges")
        .select("id")
        .eq("date", targetDateStr)
        .eq("language", "hu")
        .maybeSingle();

      // Ha már létezik, ugorjunk a következő napra
      if (existing) {
        continue;
      }

      // HA NINCS ADAT ERRE A NAPRA: Lefuttatjuk a te logikádat!
      const wikiRes = await fetch(
        `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`,
      );
      if (!wikiRes.ok) continue; // Ha a wiki épp nem elérhető, ugrunk

      const wikiData = await wikiRes.json();
      const events = wikiData.events;

      let rawResults: any = null;
      let selectedThemeQid = "";
      let attempts = 0;
      const maxAttempts = 3;

      const shuffledEvents = events.sort(() => 0.5 - Math.random());

      for (const event of shuffledEvents) {
        if (attempts >= maxAttempts) break;
        attempts++;

        const mainPage = event.pages[0];
        if (!mainPage || !mainPage.titles || !mainPage.titles.normalized)
          continue;

        const articleTitle = mainPage.titles.normalized;

        const propsRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(articleTitle)}&format=json`,
        );
        const propsData = await propsRes.json();
        const pages = propsData.query.pages;
        const pageId = Object.keys(pages)[0];
        const qid = pages[pageId]?.pageprops?.wikibase_item;

        if (!qid) continue;

        const entityRes = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P31&format=json`,
        );
        const entityData = await entityRes.json();
        const p31Claim = entityData.claims?.P31?.[0];
        const themeQid = p31Claim?.mainsnak?.datavalue?.value?.id;

        if (!themeQid) continue;
        selectedThemeQid = themeQid;

        const sparqlQuery = `
          SELECT DISTINCT ?entity ?image ?date
            ?label_en ?desc_en
            ?label_hu ?desc_hu
            ?label_es ?desc_es
          WHERE {
            ?entity wdt:P31 wd:${themeQid}; 
                    wdt:P18 ?image.     
            
            ?entity wdt:P571 | wdt:P577 | wdt:P585 | wdt:P580 ?date.

            ?entity rdfs:label ?label_en. FILTER(LANG(?label_en) = "en")
            ?entity rdfs:label ?label_hu. FILTER(LANG(?label_hu) = "hu")
            ?entity rdfs:label ?label_es. FILTER(LANG(?label_es) = "es")

            ?entity schema:description ?desc_en. FILTER(LANG(?desc_en) = "en")
            ?entity schema:description ?desc_hu. FILTER(LANG(?desc_hu) = "hu")
            ?entity schema:description ?desc_es. FILTER(LANG(?desc_es) = "es")
          }
          LIMIT 50
        `;

        const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
        const sparqlRes = await fetch(sparqlUrl, {
          headers: {
            "User-Agent": "ChronoSort-App/1.0 (Contact: admin@example.com)",
          },
        });

        const sparqlData = await sparqlRes.json();
        const results = sparqlData.results.bindings;

        const uniqueEntities = new Map();
        const yearRegex = /(?:1|2)\d{3}/;

        for (const item of results) {
          const id = item.entity.value.split("/").pop();

          const titleEn = item.label_en.value;
          const titleHu = item.label_hu.value;
          const titleEs = item.label_es.value;

          if (
            yearRegex.test(titleEn) ||
            yearRegex.test(titleHu) ||
            yearRegex.test(titleEs)
          ) {
            continue;
          }

          if (!uniqueEntities.has(id)) {
            uniqueEntities.set(id, item);
          }

          if (uniqueEntities.size === 6) break;
        }

        if (uniqueEntities.size === 6) {
          rawResults = Array.from(uniqueEntities.values());
          break; // Megvan a 6, kitörünk a SPARQL ciklusból
        }
      } // -- End of Events loop

      // Ha megvan a nyers eredményünk, alakítsuk át a nyelvi mutációkra és mentsük le
      if (rawResults) {
        const languages = ["en", "hu", "es"] as const;
        const insertData = languages.map((lang) => {
          const localizedCards = rawResults.map((item: any) => ({
            id: item.entity.value.split("/").pop(),
            image_url: item.image.value,
            date: item.date.value.split("T")[0],
            title: item[`label_${lang}`].value,
            description: sanitizeDescription(item[`desc_${lang}`].value),
          }));

          localizedCards.sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

          return {
            date: targetDateStr,
            language: lang,
            theme: selectedThemeQid,
            events_json: localizedCards,
            is_approved: true,
          };
        });

        // Betoljuk az adatbázisba
        await supabaseAdmin
          .from("daily_challenges")
          .upsert(insertData, { onConflict: "date, language" });

        generatedDays.push(targetDateStr);
      }
    } // -- End of 7 days loop

    if (generatedDays.length === 0) {
      return NextResponse.json(
        {
          message:
            "Minden nap le van generálva a következő 7 napra, nincs teendő.",
        },
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
