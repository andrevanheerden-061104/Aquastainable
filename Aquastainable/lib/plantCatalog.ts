// Instant, offline search over common aquarium plants (lib/data/commonPlants.json).
// Same matching as the fish catalogue and backend/plant/catalog.js.
import catalogue from '@/lib/data/commonPlants.json';
import type { PlantSpecies } from '@/lib/hooks/usePlantApi';
import { rangeText, searchItems } from '@/lib/quickSearch';

type CataloguePlant = (typeof catalogue.plants)[number];

const PLANTS: CataloguePlant[] = catalogue.plants;

export function cataloguePlantToSpecies(plant: CataloguePlant): PlantSpecies {
  return {
    id: plant.id,
    name: plant.name,
    scientificName: plant.scientificName,
    image: plant.image,
    imageSourceUrl: plant.imageSourceUrl,
    imageLicense: plant.imageLicense,
    source: plant.source,
    description: plant.description,
    bestTempC: rangeText(plant.temperatureC, '°C'),
    phRange: rangeText(plant.pH),
    light: plant.light,
    growthRate: plant.growthRate,
    placement: plant.placement,
    attachment: plant.attachment,
    careLevel: plant.careLevel,
    co2: plant.co2,
    origin: plant.origin,
    maxHeightCm: plant.maxHeightCm,
    popular: true,
  };
}

export function searchPlantCatalogue(query: string, limit = 8): PlantSpecies[] {
  return searchItems(PLANTS, query, limit).map(cataloguePlantToSpecies);
}

export const COMMON_PLANTS = PLANTS.map(cataloguePlantToSpecies);
