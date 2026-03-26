import fs from 'fs';
import path from 'path';
import { staticDestinationPlaceSets } from '../../src/lib/staticDestinationPlaces.js';

const GEOAPIFY_API_KEY = process.env.TRIPZY_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY || '';
const GEO_BASE = 'https://api.geoapify.com';
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
const INDIA_PLACES_FILE = path.resolve(process.cwd(), 'public', 'data', 'india-places.json');
const AI_PLANNER_TIMEOUT_MS = Math.max(7000, Number(process.env.TRIPZY_AI_PLANNER_TIMEOUT_MS || 14000) || 14000);

const weatherCodeMap = {
  0: 'Clear skies',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Dense fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Light snowfall',
  73: 'Snowfall',
  75: 'Heavy snowfall',
  80: 'Rain showers',
  81: 'Strong rain showers',
  82: 'Intense rain showers',
  95: 'Thunderstorm',
};

const fallbackPlaceCatalog = [
  { name: 'Ahmedabad', formatted: 'Ahmedabad, Gujarat, India', lat: 23.0225, lon: 72.5714, state: 'Gujarat', country: 'India', aliases: ['amdavad'] },
  { name: 'Jaipur', formatted: 'Jaipur, Rajasthan, India', lat: 26.9124, lon: 75.7873, state: 'Rajasthan', country: 'India' },
  { name: 'Rishikesh', formatted: 'Rishikesh, Uttarakhand, India', lat: 30.0869, lon: 78.2676, state: 'Uttarakhand', country: 'India' },
  { name: 'Haridwar', formatted: 'Haridwar, Uttarakhand, India', lat: 29.9457, lon: 78.1642, state: 'Uttarakhand', country: 'India' },
  { name: 'New Delhi', formatted: 'New Delhi, Delhi, India', lat: 28.6139, lon: 77.209, state: 'Delhi', country: 'India', aliases: ['delhi'] },
  { name: 'Mumbai', formatted: 'Mumbai, Maharashtra, India', lat: 19.076, lon: 72.8777, state: 'Maharashtra', country: 'India' },
  { name: 'Bengaluru', formatted: 'Bengaluru, Karnataka, India', lat: 12.9716, lon: 77.5946, state: 'Karnataka', country: 'India', aliases: ['bangalore'] },
  { name: 'Hyderabad', formatted: 'Hyderabad, Telangana, India', lat: 17.385, lon: 78.4867, state: 'Telangana', country: 'India' },
  { name: 'Goa', formatted: 'Panaji, Goa, India', lat: 15.4909, lon: 73.8278, state: 'Goa', country: 'India', aliases: ['panaji'] },
  { name: 'Manali', formatted: 'Manali, Himachal Pradesh, India', lat: 32.2432, lon: 77.1892, state: 'Himachal Pradesh', country: 'India' },
  { name: 'Shimla', formatted: 'Shimla, Himachal Pradesh, India', lat: 31.1048, lon: 77.1734, state: 'Himachal Pradesh', country: 'India' },
  { name: 'Varanasi', formatted: 'Varanasi, Uttar Pradesh, India', lat: 25.3176, lon: 82.9739, state: 'Uttar Pradesh', country: 'India', aliases: ['banaras', 'kashi'] },
  { name: 'Udaipur', formatted: 'Udaipur, Rajasthan, India', lat: 24.5854, lon: 73.7125, state: 'Rajasthan', country: 'India' },
  { name: 'Agra', formatted: 'Agra, Uttar Pradesh, India', lat: 27.1767, lon: 78.0081, state: 'Uttar Pradesh', country: 'India' },
  { name: 'Kerala', formatted: 'Kerala, India', lat: 10.8505, lon: 76.2711, state: 'Kerala', country: 'India', aliases: ['kochi', 'cochin'] },
  { name: 'Darjeeling', formatted: 'Darjeeling, West Bengal, India', lat: 27.036, lon: 88.2627, state: 'West Bengal', country: 'India' },
  { name: 'Leh Ladakh', formatted: 'Leh, Ladakh, India', lat: 34.1526, lon: 77.577, state: 'Ladakh', country: 'India', aliases: ['ladakh', 'leh'] },
  { name: 'Amritsar', formatted: 'Amritsar, Punjab, India', lat: 31.634, lon: 74.8723, state: 'Punjab', country: 'India' },
  { name: 'Andaman and Nicobar Islands', formatted: 'Andaman and Nicobar Islands, India', lat: 11.7401, lon: 92.6586, state: 'Andaman and Nicobar Islands', country: 'India', aliases: ['andaman'] },
  { name: 'Srinagar', formatted: 'Srinagar, Jammu and Kashmir, India', lat: 34.0837, lon: 74.7973, state: 'Jammu and Kashmir', country: 'India', aliases: ['kashmir'] },
];

let indiaFallbackCatalogCache = null;

const interestKeywordMap = {
  Nature: ['nature', 'river', 'garden', 'lake', 'beach', 'wildlife', 'waterfall', 'valley', 'tea', 'island'],
  Food: ['food', 'street food', 'cafe', 'market', 'bazaar', 'restaurant'],
  Adventure: ['adventure', 'valley', 'waterfall', 'gondola', 'pass', 'viewpoint', 'trek', 'rafting'],
  History: ['heritage', 'fort', 'museum', 'historical', 'palace', 'temple', 'monument'],
  Shopping: ['shopping', 'market', 'bazaar', 'craft', 'local market'],
  Wellness: ['ashram', 'wellness', 'spa', 'sunrise', 'riverfront', 'garden', 'ganga'],
};

const travelStyleKeywordMap = {
  Relaxed: ['lake', 'beach', 'garden', 'riverfront', 'sunset', 'wellness', 'cafe'],
  Adventure: ['adventure', 'waterfall', 'viewpoint', 'trek', 'pass', 'gondola', 'valley'],
  Cultural: ['heritage', 'museum', 'fort', 'palace', 'temple', 'historical'],
  Food: ['food', 'street food', 'market', 'cafe'],
  Walker: ['walk', 'walking', 'old town', 'riverfront', 'promenade', 'street', 'heritage', 'market', 'garden'],
  Cyclist: ['cycle', 'cycling', 'trail', 'riverfront', 'lake', 'promenade', 'park', 'viewpoint', 'scenic drive'],
  Rider: ['road trip', 'highway', 'pass', 'mountain', 'valley', 'viewpoint', 'coastal', 'fort', 'sunrise'],
  Backpacker: ['hostel', 'market', 'street food', 'walking', 'budget', 'heritage', 'cafe', 'local market'],
  Family: ['park', 'museum', 'zoo', 'lake', 'beach', 'garden', 'fort', 'boat', 'family'],
  Photographer: ['sunrise', 'sunset', 'viewpoint', 'lake', 'mountain', 'fort', 'heritage', 'riverfront', 'island'],
};

