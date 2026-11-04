// Quick-search catalogue: the 50 most common pet fish (data/commonFish.json).
// Searched instantly by common name, nicknames and scientific name together,
// with small typo tolerance ("beta" finds Betta). Care data comes from the file,
// so these fish don't need an AI care profile.
const catalogue = require('./data/commonFish.json');
const { normalize, searchItems, lookupImage: lookup, createImageCache, range } = require('../lib/quickSearch');

const FISH = catalogue.fish;
const byId = new Map(FISH.map((fish) => [fish.id, fish]));
const byScientific = new Map(FISH.map((fish) => [fish.scientificName.toLowerCase(), fish]));
const images = createImageCache({ wikimediaHint: 'fish' });

const searchCatalogue = (query, limit = 8) => searchItems(FISH, query, limit);

// Same field names the AI care profile uses, so the rest of the app needs no changes.
function careProfile(fish) {
  return {
    description: fish.description,
    bestTempC: range(fish.temperatureC, '°C'),
    phRange: range(fish.pH),
    waterSpace: `${fish.minimumTankLitres} L minimum`,
    feedType: fish.diet,
    adultLengthCm: fish.adultLengthCm,
    temperament: fish.temperament,
    minimumGroupSize: fish.minimumGroupSize,
    origin: fish.origin,
    lifespan: fish.lifespan,
    swimLevel: fish.swimLevel,
    careLevel: fish.careLevel,
    careProfileConfidence: 'catalogue',
    careProfileModel: 'commonFish.json',
    careProfileUpdatedAt: new Date(),
  };
}

function findCatalogueFish(fishId, scientificName) {
  return byId.get(String(fishId || '')) || byScientific.get(String(scientificName || '').toLowerCase()) || null;
}

function careProfileFor(fishId, scientificName) {
  const fish = findCatalogueFish(fishId, scientificName);
  return fish ? careProfile(fish) : null;
}

const lookupImage = (fish) => lookup(fish, { wikimediaHint: 'fish' });
const warmImages = () => images.warm(FISH);

async function toFishSpecies(fish) {
  const imageData = await images.imageWithin(fish);
  return {
    id: fish.id,
    FBname: fish.name,
    name: fish.name,
    scientificName: fish.scientificName,
    imageName: '',
    ...imageData,
    source: fish.source,
    schoolSize: String(fish.minimumGroupSize),
    tempC: range(fish.temperatureC),
    pH: range(fish.pH),
    popular: true,
    ...careProfile(fish),
  };
}

module.exports = { FISH, normalize, searchCatalogue, careProfileFor, findCatalogueFish, lookupImage, toFishSpecies, warmImages };
