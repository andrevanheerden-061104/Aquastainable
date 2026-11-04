// Shared quick-search engine for the fish and plant catalogues.
// Matches common name, nicknames and scientific name together, with small typo
// tolerance ("beta" finds Betta, "duckwed" finds Duckweed).
const axios = require('axios');

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function editDistance(a, b) {
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

// Typo match: compare the query with the start of the term (and of each word).
function fuzzyMatch(term, query) {
  if (query.length < 3) return false;
  const allowed = query.length >= 6 ? 2 : 1;
  const starts = [term, ...term.split(' ')];
  return starts.some((start) => [query.length - 1, query.length, query.length + 1]
    .some((length) => length > 0 && editDistance(start.slice(0, length), query) <= allowed));
}

function scoreTerm(term, query) {
  if (!term) return 0;
  if (term === query) return 100;
  if (term.startsWith(query)) return 90;
  if (term.includes(` ${query}`)) return 75;
  if (query.length >= 4 && term.includes(query)) return 55;
  if (fuzzyMatch(term, query)) return 40;
  return 0;
}

function scoreItem(item, query) {
  const nameScore = scoreTerm(normalize(item.name), query);
  const aliasScore = Math.max(0, ...(item.aliases || []).map((alias) => scoreTerm(normalize(alias), query)));
  const scientificScore = scoreTerm(normalize(item.scientificName), query) - 5;
  return Math.max(nameScore ? nameScore + 5 : 0, aliasScore, scientificScore, 0);
}

function searchItems(items, query, limit = 8) {
  const q = normalize(query);
  if (!q) return [];
  const scored = items.map((item) => ({ item, score: scoreItem(item, q) })).filter((entry) => entry.score > 0);
  // Typo matches only when nothing matches properly.
  const strong = scored.filter((entry) => entry.score >= 50);
  return (strong.length ? strong : scored)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

const EMPTY_IMAGE = { image: '', imageSourceUrl: '', imageLicense: '' };

// Photo lookup: iNaturalist species photo first, Wikimedia Commons as fallback.
async function lookupImage({ scientificName, name }, { wikimediaHint = '' } = {}) {
  try {
    const response = await axios.get('https://api.inaturalist.org/v1/taxa', {
      params: { q: scientificName, rank: 'species,variety', per_page: 1 },
      headers: { 'User-Agent': 'Aquastainable/1.0 (aquarium care app)' },
      timeout: 8000,
    });
    const photo = response.data?.results?.[0]?.default_photo;
    if (photo?.medium_url) {
      return { image: photo.medium_url, imageSourceUrl: `https://www.inaturalist.org/photos/${photo.id}`, imageLicense: photo.license_code || '' };
    }
  } catch (error) {
    console.warn(`iNaturalist photo lookup failed for ${scientificName}:`, error.message || error);
  }

  for (const term of [scientificName, name].filter(Boolean)) {
    try {
      const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query', generator: 'search', gsrsearch: `${term} ${wikimediaHint} filetype:bitmap`.replace(/\s+/g, ' '),
          gsrnamespace: 6, gsrlimit: 1, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: 600, format: 'json',
        },
        headers: { 'User-Agent': 'Aquastainable/1.0 (aquarium care app)' },
        timeout: 10000,
      });
      const page = Object.values(response.data?.query?.pages || {})[0];
      const info = page?.imageinfo?.[0];
      if (info?.thumburl || info?.url) {
        return {
          image: info.thumburl || info.url,
          imageSourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
          imageLicense: info.extmetadata?.LicenseShortName?.value || '',
        };
      }
    } catch (error) {
      console.warn(`Wikimedia photo lookup failed for ${term}:`, error.message || error);
    }
  }
  return EMPTY_IMAGE;
}

// In-memory photo cache + background warm-up for catalogue entries without a photo.
function createImageCache(lookupOptions) {
  const cache = new Map();
  const imageFor = async (item) => {
    if (item.image) return { image: item.image, imageSourceUrl: item.imageSourceUrl || '', imageLicense: item.imageLicense || '' };
    if (cache.has(item.id)) return cache.get(item.id);
    const found = await lookupImage(item, lookupOptions).catch(() => null);
    const result = found?.image ? found : EMPTY_IMAGE;
    if (result.image) cache.set(item.id, result);
    return result;
  };
  const imageWithin = (item, ms = 3000) => Promise.race([
    imageFor(item),
    new Promise((resolve) => setTimeout(() => resolve(EMPTY_IMAGE), ms)),
  ]);
  const warm = (items, startDelay = 2000) => {
    items.filter((item) => !item.image)
      .forEach((item, index) => setTimeout(() => { imageFor(item).catch(() => undefined); }, startDelay + index * 1000));
  };
  return { imageFor, imageWithin, warm };
}

const range = (value, suffix = '') => (value ? `${value.min}-${value.max}${suffix}` : '');

module.exports = { normalize, searchItems, lookupImage, createImageCache, range, EMPTY_IMAGE };