const travelStyleDescriptions = {
  Relaxed: 'easy pace, scenic spots, low-rush movement, calmer experiences',
  Adventure: 'active movement, scenic thrills, outdoor-heavy experiences',
  Cultural: 'heritage-led sightseeing, museums, monuments, local culture',
  Food: 'food-first exploration, cafes, markets, signature local eating spots',
  Walker: 'walk-friendly exploration with compact neighborhoods, promenades, and slower local discovery',
  Cyclist: 'cycle-friendly exploration with longer scenic stretches, parks, and road-based movement',
  Rider: 'motorbike or road-rider focused travel with strong route flow, viewpoints, and driving segments',
  Backpacker: 'budget-aware, local, flexible exploration with markets, food streets, and practical movement',
  Family: 'comfortable group-friendly sightseeing with easy logistics and broadly enjoyable stops',
  Photographer: 'image-first exploration focused on viewpoints, light, scenery, and visually strong landmarks',
};

const tripStyleKeywordMap = {
  Relaxed: ['lake', 'garden', 'riverfront', 'sunset', 'wellness'],
  Adventure: ['adventure', 'viewpoint', 'valley', 'pass', 'waterfall'],
  Cultural: ['heritage', 'historical', 'museum', 'fort', 'palace', 'temple'],
  Romantic: ['lake', 'sunset', 'garden', 'palace', 'island', 'viewpoint'],
};

const budgetProfiles = {
  Budget: { stayPerNight: 1200, foodPerDay: 550, localTravelPerDay: 300, activityPerDay: 250 },
  Medium: { stayPerNight: 2800, foodPerDay: 1100, localTravelPerDay: 700, activityPerDay: 650 },
  Luxury: { stayPerNight: 7000, foodPerDay: 2500, localTravelPerDay: 1800, activityPerDay: 1600 },
};

const budgetRanges = {
  Budget: { min: 5000, max: 15000 },
  Medium: { min: 15000, max: 40000 },
  Luxury: { min: 40000, max: null },
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
};

