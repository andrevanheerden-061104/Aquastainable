const { searchPlants: searchINaturalist } = require('./providers/inaturalist');
const catalog = require('./catalog');

const MAX_RESULTS = 12;
const ONLINE_TIMEOUT_MS = 5000;

const withTimeout = (promise, ms, fallback) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
]);

async function searchOnline(searchTerm) {
  try {
    return await searchINaturalist(searchTerm);
  } catch (error) {
    console.warn('Plant provider unavailable:', error.message || error);
    return [];
  }
}

// Runs the common-plants catalogue and the online search at the same time.
// Catalogue plants come first (instant, with care data); online results fill the rest.
async function searchPlants(query) {
  const searchTerm = String(query || '').trim();
  if (!searchTerm) return [];

  const [catalogueMatches, online] = await Promise.all([
    Promise.all(catalog.searchCatalogue(searchTerm).map(catalog.toPlantSpecies)),
    searchTerm.length >= 2 ? withTimeout(searchOnline(searchTerm), ONLINE_TIMEOUT_MS, []) : Promise.resolve([]),
  ]);

  const seen = new Set(catalogueMatches.map((plant) => plant.scientificName.toLowerCase()));
  const onlineUnique = online.filter((item) => {
    const key = String(item.scientificName || '').toLowerCase();
    if (!key || seen.has(key) || catalog.findCataloguePlant('', key)) return false;
    seen.add(key);
    return true;
  });
  onlineUnique.sort((left, right) => Number(right.name !== right.scientificName) - Number(left.name !== left.scientificName));

  return [...catalogueMatches, ...onlineUnique].slice(0, MAX_RESULTS);
}

module.exports = { searchPlants };
