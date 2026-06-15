import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const targetDateStr = today.toISOString().split("T")[0];

  try {
    const wikiRes = await fetch(
      `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`,
    );
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
      const qid = pages[pageId].pageprops?.wikibase_item;

      if (!qid) continue;

      const entityRes = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P31&format=json`,
      );
      const entityData = await entityRes.json();
      const p31Claim = entityData.claims?.P31?.[0];
      const themeQid = p31Claim?.mainsnak?.datavalue?.value?.id;

      if (!themeQid) continue;
      selectedThemeQid = themeQid;

      // LIMIT 50-re emelve, hogy a sok eldobott kártya ellenére is meglegyen a 6 db
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
      const yearRegex = /(?:1|2)\d{3}/; // 1000-2999 közötti számokra szűr

      for (const item of results) {
        const id = item.entity.value.split("/").pop();

        // 1. Cím alapú szűrés (Dobjuk az eseményt, ha a címben évszám van)
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

        // 2. Duplikáció szűrés ID alapján
        if (!uniqueEntities.has(id)) {
          uniqueEntities.set(id, item);
        }

        // Ha megvan a 6 darab tökéletes, tiszta kártya, kilépünk
        if (uniqueEntities.size === 6) break;
      }

      if (uniqueEntities.size === 6) {
        rawResults = Array.from(uniqueEntities.values());
        break;
      }
    }

    if (!rawResults) {
      return NextResponse.json(
        {
          error:
            "Nem sikerult 6 db egyedi, évszámmentes és megfelelően forditott esemenyt talalni.",
        },
        { status: 404 },
      );
    }

    const languages = ["en", "hu", "es"] as const;
    const insertData = languages.map((lang) => {
      const localizedCards = rawResults.map((item: any) => ({
        id: item.entity.value.split("/").pop(),
        image_url: item.image.value,
        date: item.date.value.split("T")[0],
        title: item[`label_${lang}`].value, // A címet már nem bántjuk, mert tiszta
        description: sanitizeDescription(item[`desc_${lang}`].value), // A leírásból kimaszkoljuk a maradékot
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

    const { error: dbError } = await supabaseAdmin
      .from("daily_challenges")
      .upsert(insertData, { onConflict: "date, language" });

    if (dbError) throw dbError;

    return NextResponse.json(
      {
        success: true,
        message:
          "Napi kihívások generálva, egyediesítve és kíméletlenül szanálva.",
        cardsFound: 6,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
