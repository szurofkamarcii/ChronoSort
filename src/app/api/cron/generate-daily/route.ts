import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// FONTOS: Cseréld ki egy valós email címre, hogy a Wikipédia ne tiltsa le a botodat!
const WIKI_USER_AGENT =
  "ChronoSortBot/1.0 (https://chronosort.app; info@chronosort.app)";

function sanitizeDescription(text: string): string {
  if (!text) return text;
  let sanitized = text.replace(/\s*\([^)]*(?:1|2)\d{3}[^)]*\)/g, "");
  sanitized = sanitized.replace(
    /(?:1|2)\d{3}(?:-[a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]+)?/g,
    "***",
  );
  return sanitized.trim();
}

// Segédfüggvény a várakozáshoz (Rate Limit elkerülése miatt)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const generatedDays: string[] = [];

    // Végigmegyünk a MAI NAPTÓL (i = 0) kezdve a következő 7 napon
    for (let i = 0; i <= 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + i);

      const targetDateStr = targetDate.toISOString().split("T")[0];
      const month = String(targetDate.getMonth() + 1).padStart(2, "0");
      const day = String(targetDate.getDate()).padStart(2, "0");

      // 1. Ellenőrizzük, megvan-e már az adott nap
      const { data: existing } = await supabaseAdmin
        .from("daily_challenges")
        .select("id")
        .eq("date", targetDateStr)
        .eq("language", "hu")
        .maybeSingle();

      if (existing) continue; // Ha megvan, megyünk a következő napra

      // 2. Wikipedia On This Day API
      const wikiRes = await fetch(
        `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`,
        { headers: { "User-Agent": WIKI_USER_AGENT } },
      );

      // Ha 429-et kapunk, azonnal megszakítjuk a teljes folyamatot!
      if (wikiRes.status === 429) {
        console.error(
          `Rate limit (429) a ${month}/${day} napnál. Leállás, hogy elkerüljük a tiltást.`,
        );
        break;
      }
      if (!wikiRes.ok) continue;

      const wikiData = await wikiRes.json();
      const events = wikiData.events;
      if (!events || !Array.isArray(events)) continue;

      let rawResults: any = null;
      let selectedThemeQid = "";
      let attempts = 0;
      const maxAttempts = 15;

      const shuffledEvents = events.sort(() => 0.5 - Math.random());

      for (const event of shuffledEvents) {
        if (attempts >= maxAttempts) break;
        attempts++;

        try {
          const mainPage = event.pages[0];
          if (!mainPage || !mainPage.titles || !mainPage.titles.normalized)
            continue;
          const articleTitle = mainPage.titles.normalized;

          // Pihenünk fél másodpercet a Wikipédia / Wikidata API hívások között
          await delay(500);

          const propsRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(articleTitle)}&format=json`,
            { headers: { "User-Agent": WIKI_USER_AGENT } },
          );
          if (!propsRes.ok) continue;

          const propsData = await propsRes.json();
          const pages = propsData?.query?.pages;
          if (!pages) continue;

          const pageId = Object.keys(pages)[0];
          const qid = pages[pageId]?.pageprops?.wikibase_item;
          if (!qid) continue;

          await delay(500); // Újabb pihenő

          const entityRes = await fetch(
            `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P31&format=json`,
            { headers: { "User-Agent": WIKI_USER_AGENT } },
          );
          if (!entityRes.ok) continue;

          const entityData = await entityRes.json();
          const p31Claim = entityData?.claims?.P31?.[0];
          const themeQid = p31Claim?.mainsnak?.datavalue?.value?.id;
          if (!themeQid) continue;

          selectedThemeQid = themeQid;

          await delay(500); // Pihenő a nehéz SPARQL előtt

          const sparqlQuery = `
            SELECT DISTINCT ?entity ?image ?date ?datePropStr
              ?label_en ?desc_en
              ?label_hu ?desc_hu
              ?label_es ?desc_es
            WHERE {
              ?entity wdt:P31 wd:${themeQid}; 
                      wdt:P18 ?image.     
              
              ?entity wdt:P571 | wdt:P577 | wdt:P585 | wdt:P580 ?date.

              OPTIONAL { ?entity wdt:P571 ?d1. BIND("P571" AS ?prop1) }
              OPTIONAL { ?entity wdt:P577 ?d2. BIND("P577" AS ?prop2) }
              OPTIONAL { ?entity wdt:P585 ?d3. BIND("P585" AS ?prop3) }
              OPTIONAL { ?entity wdt:P580 ?d4. BIND("P580" AS ?prop4) }
              BIND(COALESCE(?prop1, ?prop2, ?prop3, ?prop4) AS ?datePropStr)

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
              "User-Agent": WIKI_USER_AGENT,
              Accept: "application/sparql-results+json",
            },
          });
          if (!sparqlRes.ok) continue;

          const sparqlData = await sparqlRes.json();
          const results = sparqlData?.results?.bindings;
          if (!results) continue;

          const uniqueEntities = new Map();
          const yearRegex = /(?:1|2)\d{3}/;

          for (const item of results) {
            const id = item.entity.value.split("/").pop();
            const titleEn = item.label_en?.value || "";
            const titleHu = item.label_hu?.value || "";
            const titleEs = item.label_es?.value || "";

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
            break;
          }
        } catch (innerError) {
          console.error(
            "Hiba egy adott esemény feldolgozása közben:",
            innerError,
          );
          continue;
        }
      }

      if (rawResults) {
        // DOMINÁNS DÁTUMTÍPUS KISZÁMOLÁSA
        const propCounts: Record<string, number> = {};
        rawResults.forEach((item: any) => {
          const propId = item.datePropStr?.value || "P585";
          propCounts[propId] = (propCounts[propId] || 0) + 1;
        });
        const dominantProp = Object.keys(propCounts).reduce((a, b) =>
          propCounts[a] > propCounts[b] ? a : b,
        );

        const languages = ["en", "hu", "es"] as const;
        const insertData = languages.map((lang) => {
          const localizedCards = rawResults.map((item: any) => ({
            id: item.entity.value.split("/").pop(),
            image_url: item.image.value,
            date: item.date.value.split("T")[0],
            title: item[`label_${lang}`]?.value || "Ismeretlen",
            description: sanitizeDescription(item[`desc_${lang}`]?.value || ""),
          }));

          localizedCards.sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

          return {
            date: targetDateStr,
            language: lang,
            theme: selectedThemeQid,
            date_property: dominantProp,
            events_json: localizedCards,
            is_approved: true,
          };
        });

        const { error: upsertError } = await supabaseAdmin
          .from("daily_challenges")
          .upsert(insertData, { onConflict: "date, language" });

        if (upsertError) {
          console.error("Supabase upsert hiba:", upsertError);
        }

        generatedDays.push(targetDateStr);
        break; // Sikeres nap generálása után kilépünk, hogy ne fussunk ki a Vercel 60 másodpercéből!
      }
    }

    if (generatedDays.length === 0) {
      return NextResponse.json(
        {
          message:
            "Nincs generált nap. Lehet, hogy már minden megvan, vagy a Wikidata API blokkolt.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Sikeres generálás a következő napra: ${generatedDays[0]}`,
        generatedDays,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Kritikus cron hiba:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
