/** Match Arabic names despite optional vowels, tatweel and common alef variants. */
function normalize(text: string): string {
  return text.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").toLocaleLowerCase("ar").trim();
}

export function matchesGuestSearch(guest: { name: string; title: string }, query: string): boolean {
  const haystack = normalize(`${guest.name} ${guest.title}`);
  return normalize(query).split(/\s+/).every((word) => haystack.includes(word));
}
