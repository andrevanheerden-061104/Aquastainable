#!/usr/bin/env node
// Fills in a photo for every fish and plant in the quick-search catalogues that has none.
//
//   cd backend
//   node scripts/fill-catalogue-images.js            # fish + plants, missing photos only
//   node scripts/fill-catalogue-images.js --all      # refresh every photo
//   node scripts/fill-catalogue-images.js fish       # only fish   (or: plants)
//
// Needs internet. Photos come from iNaturalist (Wikimedia Commons as fallback).
// Writes both copies of each file (backend + app) so they always match.
const fs = require('fs');
const path = require('path');
const fishCatalog = require('../fish/catalog');
const plantCatalog = require('../plant/catalog');

const backend = path.join(__dirname, '..');
const app = path.join(backend, '..', 'Aquastainable', 'lib', 'data');

const CATALOGUES = {
  fish: { key: 'fish', files: [path.join(backend, 'fish', 'data', 'commonFish.json'), path.join(app, 'commonFish.json')], lookup: fishCatalog.lookupImage },
  plants: { key: 'plants', files: [path.join(backend, 'plant', 'data', 'commonPlants.json'), path.join(app, 'commonPlants.json')], lookup: plantCatalog.lookupImage },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fill(name, { files, key, lookup }, refreshAll) {
  const existing = files.filter((file) => fs.existsSync(file));
  if (!existing.length) { console.log(`Skipping ${name}: file not found.`); return; }
  const data = JSON.parse(fs.readFileSync(existing[0], 'utf8'));
  const missing = [];
  let filled = 0;

  console.log(`\n${name.toUpperCase()} (${data[key].length})`);
  for (const item of data[key]) {
    if (item.image && !refreshAll) continue;
    process.stdout.write(`  ${item.name.padEnd(28)} `);
    const found = await lookup(item).catch(() => null);
    if (found?.image) {
      Object.assign(item, { image: found.image, imageSourceUrl: found.imageSourceUrl, imageLicense: found.imageLicense });
      filled += 1;
      console.log('ok');
    } else {
      missing.push(item.name);
      console.log('no photo found');
    }
    await sleep(1100); // be polite to the free APIs
  }

  const output = `${JSON.stringify(data, null, 2)}\n`;
  existing.forEach((file) => fs.writeFileSync(file, output));
  console.log(`  Filled ${filled} photo(s).${missing.length ? ` Still missing: ${missing.join(', ')}` : ''}`);
  existing.forEach((file) => console.log(`  Saved ${path.relative(path.join(backend, '..'), file)}`));
}

(async () => {
  const refreshAll = process.argv.includes('--all');
  const only = process.argv.slice(2).find((arg) => CATALOGUES[arg]);
  for (const [name, catalogue] of Object.entries(CATALOGUES)) {
    if (only && only !== name) continue;
    await fill(name, catalogue, refreshAll);
  }
  console.log('\nDone. Commit the updated JSON files so the app and the server both get the photos.');
})();