const withTimeout = (promise, ms, fallbackValue) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (typeof fallbackValue === 'function') return resolve(fallbackValue());
      if (typeof fallbackValue !== 'undefined') return resolve(fallbackValue);
      reject(new Error(`Timed out after ${ms} ms`));
    }, ms);

    promise.then((value) => {
      clearTimeout(timeout);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const formatDuration = (seconds = 0) => {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
};

const normalizeSearchText = (value = '') =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getTravelerCount = (travelers = '1') => {
  if (travelers === '3-5') return 4;
  if (travelers === '5+' || travelers === '6+') return 5;
  const parsed = Number.parseInt(String(travelers), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getTravelerLabel = (travelers = '1') => {
  const count = getTravelerCount(travelers);
  return count === 1 ? '1 traveler' : `${count} travelers`;
};

const getTravelStyleDescription = (travelStyle = 'Relaxed') =>
  travelStyleDescriptions[travelStyle] || travelStyleDescriptions.Relaxed;

const getStopsPerDay = (pace = 'Moderate', travelers = '1') => {
  const travelerCount = getTravelerCount(travelers);
  if (pace === 'Slow') return travelerCount >= 4 ? 2 : 3;
  if (pace === 'Fast') return travelerCount >= 4 ? 5 : 6;
  return travelerCount >= 4 ? 4 : 5;
};

const scoreKeywordMatches = (text, keywords = []) =>
  keywords.reduce((score, keyword) => (text.includes(keyword) ? score + 1 : score), 0);

const seedFromText = (text = '') =>
  normalizeSearchText(text).split('').reduce((total, character) => total + character.charCodeAt(0), 0) || 1;

const seededShuffle = (items = [], seed = 1) => {
  const next = [...items];
  let state = seed || 1;
  for (let index = next.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const swapIndex = Math.floor((state / 233280) * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const uniqueByName = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeSearchText(item?.name || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const withNearbyCityLabel = (place, city) => {
  const cityName = city?.name || '';
  const normalizedPlaceName = normalizeSearchText(place?.name || '');
  const normalizedCityName = normalizeSearchText(cityName);
  const alreadyTagged = normalizedCityName && normalizedPlaceName.includes(normalizedCityName);

  return {
    ...place,
    name: alreadyTagged ? place.name : `${place.name} (${cityName})`,
    address: place.address || city.formatted || `${cityName}, India`,
    nearbyCityName: cityName,
  };
};

const getRequiredUniquePlaces = (preferences = {}) =>
  Math.max(18, (Number(preferences.days || 3) || 3) * getStopsPerDay(preferences.pace, preferences.travelers));

const findNearbyCities = (destination, limit = 6) => {
  const candidates = uniqueByName([...fallbackPlaceCatalog, ...loadIndiaFallbackCatalog()])
    .filter((city) => {
      if (!Number.isFinite(city?.lat) || !Number.isFinite(city?.lon)) return false;
      const cityKey = normalizeSearchText(city.name);
      const destinationKey = normalizeSearchText(destination.name);
      return cityKey && cityKey !== destinationKey;
    })
    .map((city) => ({
      ...city,
      linearDistanceKm: haversineDistance(destination, city) / 1000,
    }))
    .filter((city) => city.linearDistanceKm <= 280)
    .sort((left, right) => left.linearDistanceKm - right.linearDistanceKm);

  return candidates.slice(0, limit);
};

const expandPlacesWithNearbyCities = ({ destination, preferences, places = [] }) => {
  const requiredUniquePlaces = getRequiredUniquePlaces(preferences);
  const basePool = uniqueByName(places);

  if (basePool.length >= requiredUniquePlaces) {
    return sortPlacesForPreferences(basePool, preferences);
  }

  const nearbyCities = findNearbyCities(destination, 8);
  const borrowedPlaces = nearbyCities.flatMap((city) =>
    buildCuratedFallbackPlaces(city).map((place) => ({
      ...withNearbyCityLabel(place, city),
      distanceMeters: Math.round(haversineDistance(destination, city) + (place.distanceMeters || 0)),
    }))
  );

  return sortPlacesForPreferences(uniqueByName([...basePool, ...borrowedPlaces]), preferences);
};

const buildCatalogSearchResults = (catalog, text, limit = 5) => {
  const normalizedQuery = normalizeSearchText(text);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  return catalog
    .map((item) => {
      const haystack = normalizeSearchText([item.name, item.formatted, item.state, ...(item.aliases || [])].join(' '));
      let score = 0;
      if (haystack.includes(normalizedQuery)) score += 40;
      tokens.forEach((token) => {
        if (haystack.includes(token)) score += 10;
      });
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
};

const normalizeGeocodeResult = (result) => ({
  id: result.place_id || result.formatted,
  name: result.city || result.name || result.state || result.formatted,
  formatted: result.formatted || result.address_line1 || result.city || result.name,
  city: result.city || result.name || '',
  state: result.state || '',
  country: result.country || 'India',
  countryCode: result.country_code || 'in',
  lat: Number(result.lat),
  lon: Number(result.lon),
});

const loadIndiaFallbackCatalog = () => {
  if (indiaFallbackCatalogCache) return indiaFallbackCatalogCache;

  try {
    const raw = fs.readFileSync(INDIA_PLACES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    indiaFallbackCatalogCache = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to load India places dataset from ${INDIA_PLACES_FILE}`, error);
    indiaFallbackCatalogCache = [];
  }

  return indiaFallbackCatalogCache;
};

const resolvePlaceFallback = async (text) => {
  const largeCatalog = loadIndiaFallbackCatalog();
  const results = buildCatalogSearchResults(
    [...fallbackPlaceCatalog, ...largeCatalog],
    text,
    1
  );
  if (!results.length) throw new Error('Please choose a city or region in India.');
  return results[0];
};

const resolvePlace = async (text) => {
  if (!GEOAPIFY_API_KEY) return resolvePlaceFallback(text);

  try {
    const url = new URL(`${GEO_BASE}/v1/geocode/search`);
    url.searchParams.set('text', text);
    url.searchParams.set('format', 'json');
    url.searchParams.set('type', 'locality');
    url.searchParams.set('filter', 'countrycode:in');
    url.searchParams.set('bias', 'countrycode:in');
    url.searchParams.set('lang', 'en');
    url.searchParams.set('limit', '1');
    url.searchParams.set('apiKey', GEOAPIFY_API_KEY);
    const data = await fetchJson(url.toString());
    const result = data.results?.[0];
    if (result) return normalizeGeocodeResult(result);
  } catch (error) {
    console.error('Geoapify geocode failed, falling back to the local catalog.', error);
  }

  return resolvePlaceFallback(text);
};

const haversineDistance = (origin, destination) => {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lon - origin.lon);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const buildApproxRoute = (origin, destination) => {
  const distanceMeters = Math.round(haversineDistance(origin, destination) * 1.28);
  const averageSpeedKph = distanceMeters > 300000 ? 68 : 46;
  const durationSeconds = Math.round((distanceMeters / 1000 / averageSpeedKph) * 3600);

  return {
    distanceMeters,
    distanceKm: distanceMeters / 1000,
    durationSeconds,
    durationText: formatDuration(durationSeconds),
    line: [
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
    ],
  };
};

const getRoute = async (origin, destination) => {
  if (!GEOAPIFY_API_KEY) return buildApproxRoute(origin, destination);

  try {
    const url = new URL(`${GEO_BASE}/v1/routing`);
    url.searchParams.set('waypoints', `${origin.lat},${origin.lon}|${destination.lat},${destination.lon}`);
    url.searchParams.set('mode', 'drive');
    url.searchParams.set('traffic', 'approximated');
    url.searchParams.set('apiKey', GEOAPIFY_API_KEY);
    const data = await fetchJson(url.toString());
    const feature = data.features?.[0];
    const coordinates = feature?.geometry?.coordinates?.map((point) => [point[1], point[0]]) || [];

    if (feature) {
      return {
        distanceMeters: feature.properties?.distance || 0,
        distanceKm: (feature.properties?.distance || 0) / 1000,
        durationSeconds: feature.properties?.time || 0,
        durationText: formatDuration(feature.properties?.time || 0),
        line: coordinates,
      };
    }
  } catch (error) {
    console.error('Geoapify route failed, using an approximate route.', error);
  }

  return buildApproxRoute(origin, destination);
};

const matchStaticDestinationPlaceSet = (destination) => {
  const source = normalizeSearchText([destination.name, destination.formatted, destination.state].filter(Boolean).join(' '));
  return staticDestinationPlaceSets.find((set) => set.aliases.some((alias) => source.includes(normalizeSearchText(alias)))) || null;
};

const buildSyntheticFallbackPlaces = (destination) => ([
  { name: `${destination.name} Old Town Walk`, categoryLabel: 'heritage', address: `${destination.name}, India`, latOffset: 0.011, lonOffset: -0.006, distanceMeters: 1500 },
  { name: `${destination.name} Market Lane Circuit`, categoryLabel: 'market', address: `${destination.name}, India`, latOffset: -0.014, lonOffset: -0.004, distanceMeters: 2100 },
  { name: `${destination.name} Sunrise Ridge`, categoryLabel: 'viewpoint', address: `${destination.name}, India`, latOffset: 0.018, lonOffset: 0.009, distanceMeters: 1900 },
  { name: `${destination.name} Riverside Promenade`, categoryLabel: 'riverfront', address: `${destination.name}, India`, latOffset: -0.009, lonOffset: 0.01, distanceMeters: 1700 },
  { name: `${destination.name} Local Tasting Trail`, categoryLabel: 'street food', address: `${destination.name}, India`, latOffset: 0.006, lonOffset: 0.012, distanceMeters: 1100 },
  { name: `${destination.name} Sunset Garden Loop`, categoryLabel: 'sunset', address: `${destination.name}, India`, latOffset: 0.021, lonOffset: -0.011, distanceMeters: 2600 },
]);

const buildCuratedFallbackPlaces = (destination) => {
  const matchedSet = matchStaticDestinationPlaceSet(destination);
  const curated = (matchedSet?.places || []).map((place, index) => ({
    id: `${normalizeSearchText(destination.name).replace(/\s+/g, '-')}-${normalizeSearchText(place.name).replace(/\s+/g, '-')}`,
    name: place.name,
    address: place.address,
    lat: Number((destination.lat + place.latOffset).toFixed(6)),
    lon: Number((destination.lon + place.lonOffset).toFixed(6)),
    categories: [place.categoryLabel],
    categoryLabel: place.categoryLabel,
    distanceMeters: place.distanceMeters ?? (1200 + index * 1800),
  }));

  const synthetic = buildSyntheticFallbackPlaces(destination).map((place, index) => ({
    id: `${normalizeSearchText(destination.name).replace(/\s+/g, '-')}-synthetic-${index + 1}`,
    name: place.name,
    address: place.address,
    lat: Number((destination.lat + place.latOffset).toFixed(6)),
    lon: Number((destination.lon + place.lonOffset).toFixed(6)),
    categories: [place.categoryLabel],
    categoryLabel: place.categoryLabel,
    distanceMeters: place.distanceMeters,
  }));

  return uniqueByName([...curated, ...synthetic]);
};

const scorePlaceForPreferences = (place, preferences) => {
  const placeText = normalizeSearchText([place.name, place.address, place.categoryLabel, ...(place.categories || [])].join(' '));
  const distanceKm = (place.distanceMeters || 0) / 1000;
  let score = 0;

  (preferences.interests || []).forEach((interest) => {
    score += scoreKeywordMatches(placeText, interestKeywordMap[interest] || []) * 10;
  });
  score += scoreKeywordMatches(placeText, travelStyleKeywordMap[preferences.travelStyle] || []) * 12;
  score += scoreKeywordMatches(placeText, tripStyleKeywordMap[preferences.tripType] || []) * 10;
  score -= distanceKm * (preferences.pace === 'Slow' ? 1.5 : preferences.pace === 'Moderate' ? 1 : 0.65);
  return score;
};

const sortPlacesForPreferences = (places = [], preferences) =>
  [...places].sort((a, b) => {
    const scoreDiff = scorePlaceForPreferences(b, preferences) - scorePlaceForPreferences(a, preferences);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.distanceMeters || 0) - (b.distanceMeters || 0);
  });

const getNearbyPlaces = async (destination, preferences) => {
  const curated = buildCuratedFallbackPlaces(destination);
  if (!GEOAPIFY_API_KEY) return expandPlacesWithNearbyCities({ destination, preferences, places: curated });

  try {
    const url = new URL(`${GEO_BASE}/v2/places`);
    url.searchParams.set('categories', 'tourism,tourism.sights,tourism.attraction,entertainment.museum,natural,leisure.park,catering,commercial');
    url.searchParams.set('filter', `circle:${destination.lon},${destination.lat},14000`);
    url.searchParams.set('bias', `proximity:${destination.lon},${destination.lat}`);
    url.searchParams.set('limit', '40');
    url.searchParams.set('apiKey', GEOAPIFY_API_KEY);
    const data = await fetchJson(url.toString());
    const livePlaces = (data.features || [])
      .map((feature, index) => ({
        id: feature.properties?.place_id || `live-${index + 1}`,
        name: feature.properties?.name || feature.properties?.formatted,
        address: feature.properties?.formatted || destination.formatted,
        lat: feature.properties?.lat,
        lon: feature.properties?.lon,
        categories: feature.properties?.categories || [],
        categoryLabel: feature.properties?.categories?.[0]?.split('.').slice(-1)[0] || 'attraction',
        distanceMeters: feature.properties?.distance || 0,
      }))
      .filter((place) => place.name && Number.isFinite(place.lat) && Number.isFinite(place.lon));

    return expandPlacesWithNearbyCities({
      destination,
      preferences,
      places: uniqueByName([...curated, ...livePlaces]),
    });
  } catch (error) {
    console.error('Geoapify places failed, using curated fallback places.', error);
    return expandPlacesWithNearbyCities({ destination, preferences, places: curated });
  }
};

const getWeatherForecast = async (destination, fromDate, toDate) => {
  const url = new URL(WEATHER_BASE);
  url.searchParams.set('latitude', String(destination.lat));
  url.searchParams.set('longitude', String(destination.lon));
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('forecast_days', '16');
  url.searchParams.set('timezone', 'auto');

  try {
    const data = await fetchJson(url.toString());
    const daily = data.daily;
    if (!daily?.time?.length) return [];
    return daily.time
      .map((date, index) => ({
        date,
        max: daily.temperature_2m_max?.[index],
        min: daily.temperature_2m_min?.[index],
        rainChance: daily.precipitation_probability_max?.[index] ?? 0,
        summary: weatherCodeMap[daily.weather_code?.[index]] || 'Weather update unavailable',
      }))
      .filter((entry) => entry.date >= fromDate && entry.date <= toDate);
  } catch (error) {
    console.error('Weather forecast failed, using an empty forecast.', error);
    return [];
  }
};

const estimateBudget = ({ route, preferences, journey }) => {
  const profile = budgetProfiles[preferences.budget] || budgetProfiles.Medium;
  const budgetRange = budgetRanges[preferences.budget] || budgetRanges.Medium;
  const travelers = getTravelerCount(preferences.travelers);
  const nights = Math.max(1, preferences.days - 1);
  const rooms = travelers <= 2 ? 1 : Math.ceil(travelers / 2);
  const arrivalTravel = Math.round(journey.totalCost || route.distanceKm * 2.5);
  const stay = profile.stayPerNight * nights * rooms;
  const food = profile.foodPerDay * preferences.days * travelers;
  const localTravel = profile.localTravelPerDay * preferences.days;
  const activities = profile.activityPerDay * preferences.days * travelers;
  const total = Math.round(arrivalTravel + stay + food + localTravel + activities);
  const perPersonTotal = Math.round(total / travelers);
  const overBudgetBy = budgetRange.max ? Math.max(0, perPersonTotal - budgetRange.max) : 0;

  return {
    total,
    totalLabel: formatCurrency(total),
    perPersonTotal,
    perPersonLabel: formatCurrency(perPersonTotal),
    selectedRangeLabel: budgetRange.max ? `${formatCurrency(budgetRange.min)} - ${formatCurrency(budgetRange.max)}` : `${formatCurrency(budgetRange.min)}+`,
    budgetNote: overBudgetBy > 0
      ? `~${formatCurrency(perPersonTotal)} per person and slightly above your selected budget range.`
      : `~${formatCurrency(perPersonTotal)} per person and within your selected budget range.`,
    breakdown: [
      { label: 'Travel to destination', value: formatCurrency(arrivalTravel) },
      { label: 'Stays', value: formatCurrency(stay) },
      { label: 'Food', value: formatCurrency(food) },
      { label: 'Local transport', value: formatCurrency(localTravel) },
      { label: 'Activities', value: formatCurrency(activities) },
    ],
  };
};

const transitHubFallbackCatalog = {
  Ahmedabad: {
    Flight: 'Sardar Vallabhbhai Patel International Airport',
    Train: 'Ahmedabad Junction',
    Bus: 'Geeta Mandir Bus Terminal',
  },
  Jaipur: {
    Flight: 'Jaipur International Airport',
    Train: 'Jaipur Junction',
    Bus: 'Sindhi Camp Bus Station',
  },
  Mumbai: {
    Flight: 'Chhatrapati Shivaji Maharaj International Airport',
    Train: 'Mumbai Central',
    Bus: 'Mumbai Central Bus Depot',
  },
  Delhi: {
    Flight: 'Indira Gandhi International Airport',
    Train: 'New Delhi Railway Station',
    Bus: 'Kashmere Gate ISBT',
  },
  'New Delhi': {
    Flight: 'Indira Gandhi International Airport',
    Train: 'New Delhi Railway Station',
    Bus: 'Kashmere Gate ISBT',
  },
  Bengaluru: {
    Flight: 'Kempegowda International Airport',
    Train: 'KSR Bengaluru City Junction',
    Bus: 'Kempegowda Bus Station',
  },
  Hyderabad: {
    Flight: 'Rajiv Gandhi International Airport',
    Train: 'Secunderabad Junction',
    Bus: 'MGBS Bus Station',
  },
  Chennai: {
    Flight: 'Chennai International Airport',
    Train: 'Chennai Central',
    Bus: 'CMBT',
  },
  Kolkata: {
    Flight: 'Netaji Subhas Chandra Bose International Airport',
    Train: 'Howrah Junction',
    Bus: 'Esplanade Bus Terminus',
  },
  Goa: {
    Flight: 'Dabolim Airport',
    Train: 'Madgaon Junction',
    Bus: 'Panjim Bus Stand',
  },
};

const estimateSurfaceLeg = ({ mode, distanceKm, travelers, budget }) => {
  const multiplier = budget === 'Luxury' ? 1.35 : budget === 'Medium' ? 1.12 : 1;
  const rules = {
    Road: { baseFare: 280, perKm: 9.2, speedKph: 55, bufferMinutes: 12, perTraveler: false },
    Bus: { baseFare: 140, perKm: 1.65, speedKph: 44, bufferMinutes: 35, perTraveler: true },
    Train: { baseFare: 220, perKm: 1.25, speedKph: 60, bufferMinutes: 55, perTraveler: true },
    Flight: { baseFare: 2400, perKm: 3.8, speedKph: 520, bufferMinutes: 170, perTraveler: true },
    Cab: { baseFare: 120, perKm: 16, speedKph: 24, bufferMinutes: 8, perTraveler: false },
    Auto: { baseFare: 45, perKm: 13, speedKph: 18, bufferMinutes: 8, perTraveler: false },
  };
  const rule = rules[mode] || rules.Road;
  const baseCost = rule.baseFare + distanceKm * rule.perKm;
  const cost = Math.round(baseCost * (rule.perTraveler ? travelers * multiplier : 1));
  const durationSeconds = Math.max(10 * 60, Math.round(((distanceKm / rule.speedKph) * 3600) + rule.bufferMinutes * 60));

  return {
    cost,
    costLabel: formatCurrency(cost),
    durationSeconds,
    durationText: formatDuration(durationSeconds),
  };
};

const pickPrimaryTransportMode = ({ distanceKm, preferences }) => {
  const requested = preferences.travelMode || 'Smart';

  if (requested === 'Road') return 'Road';
  if (requested === 'Train') return distanceKm <= 160 ? 'Road' : 'Train';
  if (requested === 'Flight') return distanceKm <= 320 ? 'Road' : 'Flight';
  if (distanceKm > 1450) return 'Flight';
  if (distanceKm > 420) return 'Train';
  if (distanceKm > 170) return preferences.budget === 'Budget' ? 'Bus' : 'Train';
  return 'Road';
};

const buildHubSearchTerms = (place, mode) => {
  const area = place.formatted || place.name;
  if (mode === 'Flight') {
    return [
      `${place.name} airport`,
      `${area} international airport`,
      `${area} domestic airport`,
    ];
  }

  if (mode === 'Train') {
    return [
      `${place.name} railway station`,
      `${area} junction`,
      `${area} train station`,
    ];
  }

  return [
    `${place.name} bus station`,
    `${area} bus stand`,
    `${area} interstate bus terminal`,
  ];
};

const getHubFallbackName = (place, mode) => {
  const candidates = [
    place.name,
    place.city,
    place.state,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const label = transitHubFallbackCatalog[candidate]?.[mode];
    if (label) return label;
  }

  return `${place.name} ${mode === 'Flight' ? 'Airport' : mode === 'Train' ? 'Railway Station' : 'Bus Terminal'}`;
};

const buildFallbackHub = (place, mode, role) => {
  const offsets =
    mode === 'Flight'
      ? [0.072, -0.058]
      : mode === 'Train'
        ? [-0.018, 0.021]
        : [0.02, 0.014];
  const direction = role === 'origin' ? 1 : -1;

  return {
    name: getHubFallbackName(place, mode),
    lat: Number((place.lat + offsets[0] * direction).toFixed(6)),
    lon: Number((place.lon + offsets[1] * direction).toFixed(6)),
    source: 'estimated_fallback',
  };
};

const searchTransitHub = async (place, mode, role) => {
  if (!GEOAPIFY_API_KEY || mode === 'Road') {
    return buildFallbackHub(place, mode, role);
  }

  const searchTerms = buildHubSearchTerms(place, mode);

  for (const term of searchTerms) {
    try {
      const url = new URL(`${GEO_BASE}/v1/geocode/search`);
      url.searchParams.set('text', term);
      url.searchParams.set('format', 'json');
      url.searchParams.set('filter', `circle:${place.lon},${place.lat},60000`);
      url.searchParams.set('bias', `proximity:${place.lon},${place.lat}`);
      url.searchParams.set('lang', 'en');
      url.searchParams.set('limit', '1');
      url.searchParams.set('apiKey', GEOAPIFY_API_KEY);
      const data = await fetchJson(url.toString());
      const result = data.results?.[0];

      if (result && Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon))) {
        return {
          name: result.name || result.formatted || getHubFallbackName(place, mode),
          lat: Number(result.lat),
          lon: Number(result.lon),
          source: 'live_geo_search',
        };
      }
    } catch (error) {
      console.error(`Transit hub search failed for ${term}.`, error);
    }
  }

  return buildFallbackHub(place, mode, role);
};

const buildJourneyLeg = ({ title, mode, from, to, travelers, budget, note, line }) => {
  const distanceKm = Number((haversineDistance(from, to) / 1000).toFixed(1));
  const metrics = estimateSurfaceLeg({ mode, distanceKm, travelers, budget });

  return {
    title,
    mode,
    fromLabel: from.name,
    toLabel: to.name,
    distanceKm,
    durationSeconds: metrics.durationSeconds,
    durationText: metrics.durationText,
    cost: metrics.cost,
    costLabel: metrics.costLabel,
    note,
    line,
  };
};

const buildJourneyPlan = async ({ origin, destination, route, preferences }) => {
  const distanceKm = route.distanceKm;
  const travelers = getTravelerCount(preferences.travelers);
  const primaryMode = pickPrimaryTransportMode({ distanceKm, preferences });
  const requestedMode = preferences.travelMode;

  if (primaryMode === 'Road') {
    const roadMetrics = estimateSurfaceLeg({
      mode: preferences.travelMode === 'Bus' ? 'Bus' : 'Road',
      distanceKm,
      travelers,
      budget: preferences.budget,
    });

    return {
      primaryMode: preferences.travelMode === 'Bus' ? 'Bus' : 'Road',
      requestedMode,
      summary: preferences.travelMode === 'Bus' ? 'Road transfer -> intercity bus -> local arrival' : 'Door-to-door road transfer',
      totalCost: roadMetrics.cost,
      totalCostLabel: roadMetrics.costLabel,
      totalDurationSeconds: route.durationSeconds || roadMetrics.durationSeconds,
      totalDurationText: route.durationText || roadMetrics.durationText,
      dataSource: GEOAPIFY_API_KEY ? 'mixed_live_route' : 'estimated_route',
      dataSourceLabel: GEOAPIFY_API_KEY ? 'Live road route with estimated pricing' : 'Estimated transport plan',
      legs: [
        {
          title: `Travel from ${origin.name} to ${destination.name}`,
          mode: preferences.travelMode === 'Bus' ? 'Bus' : 'Road',
          fromLabel: origin.name,
          toLabel: destination.name,
          distanceKm: Number(distanceKm.toFixed(1)),
          durationSeconds: route.durationSeconds || roadMetrics.durationSeconds,
          durationText: route.durationText || roadMetrics.durationText,
          cost: roadMetrics.cost,
          costLabel: roadMetrics.costLabel,
          note: GEOAPIFY_API_KEY ? 'Road alignment is live. Time and pricing are estimated for planning.' : 'Road journey is estimated from route distance.',
          line: route.line,
        },
      ],
    };
  }

  const [originHub, destinationHub] = await Promise.all([
    searchTransitHub(origin, primaryMode, 'origin'),
    searchTransitHub(destination, primaryMode, 'destination'),
  ]);

  const homePoint = { name: `${origin.name} city center`, lat: origin.lat, lon: origin.lon };
  const stayPoint = { name: `${destination.name} stay area`, lat: destination.lat, lon: destination.lon };
  const firstMileMode = primaryMode === 'Flight' && preferences.budget !== 'Budget' ? 'Cab' : 'Auto';
  const lastMileMode = primaryMode === 'Flight' ? 'Cab' : 'Auto';
  const firstLeg = buildJourneyLeg({
    title: `Reach ${originHub.name}`,
    mode: firstMileMode,
    from: homePoint,
    to: originHub,
    travelers,
    budget: preferences.budget,
    note: `First-mile transfer into your ${primaryMode.toLowerCase()} departure hub.`,
    line: [
      [homePoint.lat, homePoint.lon],
      [originHub.lat, originHub.lon],
    ],
  });

  const mainDistanceKm = Number((haversineDistance(originHub, destinationHub) / 1000).toFixed(1));
  const mainMetrics = estimateSurfaceLeg({
    mode: primaryMode,
    distanceKm: mainDistanceKm,
    travelers,
    budget: preferences.budget,
  });
  const mainLeg = {
    title: `${primaryMode} from ${originHub.name} to ${destinationHub.name}`,
    mode: primaryMode,
    fromLabel: originHub.name,
    toLabel: destinationHub.name,
    distanceKm: mainDistanceKm,
    durationSeconds: mainMetrics.durationSeconds,
    durationText: mainMetrics.durationText,
    cost: mainMetrics.cost,
    costLabel: mainMetrics.costLabel,
    note:
      primaryMode === 'Flight'
        ? 'Airport lookup is live when available. Flight time and fare are estimated for planning.'
        : primaryMode === 'Train'
          ? 'Rail station lookup is live when available. Train duration and fare are estimated for planning.'
          : 'Bus terminal lookup is live when available. Bus duration and fare are estimated for planning.',
    line: [
      [originHub.lat, originHub.lon],
      [destinationHub.lat, destinationHub.lon],
    ],
  };

  const lastLeg = buildJourneyLeg({
    title: `Transfer into ${destination.name}`,
    mode: lastMileMode,
    from: destinationHub,
    to: stayPoint,
    travelers,
    budget: preferences.budget,
    note: 'Short last-mile transfer from the arrival hub to your stay area.',
    line: [
      [destinationHub.lat, destinationHub.lon],
      [stayPoint.lat, stayPoint.lon],
    ],
  });

  const totalCost = firstLeg.cost + mainLeg.cost + lastLeg.cost;
  const totalDurationSeconds = firstLeg.durationSeconds + mainLeg.durationSeconds + lastLeg.durationSeconds;
  const allLive = originHub.source === 'live_geo_search' && destinationHub.source === 'live_geo_search';

  return {
    primaryMode,
    requestedMode,
    summary: `${firstLeg.mode} -> ${mainLeg.mode} -> ${lastLeg.mode}`,
    totalCost,
    totalCostLabel: formatCurrency(totalCost),
    totalDurationSeconds,
    totalDurationText: formatDuration(totalDurationSeconds),
    dataSource: allLive ? 'live_hubs_estimated_timing' : 'mixed_estimated_transport',
    dataSourceLabel: allLive ? 'Live transport hubs with estimated timing and fares' : 'Mixed live and estimated transport data',
    legs: [firstLeg, mainLeg, lastLeg],
  };
};

const buildPreferenceDigest = (preferences, budgetEstimate) => ([
  `Trip length: ${preferences.days} days`,
  `Budget: ${preferences.budget} (${budgetEstimate.perPersonLabel} per person)`,
  `Travel style: ${preferences.travelStyle}`,
  `Trip type: ${preferences.tripType}`,
  `Pace: ${preferences.pace}`,
  `Transfer preference: ${preferences.travelMode}`,
  `Travelers: ${getTravelerLabel(preferences.travelers)}`,
  `Interests: ${(preferences.interests || []).join(', ') || 'General'}`,
]);

const buildInterestSummary = (interests = []) => (interests.length ? interests.join(', ') : 'general sightseeing');

const buildAiPlanningRules = ({ preferences, route, budgetEstimate, journey }) => [
  `Treat every selected preference from the preferences page as required, not optional.`,
  `Keep the plan aligned to this trip window: ${preferences.fromDate} to ${preferences.toDate}.`,
  `Use a ${preferences.pace.toLowerCase()} pace with about ${getStopsPerDay(preferences.pace, preferences.travelers)} practical stops per day for this group size.`,
  `Respect the ${preferences.budget.toLowerCase()} budget as a per-person budget, around ${budgetEstimate.perPersonLabel} per person and ${budgetEstimate.totalLabel} total.`,
  `Follow the requested transfer preference: ${preferences.travelMode.toLowerCase()}.`,
  `Make the plan suitable for ${getTravelerLabel(preferences.travelers).toLowerCase()} traveling together.`,
  `Prioritize places that match these interests: ${buildInterestSummary(preferences.interests)}.`,
  `Reflect the requested travel style (${preferences.travelStyle}: ${getTravelStyleDescription(preferences.travelStyle)}) in the actual stop selection, not just in wording.`,
  `Reflect the requested trip style (${preferences.tripType}) in the overall structure and place choices.`,
  `Keep arrival and transfer effort practical because the route is ${route.durationText} and the suggested travel chain is ${journey.summary}.`,
].map((rule) => `- ${rule}`).join('\n');

const buildDayTheme = (destinationName, dayIndex, stopNames, templates, seed) => {
  const template = templates[(dayIndex + seed) % templates.length];
  const leadStop = stopNames[0] || destinationName;
  return template.replace('{destination}', destinationName).replace('{leadStop}', leadStop);
};

const buildFallbackItinerary = ({ destination, preferences, places, weather, route, journey }) => {
  const stopLimit = getStopsPerDay(preferences.pace, preferences.travelers);
  const seed = seedFromText(`${destination.name}-${preferences.travelStyle}-${preferences.tripType}-${preferences.interests.join(',')}-${preferences.days}`);
  const allPlaces = seededShuffle(
    expandPlacesWithNearbyCities({
      destination,
      preferences,
      places: uniqueByName(places.length ? places : buildCuratedFallbackPlaces(destination)),
    }),
    seed
  );
  const selectedStops = [];
  const usedNames = new Set();

  allPlaces.forEach((place) => {
    const key = normalizeSearchText(place.name);
    if (!usedNames.has(key)) {
      usedNames.add(key);
      selectedStops.push(place);
    }
  });

  const dayThemeTemplates = [
    '{destination} heritage and local rhythm',
    '{destination} scenic highlights and easy movement',
    '{destination} food, culture, and neighborhood details',
    '{destination} signature icons and slower moments',
    '{destination} viewpoints, local flavor, and practical stops',
    '{destination} market lanes, quiet corners, and signature stops',
    '{destination} local neighborhoods and easy scenic breaks',
  ];

  const daySummaryTemplates = [
    'This day balances signature places with a pace that fits your trip settings.',
    'The stop mix keeps the route practical while still giving the day a distinct identity.',
    'This plan leans into your selected travel style without overloading the day.',
    'The sequence favors smooth movement, memorable stops, and realistic travel effort.',
    'The route keeps the day feeling local rather than overpacked with checklist stops.',
    'This day prioritizes variety, smoother transfers, and stronger fit with your preferences.',
  ];

  const tipsPool = seededShuffle([
    `Keep one buffer slot each day because ${destination.name} can feel more rewarding with flexible timing.`,
    'Use early hours for major sightseeing so the plan stays practical and less crowded.',
    'Shift outdoor stops later in the day if live weather changes before departure.',
    'Stay close to your first major stop each morning to reduce unnecessary local travel.',
    'Use local food and market stops as lighter slots between bigger attractions.',
    `This route works best when you keep transfer expectations aligned with ${journey.totalDurationText} of travel time.`,
    'Swap one headline attraction for a neighborhood walk if you want the plan to feel less tourist-heavy.',
    'Keep dinner plans flexible so crowded evenings do not break the rest of the route.',
  ], seed);

  const days = Array.from({ length: preferences.days }).map((_, index) => {
    const date = new Date(preferences.fromDate);
    date.setDate(date.getDate() + index);
    const dayWeather = weather[index];
    const dayPlaces = [];
    const perDayUsed = new Set();
    const safePool = selectedStops.length ? selectedStops : allPlaces;
    const startIndex = (index * stopLimit) % Math.max(1, safePool.length);

    for (let offset = 0; offset < safePool.length && dayPlaces.length < stopLimit; offset += 1) {
      const place = safePool[(startIndex + offset) % safePool.length];
      const key = normalizeSearchText(place?.name || '');
      if (!key || perDayUsed.has(key)) continue;
      perDayUsed.add(key);
      dayPlaces.push(place);
    }

    if (!dayPlaces.length) {
      dayPlaces.push(...safePool.slice(0, Math.max(1, stopLimit)));
    }

    const stops = dayPlaces.map((place, stopIndex) => ({
      name: place.name,
      type: place.categoryLabel,
      reason: `Included because it aligns with your ${preferences.travelStyle.toLowerCase()} style, ${preferences.tripType.toLowerCase()} trip type, and ${preferences.pace.toLowerCase()} day pacing.`,
      duration: stopIndex === 0 ? '2 hrs' : stopIndex === 1 ? '1.5 hrs' : '1 hr',
      address: place.address,
      lat: place.lat,
      lon: place.lon,
    }));

    return {
      day: index + 1,
      date: date.toISOString().slice(0, 10),
      theme: buildDayTheme(destination.name, index, stops.map((stop) => stop.name), dayThemeTemplates, seed),
      summary: daySummaryTemplates[(index + seed) % daySummaryTemplates.length],
      weatherNote: dayWeather
        ? `${dayWeather.summary} with ${Math.round(dayWeather.max)}° / ${Math.round(dayWeather.min)}°.`
        : 'Check the live weather before heading out.',
      stops,
    };
  });

  return {
    overview: `${destination.name} works well for a ${preferences.days}-day ${preferences.tripType.toLowerCase()} trip from ${preferences.originText}. This itinerary is shaped around a ${preferences.travelStyle.toLowerCase()} style, ${preferences.pace.toLowerCase()} pace, ${preferences.budget.toLowerCase()} budget, ${preferences.travelMode.toLowerCase()} transfer preference, and a focus on ${buildInterestSummary(preferences.interests)}.`,
    tips: tipsPool.slice(0, 4),
    days,
    _generation: {
      providerName: 'fallback_dataset_v2',
      providerSlot: 'fallback',
      wasFallbackUsed: true,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
    },
  };
};

const extractJson = (text) => {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    // Fall through to object extraction.
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (error) {
    console.error('Failed to parse AI JSON output.', error);
    return null;
  }
};

const pickFirstArray = (...values) => values.find((value) => Array.isArray(value) && value.length) || [];

const normalizeAiJson = (parsed, fallbackDays, stopLimit) => {
  if (!parsed || typeof parsed !== 'object') return null;

  const overview =
    typeof parsed.overview === 'string'
      ? parsed.overview
      : typeof parsed.summary === 'string'
        ? parsed.summary
        : typeof parsed.trip_overview === 'string'
          ? parsed.trip_overview
          : typeof parsed.itinerary_overview === 'string'
            ? parsed.itinerary_overview
            : 'Your trip plan is ready.';

  const tips = pickFirstArray(parsed.tips, parsed.travelTips, parsed.recommendations)
    .filter((tip) => typeof tip === 'string')
    .slice(0, 4);

  const days = pickFirstArray(
    parsed.days,
    parsed.itinerary,
    parsed.itineraryDays,
    parsed.dayWisePlan,
    parsed.day_wise_plan,
    parsed.tripPlan?.days,
    parsed.plan?.days,
    parsed.itineraryPlan?.days
  );

  if (!days.length) return null;

  return {
    overview,
    tips,
    days: fallbackDays.map((fallbackDay, index) => {
      const day = days[index] || {};
      return ({
      day: Number(day.day) || fallbackDay.day,
      date: typeof day.date === 'string' ? day.date : fallbackDay.date,
      theme:
        typeof day.theme === 'string'
          ? day.theme
          : typeof day.title === 'string'
            ? day.title
            : fallbackDay.theme,
      summary:
        typeof day.summary === 'string'
          ? day.summary
          : typeof day.description === 'string'
            ? day.description
            : fallbackDay.summary,
      weatherNote:
        typeof day.weatherNote === 'string'
          ? day.weatherNote
          : typeof day.weather === 'string'
            ? day.weather
            : fallbackDay.weatherNote,
      stops: Array.isArray(day.stops || day.places || day.activities)
        ? (day.stops || day.places || day.activities).slice(0, stopLimit).map((stop, stopIndex) => ({
            name: typeof stop.name === 'string' ? stop.name : fallbackDay.stops[stopIndex]?.name,
            type:
              typeof stop.type === 'string'
                ? stop.type
                : typeof stop.category === 'string'
                  ? stop.category
                  : fallbackDay.stops[stopIndex]?.type || 'attraction',
            reason:
              typeof stop.reason === 'string'
                ? stop.reason
                : typeof stop.note === 'string'
                  ? stop.note
                  : fallbackDay.stops[stopIndex]?.reason || 'Included for a balanced day plan.',
            duration:
              typeof stop.duration === 'string'
                ? stop.duration
                : typeof stop.time === 'string'
                  ? stop.time
                  : fallbackDay.stops[stopIndex]?.duration || '1 hr',
          })).filter((stop) => stop.name)
        : fallbackDay.stops,
    });
    }),
  };
};

const generateItinerary = async ({ origin, destination, route, places, weather, preferences, budgetEstimate, journey, aiRequester }) => {
  const stopLimit = getStopsPerDay(preferences.pace, preferences.travelers);
  const compactPlaces = places.slice(0, Math.min(72, Math.max(18, preferences.days * stopLimit * 2))).map((place) => ({
    name: place.name,
    category: place.categoryLabel,
    address: place.address,
    distanceKm: Number((place.distanceMeters / 1000).toFixed(1)),
    nearbyCityName: place.nearbyCityName || '',
  }));
  const maxTokens = Math.min(1600, Math.max(650, 320 + preferences.days * stopLimit * 18));
  const compactWeather = weather.map((entry) => ({
    date: entry.date,
    summary: entry.summary,
    min: entry.min,
    max: entry.max,
    rainChance: entry.rainChance,
  }));

  const fallbackPlan = buildFallbackItinerary({ destination, preferences, places, weather, route, journey });
  const prompt = `
Create a full India travel itinerary in valid JSON only.
Use only the provided places. Do not invent any new stop names.
Keep it practical, realistic, and complete for the full trip length.
Respect every submitted trip parameter and let them materially change the plan.
Return exactly ${preferences.days} day objects in the "days" array.
If the main destination does not have enough unique places for all requested days, continue using the provided nearby-city candidate places already included in the input.
Do not repeat the same stop name across different days unless there are still not enough unique candidate places after using nearby-city options.
Make each day feel different, with a distinct theme, summary, and stop mix.
Return exactly one JSON object with this shape:
{
  "overview": "string",
  "tips": ["string"],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "string",
      "summary": "string",
      "weatherNote": "string",
      "stops": [
        {
          "name": "string",
          "type": "string",
          "reason": "string",
          "duration": "string"
        }
      ]
    }
  ]
}
Do not use markdown. Do not add commentary before or after the JSON.

Trip request:
- Origin entered by user: ${preferences.originText}
- Resolved origin: ${origin.formatted || origin.name}
- Destination entered by user: ${preferences.destinationText}
- Resolved destination: ${destination.formatted || destination.name}
- Trip dates: ${preferences.fromDate} to ${preferences.toDate}
- Days: ${preferences.days}
- Budget: ${preferences.budget} (${budgetEstimate.selectedRangeLabel} per person)
- Transfer mode preference: ${preferences.travelMode}
- Travel style: ${preferences.travelStyle}
- Trip type: ${preferences.tripType}
- Pace: ${preferences.pace}
- Interests: ${(preferences.interests || []).join(', ') || 'General'}
- Travelers: ${getTravelerCount(preferences.travelers)} people
- Route distance: ${route.distanceKm.toFixed(1)} km
- Route travel time: ${route.durationText}
- Suggested travel chain: ${journey.summary}
- Estimated transfer time: ${journey.totalDurationText}
- Estimated trip budget: ${budgetEstimate.totalLabel} total (~${budgetEstimate.perPersonLabel} per person)

Planning rules:
${buildAiPlanningRules({ preferences, route, budgetEstimate, journey })}

Preference digest:
${JSON.stringify(buildPreferenceDigest(preferences, budgetEstimate))}

Weather:
${JSON.stringify(compactWeather)}

Candidate places:
${JSON.stringify(compactPlaces)}
`;

  const aiResponse = await aiRequester({
    prompt,
    maxTokens,
    temperature: 0.1,
  });

  if (!aiResponse?.ok || !aiResponse.content) {
    return {
      ...fallbackPlan,
      _generation: {
        ...(aiResponse?.generation || fallbackPlan._generation),
      },
    };
  }

  const parsed = extractJson(aiResponse.content);
  const normalized = normalizeAiJson(parsed, fallbackPlan.days, stopLimit);
  if (!normalized?.days?.length) return fallbackPlan;

  return {
    ...normalized,
    _generation: {
      ...(aiResponse.generation || {}),
    },
  };
};

export const buildTripPlanOnServer = async ({ preferences, aiRequester, onProgress }) => {
  const buildStartedAt = Date.now();
  onProgress?.('origin');
  const [origin, destination] = await Promise.all([
    withTimeout(resolvePlace(preferences.originText), 3500),
    (async () => {
      onProgress?.('destination');
      return withTimeout(resolvePlace(preferences.destinationText), 3500);
    })(),
  ]);

  onProgress?.('route');
  const routePromise = withTimeout(getRoute(origin, destination), 6000, () => buildApproxRoute(origin, destination));
  onProgress?.('places');
  const placesPromise = withTimeout(
    getNearbyPlaces(destination, preferences),
    5000,
    () => expandPlacesWithNearbyCities({
      destination,
      preferences,
      places: buildCuratedFallbackPlaces(destination),
    })
  );
  onProgress?.('weather');
  const weatherPromise = withTimeout(getWeatherForecast(destination, preferences.fromDate, preferences.toDate), 4000, []);

  const [route, places, weather] = await Promise.all([routePromise, placesPromise, weatherPromise]);
  const rankedPlaces = sortPlacesForPreferences(places, preferences);

  onProgress?.('budget');
  const journey = await buildJourneyPlan({ origin, destination, route, preferences });
  const budgetEstimate = estimateBudget({ route, preferences, journey });

  onProgress?.('ai');
  const aiPlan = await withTimeout(
    generateItinerary({
      origin,
      destination,
      route,
      places: rankedPlaces,
      weather,
      preferences,
      budgetEstimate,
      journey,
      aiRequester,
    }),
    AI_PLANNER_TIMEOUT_MS,
    () => buildFallbackItinerary({ destination, preferences, places: rankedPlaces, weather, route, journey })
  );

  const enrichedDays = (aiPlan.days || []).map((day) => ({
    ...day,
    stops: (day.stops || []).map((stop) => {
      const matchingPlace = rankedPlaces.find((place) => normalizeSearchText(place.name) === normalizeSearchText(stop.name));
      return {
        ...stop,
        address: matchingPlace?.address || stop.address || '',
        lat: matchingPlace?.lat || null,
        lon: matchingPlace?.lon || null,
      };
    }),
  }));

  return {
    createdAt: new Date().toISOString(),
    preferences,
    origin,
    destination,
    route,
    journey,
    places: rankedPlaces,
    weather,
    budgetEstimate,
    generation: {
      ...(aiPlan._generation || {
        providerName: 'fallback_dataset',
        providerSlot: 'fallback',
        wasFallbackUsed: true,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
      }),
      generationTimeMs: Date.now() - buildStartedAt,
    },
    ai: {
      overview: aiPlan.overview,
      tips: aiPlan.tips || [],
      days: enrichedDays,
    },
  };
};
