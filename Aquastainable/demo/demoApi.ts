import { searchPlantCatalogue } from '@/lib/plantCatalog';
import { searchFishCatalogue } from '@/lib/fishCatalog';
// Demo backend: answers the app's API calls from local sample data.
// Only installed when EXPO_PUBLIC_DEMO=1 (see app/_layout.tsx), so the real app is unaffected.
import axios, { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Asset } from 'expo-asset';

const asset = (mod: number) => Asset.fromModule(mod).uri ?? '';

const img = {
  forest: asset(require('../assets/fishTank/FishTankForest.jpeg')),
  living: asset(require('../assets/fishTank/FishTankLiveingRoom.jpeg')),
  guppy: asset(require('../assets/fishTank/guppy.jpg')),
  goldfish: asset(require('../assets/fishTank/goldFish.jpg')),
  duckweed: asset(require('../assets/fishTank/duckweed.jpeg')),
  jade: asset(require('../assets/guppy/guppy-Jade.jpeg')),
  midas: asset(require('../assets/guppy/guppy-Midas.jpeg')),
  pixel: asset(require('../assets/guppy/guppy-Pixel.jpeg')),
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

const tanks = [
  {
    id: 'tank-1', tankId: 'tank-1', user_id: 'demo-user', tankName: 'Guppy Kingdom', tankImg: img.forest,
    waterType: 'Freshwater', tankSize: 50, createdAt: daysAgo(60), aquaCare: {},
    overview: 'Guppy Kingdom is in great shape: the water tested excellent and your guppies have plenty of space and plants. Just keep the duckweed trimmed so light reaches the bottom.',
    testDate: daysAgo(2), waterQuality: 'Excellent', preferredTempC: '22–26', temperatureC: '24', lastTestedDaysAgo: 2,
    ph: '7.1', ammoniaPpm: '0', nitritePpm: '0',
  },
  {
    id: 'tank-2', tankId: 'tank-2', user_id: 'demo-user', tankName: 'Goldie Lounge', tankImg: img.living,
    waterType: 'Freshwater', tankSize: 120, createdAt: daysAgo(30), aquaCare: {},
    overview: 'Goldie Lounge has ammonia and nitrite showing, which is harmful to your goldfish. Do a 25% water change today and feed less for a few days.',
    testDate: daysAgo(6), waterQuality: 'Needs attention', preferredTempC: '18–22', temperatureC: '21', lastTestedDaysAgo: 6,
    ph: '7.6', ammoniaPpm: '0.5', nitritePpm: '0.25',
  },
];

const fishCatalogue = [
  {
    id: 'guppy', fishId: 'guppy', name: 'Guppy', FBname: 'Guppy', scientificName: 'Poecilia reticulata', image: img.guppy,
    schoolSize: '6', tempC: '22–28', pH: '6.8–7.8', description: 'Hardy, colourful livebearer that is perfect for beginners.',
    bestTempC: '24', phRange: '6.8–7.8', waterSpace: 'Top & middle', feedType: 'Flakes, micro pellets', origin: 'South America',
    lifespan: '2–3 years', temperament: 'Peaceful', minimumGroupSize: 3, adultLengthCm: 5,
  },
  {
    id: 'goldfish', fishId: 'goldfish', name: 'Fancy Goldfish', FBname: 'Goldfish', scientificName: 'Carassius auratus', image: img.goldfish,
    schoolSize: '2', tempC: '18–22', pH: '7.0–8.0', description: 'Friendly cold-water fish that grows big and makes a lot of waste.',
    bestTempC: '20', phRange: '7.0–8.0', waterSpace: 'All levels', feedType: 'Sinking pellets, veg', origin: 'East Asia',
    lifespan: '10–15 years', temperament: 'Peaceful', minimumGroupSize: 2, adultLengthCm: 20,
  },
];

const tankFish = [
  { ...fishCatalogue[0], id: 'tf-1', tankId: 'tank-1', tankName: 'Guppy Kingdom', addedAt: daysAgo(40) },
  { ...fishCatalogue[1], id: 'tf-2', tankId: 'tank-2', tankName: 'Goldie Lounge', addedAt: daysAgo(20) },
];

const plants = [
  {
    id: 'tp-1', plantId: 'duckweed', tankId: 'tank-1', tankName: 'Guppy Kingdom', name: 'Duckweed', scientificName: 'Lemna minor',
    image: img.duckweed, description: 'Fast floating plant that soaks up nitrate.', bestTempC: '20–28', phRange: '6.5–7.5',
    light: 'Medium', growthRate: 'Very fast', placement: 'Floating', addedAt: daysAgo(35),
  },
];

const individualFish = [
  { id: 'if-1', parentFishId: 'tf-1', tankId: 'tank-1', imageUrl: img.jade, name: 'Jade', age: '8 months', health: 'Healthy', story: 'Always first to the food.', schoolStatus: 'existing' },
  { id: 'if-2', parentFishId: 'tf-1', tankId: 'tank-1', imageUrl: img.midas, name: 'Midas', age: '1 year', health: 'Healthy', story: 'The gold one with the big tail.', schoolStatus: 'existing' },
  { id: 'if-3', parentFishId: 'tf-1', tankId: 'tank-1', imageUrl: img.pixel, name: 'Pixel', age: '4 months', health: 'Watch', story: 'Youngest of the group.', schoolStatus: 'new' },
];

const waterTests: Record<string, any[]> = {
  'tank-1': [
    { id: 'wt-1', tankId: 'tank-1', testedAt: daysAgo(2), imageUrl: '', readings: { ph: '7.1', temperatureC: '24', ammoniaPpm: '0', nitritePpm: '0', nitratePpm: '10' },
      waterQuality: 'Excellent', summary: 'All readings are safe. Keep doing what you are doing.', nextWaterChange: 'In 12 days (10%)' },
    { id: 'wt-2', tankId: 'tank-1', testedAt: daysAgo(16), imageUrl: '', readings: { ph: '7.0', temperatureC: '23', ammoniaPpm: '0', nitritePpm: '0', nitratePpm: '20' },
      waterQuality: 'Good', summary: 'Nitrate is rising. A small water change will bring it down.', nextWaterChange: 'This week (15%)' },
  ],
  'tank-2': [
    { id: 'wt-3', tankId: 'tank-2', testedAt: daysAgo(6), imageUrl: '', readings: { ph: '7.6', temperatureC: '21', ammoniaPpm: '0.5', nitritePpm: '0.25', nitratePpm: '40' },
      waterQuality: 'Needs attention', summary: 'Ammonia and nitrite are toxic to fish. Act today.', nextWaterChange: 'Today (25%)' },
  ],
};

const chats: any[] = [
  {
    id: 'chat-1', title: 'White spots on my guppy', createdAt: daysAgo(3), updatedAt: daysAgo(3),
    messages: [{ id: 'm1', question: 'My guppy has small white spots on its fins. What is it?', createdAt: daysAgo(3),
      answer: '**Most likely: Ich (white spot disease)**\nIt is a common parasite and very treatable.\n\n**Do this now**\n- Raise the temperature slowly to 28 °C\n- Add an ich treatment from your fish shop\n- Do a 25% water change\n\n**Watch for**\nFast breathing or not eating. If you see that, move the fish to a separate tank.' }],
  },
];

// Sample replies in the same short shape the real Fish Assistant prompt asks for.
const demoAnswer = (message: string) => {
  const text = message.toLowerCase();
  const fishWords = ['fish', 'guppy', 'guppies', 'goldfish', 'tank', 'water', 'ammonia', 'nitrite', 'nitrate', 'ph', 'aquarium', 'tetra', 'betta', 'feed', 'filter', 'spot', 'fin', 'sick', 'shrimp', 'pleco'];
  if (!fishWords.some((word) => text.includes(word))) {
    return "I can only help with fish. Ask me about your fish's health, feeding, tank mates or water.";
  }
  if (text.includes('spot')) {
    return "Those small white spots are most likely **ich** (white spot disease). It's a tiny parasite that often shows up after a sudden temperature drop or when new fish are added. The good news is it's very treatable if you start early.\n\n**How to treat it**\n- Raise the temperature slowly to about 28 °C over a day\n- Add an ich treatment from your fish shop and follow the label\n- Do a 25% water change every 2–3 days, using conditioner\n- Keep treating for a few days after the spots are gone\n\nSee a vet or fish shop if the fish stops eating, breathes fast, or the spots keep spreading after a week.";
  }
  if (text.includes('feed')) {
    return "Feed your fish a small pinch once or twice a day — only as much as they finish in about 2 minutes. Overfeeding is the most common beginner mistake, because leftover food rots and makes the water dirty.\n\n- Skip one feeding day a week\n- Scoop out any food left on the bottom\n- Use flakes or micro pellets sized for Guppy and Fancy Goldfish";
  }
  if (text.includes('live with') || text.includes('tank mate')) {
    return "Guppies are peaceful, so they do best with other small, calm fish that like warm water. In Guppy Kingdom (50 L) you have room for one small group of tank mates.\n\n**Good choices**\n- 6 neon tetras or 6 corydoras catfish\n- Cherry shrimp (the guppies may eat babies)\n\nAvoid goldfish — they need cold water and grow far too big for that tank.";
  }
  if (text.includes('ammonia') || text.includes('water') || text.includes('safe')) {
    return "Guppy Kingdom is safe, but **Goldie Lounge needs help today**: it has ammonia and nitrite, which burn your goldfish's gills even in small amounts. This usually comes from overfeeding or a filter that can't keep up.\n\n**What to do**\n- Change 25% of the water today, using water conditioner\n- Feed half as much for 3 days\n- Test again in 2 days and repeat if still above 0\n\nSee a vet or fish shop if your goldfish are gasping at the surface.";
  }
  return "Guppies are happiest at 24–26 °C with a pH around 7, which matches your Guppy Kingdom tank right now. Keep doing what you're doing: test the water weekly and change 10–20% every week or two.";
};

const json = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  data, status, statusText: 'OK', headers: {}, config,
});

