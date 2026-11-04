// Instant, offline fish search over the 50 most common pet fish (lib/data/commonFish.json).
// Same matching as backend/fish/catalog.js: common name, nicknames and scientific name
// are searched together, with small typo tolerance ("beta" finds Betta).
import catalogue from '@/lib/data/commonFish.json';
import type { FishSpecies } from '@/lib/hooks/useFishApi';
import { rangeText, searchItems } from '@/lib/quickSearch';

export { normalizeQuery as normalizeFishQuery } from '@/lib/quickSearch';

type CatalogueFish = (typeof catalogue.fish)[number];

const FISH: CatalogueFish[] = catalogue.fish;

const range = rangeText;

export function catalogueToSpecies(fish: CatalogueFish): FishSpecies {
  return {
    id: fish.id,
    FBname: fish.name,
    name: fish.name,
    scientificName: fish.scientificName,
    imageName: '',
    image: fish.image,
    imageSourceUrl: fish.imageSourceUrl,
    imageLicense: fish.imageLicense,
    source: fish.source,
    schoolSize: String(fish.minimumGroupSize),
    tempC: range(fish.temperatureC),
    pH: range(fish.pH),
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
    popular: true,
  };
}

export function searchFishCatalogue(query: string, limit = 8): FishSpecies[] {
  return searchItems(FISH, query, limit).map(catalogueToSpecies);
}

export const COMMON_FISH = FISH.map(catalogueToSpecies);
