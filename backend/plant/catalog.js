// Quick-search catalogue: common aquarium plants (data/commonPlants.json).
// Same matching as the fish catalogue. Care data comes from the file, so these
// plants don't need an AI care profile.
const catalogue = require('./data/commonPlants.json');
const { searchItems, lookupImage: lookup, createImageCache, range } = require('../lib/quickSearch');

const PLANTS = catalogue.plants;
const byId = new Map(PLANTS.map((plant) => [plant.id, plant]));
const byScientific = new Map(PLANTS.map((plant) => [plant.scientificName.toLowerCase(), plant]));
const images = createImageCache({ wikimediaHint: 'aquarium plant' });

const searchCatalogue = (query, limit = 8) => searchItems(PLANTS, query, limit);

function careProfile(plant) {
  return {
    description: plant.description,
    bestTempC: range(plant.temperatureC, '°C'),
    phRange: range(plant.pH),
    light: plant.light,
    growthRate: plant.growthRate,
    placement: plant.placement,
    attachment: plant.attachment,
    careLevel: plant.careLevel,
    co2: plant.co2,
    origin: plant.origin,
    maxHeightCm: plant.maxHeightCm,
    careProfileConfidence: 'catalogue',
    careProfileModel: 'commonPlants.json',
    careProfileUpdatedAt: new Date(),
  };
}

function findCataloguePlant(plantId, scientificName) {
  return byId.get(String(plantId || '')) || byScientific.get(String(scientificName || '').toLowerCase()) || null;
}

function careProfileFor(plantId, scientificName) {
  const plant = findCataloguePlant(plantId, scientificName);
  return plant ? careProfile(plant) : null;
}

const lookupImage = (plant) => lookup(plant, { wikimediaHint: 'aquarium plant' });
const warmImages = () => images.warm(PLANTS, 4000);

async function toPlantSpecies(plant) {
  const imageData = await images.imageWithin(plant);
  return {
    id: plant.id,
    name: plant.name,
    scientificName: plant.scientificName,
    ...imageData,
    source: plant.source,
    popular: true,
    ...careProfile(plant),
  };
}

module.exports = { PLANTS, searchCatalogue, careProfileFor, findCataloguePlant, lookupImage, toPlantSpecies, warmImages };