const body = (config: InternalAxiosRequestConfig) => {
  if (!config.data) return {};
  try { return typeof config.data === 'string' ? JSON.parse(config.data) : config.data; } catch { return {}; }
};

const route = (config: InternalAxiosRequestConfig): unknown => {
  const method = (config.method || 'get').toLowerCase();
  const url = new URL(config.url || '/', 'https://demo.local');
  const path = url.pathname;
  const data = body(config) as Record<string, any>;
  let match: RegExpMatchArray | null;

  if (path === '/signin' || path === '/signup') return { ok: true };
  if (path.startsWith('/auth/otp/send')) return { sent: true, email: 'an***@aquastainable.app', resendInSeconds: 30 };
  if (path.startsWith('/auth/otp/verify')) return { verified: data.code === '123456' || String(data.code || '').length === 6 };

  if ((match = path.match(/^\/tanks\/[^/]+\/([^/]+)$/))) {
    const tank = tanks.find((t) => t.tankId === match![1]);
    if (method === 'delete') return {};
    if (method === 'patch' && tank) Object.assign(tank, data);
    return tank;
  }
  if (path.match(/^\/tanks\/[^/]+$/)) return tanks;
  if (path === '/tanks' && method === 'post') {
    const tank = { ...tanks[0], ...data, id: `tank-${Date.now()}`, tankId: `tank-${Date.now()}`, overview: '', waterQuality: '', testDate: '' };
    tanks.push(tank);
    return tank;
  }
  if (path === '/ai/tank-overview') return { overview: tanks.find((t) => t.tankId === data.tankId)?.overview || '', generated: false };

  if ((match = path.match(/^\/water-tests\/tank\/([^/]+)$/))) return waterTests[match[1]] || [];
  if (path === '/water-tests') {
    const test = { id: `wt-${Date.now()}`, tankId: data.tankId, testedAt: data.testedAt, readings: data.readings || {}, imageUrl: '',
      waterQuality: 'Good', summary: 'Readings look safe. Keep up your weekly routine.', nextWaterChange: 'In 7 days (15%)' };
    (waterTests[data.tankId] ||= []).unshift(test);
    return test;
  }

  if (path === '/fish/search') {
    // Same quick-search catalogue as the real app; demo photos fill the two sample fish.
    const photos = new Map(fishCatalogue.map((fish: any) => [String(fish.scientificName).toLowerCase(), fish.image]));
    return searchFishCatalogue(url.searchParams.get('query') || '', 12)
      .map((fish) => ({ ...fish, image: fish.image || photos.get(fish.scientificName.toLowerCase()) || '' }));
  }
  if ((match = path.match(/^\/fish\/tank\/([^/]+)$/))) return tankFish.filter((f) => f.tankId === match![1]);
  if (path.match(/^\/fish\/user\//)) return tankFish;
  if (path === '/fish/assess-add') return { canAdd: true, status: 'compatible', title: 'Good match', explanation: 'This fish suits your tank size and water.', optimalSchoolSize: '6', maximumSchoolSize: '10', selectedTankId: data.tankId, selectedTankName: 'Guppy Kingdom', suggestedTankId: null, suggestedTankName: '' };
  if (path.endsWith('/individual-fish') && method === 'get') return individualFish;
  if (path.includes('/individual-fish')) return { ...individualFish[0], ...data, parentSchoolSize: '6' };
  if (path.startsWith('/fish/')) return { success: true, updated: 1, ...tankFish[0] };

  if (path === '/plants/search') {
    const photos = new Map(plants.map((plant: any) => [String(plant.scientificName).toLowerCase(), plant.image]));
    return searchPlantCatalogue(url.searchParams.get('query') || '', 12)
      .map((plant) => ({ ...plant, image: plant.image || photos.get(plant.scientificName.toLowerCase()) || '' }));
  }
  if (path.match(/^\/plants\/user\//)) return plants;
  if (path === '/plants/assess-add') return { canAdd: true, status: 'compatible', title: 'Good match', explanation: 'This plant likes your water.', suggestedPlantName: '' };
  if (path.startsWith('/plants/')) return { success: true, ...plants[0] };

  if (path === '/ai/assistant/chats') return chats.map(({ messages, ...chat }) => chat);
  if ((match = path.match(/^\/ai\/assistant\/chats\/([^/]+)$/))) {
    if (method === 'delete') return {};
    return chats.find((c) => c.id === match![1]);
  }
  if (path === '/ai/assistant') {
    const answer = demoAnswer(String(data.message || ''));
    let chat = chats.find((c) => c.id === data.chatId);
    if (!chat) {
      chat = { id: `chat-${Date.now()}`, title: String(data.message || 'New chat').slice(0, 40), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
      chats.unshift(chat);
    }
    chat.messages.push({ id: `m-${Date.now()}`, question: data.message, answer, createdAt: new Date().toISOString() });
    return { answer, model: 'demo', chatId: chat.id };
  }
  return {};
};

const demoAdapter: AxiosAdapter = async (config) => {
  const delay = (config.url || '').includes('/ai/') ? 900 : 250;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return json(config, route(config));
};

export function installDemoApi() {
  axios.defaults.adapter = demoAdapter;
}
