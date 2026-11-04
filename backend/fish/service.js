const { searchFish: searchINaturalist } = require('./providers/inaturalist');
const { findFishImage } = require('./providers/wikimedia');
const catalog = require('./catalog');

const MAX_RESULTS = 12;
const ONLINE_TIMEOUT_MS = 5000;

function toFishSpecies(item, imageData) {
  return {
    id: String(item.key),
    FBname: item.commonName,
    name: item.commonName,
    scientificName: item.scientificName,
    imageName: '',
    image: imageData.image,
    imageSourceUrl: imageData.imageSourceUrl,
    imageLicense: imageData.imageLicense,
    source: item.sourceUrl,
    schoolSize: '',
    tempC: '',
    pH: '',
  };
}

const withTimeout = (promise, ms, fallback) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
]);

async function searchOnline(searchTerm) {
  try {
    return await searchINaturalist(searchTerm);
  } catch (error) {
    console.warn('iNaturalist search failed:', error.message || error);
    return [];
  }
}

// Runs the quick-search catalogue and the online search at the same time.
// Catalogue fish come first (instant, with full care data); online results fill the rest.
// Both search common names and scientific names.
async function searchFish(query) {
  const searchTerm = String(query || '').trim();
  if (!searchTerm) return [];

  const [catalogueMatches, online] = await Promise.all([
    Promise.all(catalog.searchCatalogue(searchTerm).map(catalog.toFishSpecies)),
    searchTerm.length >= 2 ? withTimeout(searchOnline(searchTerm), ONLINE_TIMEOUT_MS, []) : Promise.resolve([]),
  ]);

  const seen = new Set(catalogueMatches.map((fish) => fish.scientificName.toLowerCase()));
  const onlineUnique = online.filter((item) => {
    const key = String(item.scientificName || '').toLowerCase();
    if (!key || seen.has(key) || catalog.findCatalogueFish('', key)) return false;
    seen.add(key);
    return true;
  });
  // Fish with a real common name first: people search by the name they know.
  onlineUnique.sort((left, right) => Number(right.commonName !== right.scientificName) - Number(left.commonName !== left.scientificName));

  const room = Math.max(0, MAX_RESULTS - catalogueMatches.length);
  const onlineResults = await Promise.all(onlineUnique.slice(0, room).map(async (item) => {
    if (item.image) return toFishSpecies(item, item);
    const imageData = await withTimeout(findFishImage(item.scientificName, item.commonName), 3000, { image: '', imageSourceUrl: '', imageLicense: '' });
    return toFishSpecies(item, { ...item, ...imageData });
  }));

  return [...catalogueMatches, ...onlineResults];
}

module.exports = { searchFish };
