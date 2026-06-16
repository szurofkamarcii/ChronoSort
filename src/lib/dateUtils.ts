export function getHungarianDateString(date: Date = new Date()): string {
  // Lekérjük a budapesti időt, és kiszedjük belőle az évet, hónapot, napot
  const formatter = new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const yyyy = parts.find((p) => p.type === "year")?.value;
  const mm = parts.find((p) => p.type === "month")?.value;
  const dd = parts.find((p) => p.type === "day")?.value;

  return `${yyyy}-${mm}-${dd}`;
}
