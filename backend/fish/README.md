# Fish Data Architecture

Fish search runs two things at the same time:

1. **Quick-search catalogue** (`data/commonFish.json`, logic in `catalog.js`): the 50 most common pet fish, with care data (temperature, pH, size, group size, tank size, swim level, lifespan, origin, diet, temperament, care level). It matches the common name, nicknames ("beta", "cory", "yellow lab") and the scientific name together, and allows small typos. These fish come first and use the catalogue care data instead of the AI care profile.
2. **Online search** (iNaturalist) for everything else. It is cut off after 5 seconds so a slow API never blocks the quick results.

The app has its own copy (`Aquastainable/lib/data/commonFish.json` + `lib/fishCatalog.ts`), so the 50 common fish appear instantly on every letter, even before the server answers.

The search rules live in `backend/lib/quickSearch.js` (server) and `Aquastainable/lib/quickSearch.ts` (app); fish and plants share them.

### Common plants

Plants work the same way: `backend/plant/data/commonPlants.json` (33 common aquarium plants, including Duckweed, Java fern, Anubias, Java moss, crypts, Amazon sword, hornwort, vallisneria and the usual floaters) plus `plant/catalog.js`. The app copy is `Aquastainable/lib/data/commonPlants.json`. Each plant has light, growth, placement, how to plant it, temperature, pH, care level, max height, CO2 need, origin and a short description. Plants that are invasive in South Africa say so in their description.

### Photos

Run this once on a computer with internet access, from the `backend` folder:

```bash
node scripts/fill-catalogue-images.js          # fish + plants, missing photos only
node scripts/fill-catalogue-images.js --all    # refresh every photo
node scripts/fill-catalogue-images.js plants   # only plants (or: fish)
```

It updates both JSON copies of each list. Commit the changed files afterwards. Until then, the server looks up missing photos itself (in the background after start-up, then cached).

### Adding a fish or plant to the catalogue

Add an entry to the backend JSON file (same fields as the others; fish ids start with `cf-`, plant ids with `cp-`), copy the file to `Aquastainable/lib/data/`, then run the photo script.

## Providers

- `providers/inaturalist.js`: searches common and scientific names and returns fish taxonomy plus image URLs.
- `providers/gbif.js`: available for taxonomy matching and validation when needed.
- `providers/wikimedia.js`: finds a fallback image and license metadata when iNaturalist has no image.

## Service

`service.js` combines provider responses into the frontend `FishSpecies` shape. Empty care fields are intentional; the service never invents pH, temperature, diet, or compatibility values.

## User storage

The `/fish/add` route stores the selected fish snapshot and the AI care profile under the user's tank:

```text
tanks/{tankId}/fish/{fishDocumentId}
```

The saved record includes the API names, image URL, image source, license, user's school size, description, best temperature, pH range, minimum water space, feed type, adult length, temperament, minimum group size, and profile confidence. It is not a shared fish catalog.

## Individual fish

Individual fish profiles are stored beneath their parent fish record:

```text
tanks/{tankId}/fish/{fishDocumentId}/individualFish/{individualFishId}
```

The individual record stores `parentFishId`, `tankId`, `imageUrl`, `name`, `age`, `health`, `story`, `createdAt`, and `updatedAt`. New images are uploaded to Cloudinary under `aquastainable/individual-fish` and only the returned URL is stored.

CRUD endpoints, all scoped with the parent tank and fish ownership check:

- `POST /fish/{tankId}/{fishDocumentId}/individual-fish` with `{ userId, image, name, age, health, story, schoolStatus }`, where `schoolStatus` is `new` or `existing`
- `GET /fish/{tankId}/{fishDocumentId}/individual-fish?userId={userId}`
- `PATCH /fish/{tankId}/{fishDocumentId}/individual-fish/{individualFishId}` with any editable fields
- `DELETE /fish/{tankId}/{fishDocumentId}/individual-fish/{individualFishId}` with `{ userId }`

Legacy records can be enriched with `POST /fish/enrich/:fishId` using `{ "userId": "..." }`. This updates every matching record owned by that user, including species ID `173412` when its fish detail page is opened.

## Aquarium plant search

Plant search uses iNaturalist's taxonomy API filtered to `Plantae`. iNaturalist supplies names and image/source metadata; aquarium-specific care and compatibility data should be added through the AI care profile or a curated application layer rather than inferred from general plant taxonomy.

Plant endpoints:

- `GET /plants/search?query={query}`
- `POST /plants/add` with `{ userId, tankId, plantId, name, scientificName, image, imageSourceUrl, imageLicense, source }`

## Sources

- iNaturalist API: `https://api.inaturalist.org/v1/taxa/autocomplete`
- GBIF API: `https://api.gbif.org/v1`
- Wikimedia Commons API: `https://commons.wikimedia.org/w/api.php`