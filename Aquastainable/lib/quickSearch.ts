// Shared instant search for the fish and plant catalogues (same rules as
// backend/lib/quickSearch.js): common name, nicknames and scientific name are
// searched together, with small typo tolerance ("beta" finds Betta).
export type Searchable = { name: string; aliases?: string[]; scientificName: string };

export const normalizeQuery = (value: string) => String(value || '')
  .toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function fuzzyMatch(term: string, query: string) {
  if (query.length < 3) return false;
  const allowed = query.length >= 6 ? 2 : 1;
  const starts = [term, ...term.split(' ')];
  return starts.some((start) => [query.length - 1, query.length, query.length + 1]
    .some((length) => length > 0 && editDistance(start.slice(0, length), query) <= allowed));
}

function scoreTerm(term: string, query: string) {
  if (!term) return 0;
  if (term === query) return 100;
  if (term.startsWith(query)) return 90;
  if (term.includes(` ${query}`)) return 75;
  if (query.length >= 4 && term.includes(query)) return 55;
  if (fuzzyMatch(term, query)) return 40;
  return 0;
}

function scoreItem(item: Searchable, query: string) {
  const nameScore = scoreTerm(normalizeQuery(item.name), query);
  const aliasScore = Math.max(0, ...(item.aliases || []).map((alias) => scoreTerm(normalizeQuery(alias), query)));
  const scientificScore = scoreTerm(normalizeQuery(item.scientificName), query) - 5;
  return Math.max(nameScore ? nameScore + 5 : 0, aliasScore, scientificScore, 0);
}

export function searchItems<T extends Searchable>(items: T[], query: string, limit = 8): T[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  const scored = items.map((item) => ({ item, score: scoreItem(item, q) })).filter((entry) => entry.score > 0);
  const strong = scored.filter((entry) => entry.score >= 50);
  return (strong.length ? strong : scored)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export const rangeText = (value: { min: number; max: number }, suffix = '') => `${value.min}-${value.max}${suffix}`;
