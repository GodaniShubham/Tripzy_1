import { isPlannerApiConfigured } from './plannerApi';
import { staticDestinationPlaceSets } from './staticDestinationPlaces';

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

const GEO_BASE = 'https://api.geoapify.com';
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
const TOTAL_READY_LIMIT_MS = 20000;
const TIME_BUDGET = {
  geocode: 3500,
  route: 6000,
  places: 5000,
  weather: 4000,
  ai: 4500,
};

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
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snowfall',
  73: 'Snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Strong rain showers',
  82: 'Intense rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

const budgetProfiles = {
  Budget: {
    stayPerNight: 1200,
    foodPerDay: 550,
    localTravelPerDay: 300,
    activityPerDay: 250,
  },
  Medium: {
    stayPerNight: 2800,
    foodPerDay: 1100,
    localTravelPerDay: 700,
    activityPerDay: 650,
  },
  Luxury: {
    stayPerNight: 7000,
    foodPerDay: 2500,
    localTravelPerDay: 1800,
    activityPerDay: 1600,
  },
};

const budgetRanges = {
  Budget: { min: 5000, max: 15000 },
  Medium: { min: 15000, max: 40000 },
  Luxury: { min: 40000, max: null },
};

const travelModePreferenceLabels = {
  Smart: 'Smart',
  Road: 'Road',
  Train: 'Train',
  Flight: 'Flight',
};

const tripTypeThemes = {
  Relaxed: 'Slow scenic exploration with relaxed pacing',
  Adventure: 'Action-heavy exploration focused on movement and scenic energy',
  Cultural: 'Culture-first journey through landmarks, heritage, and local life',
  Romantic: 'Scenic and memorable experiences with sunset, food, and quiet moments',
};

const interestCategoryMap = {
  Nature: ['natural', 'leisure.park'],
  Food: ['catering'],
  Adventure: ['natural', 'activity'],
  History: ['tourism.sights', 'entertainment.museum', 'entertainment.culture'],
  Shopping: ['commercial'],
  Wellness: ['leisure.spa', 'leisure.park'],
};

const interestPlaceKeywordMap = {
  Nature: ['nature', 'park', 'garden', 'wildlife', 'waterfall', 'lake', 'beach', 'island', 'valley', 'mountain'],
  Food: ['food', 'market', 'restaurant', 'cafe', 'bazaar', 'catering'],
  Adventure: ['adventure', 'activity', 'viewpoint', 'gondola', 'mountain pass', 'trek', 'rafting', 'waterfall', 'valley'],
  History: ['heritage', 'historical', 'museum', 'fort', 'monument', 'palace', 'temple', 'church'],
  Shopping: ['market', 'shopping', 'commercial', 'bazaar'],
  Wellness: ['wellness', 'spa', 'park', 'ashram', 'yoga', 'garden'],
};

const travelStyleKeywordMap = {
  Relaxed: ['lake', 'garden', 'park', 'riverfront', 'beach', 'market', 'cafe', 'island', 'wellness'],
  Adventure: ['adventure', 'viewpoint', 'mountain', 'valley', 'waterfall', 'gondola', 'trek', 'rafting', 'pass'],
  Cultural: ['heritage', 'museum', 'culture', 'historical', 'fort', 'palace', 'temple', 'church', 'monument'],
  Food: ['food', 'street food', 'market', 'restaurant', 'cafe', 'bazaar'],
};

const tripStyleKeywordMap = {
  Relaxed: ['lake', 'garden', 'park', 'riverfront', 'market', 'beach', 'wellness'],
  Adventure: ['adventure', 'viewpoint', 'mountain', 'valley', 'waterfall', 'gondola', 'pass'],
  Cultural: ['heritage', 'historical', 'museum', 'fort', 'palace', 'temple', 'culture', 'monument'],
  Romantic: ['lake', 'garden', 'viewpoint', 'palace', 'island', 'sunset', 'beach'],
};

const travelStyleDescriptions = {
  Relaxed: 'easy pace, scenic spots, low-rush movement, calmer experiences',
  Adventure: 'active movement, scenic thrills, outdoor-heavy experiences',
  Cultural: 'heritage-led sightseeing, museums, monuments, local culture',
  Food: 'food-first exploration, cafes, markets, signature local eating spots',
};

const tripStyleDescriptions = {
  Relaxed: 'easy-going overall itinerary with breathing room',
  Adventure: 'action-heavy overall structure with energetic stops',
  Cultural: 'sightseeing-first structure focused on heritage and stories',
  Romantic: 'couple-friendly, scenic, memorable experiences with softer pacing',
};

const fallbackPlaceCatalog = [
  { name: 'Ahmedabad', formatted: 'Ahmedabad, Gujarat, India', lat: 23.0225, lon: 72.5714, state: 'Gujarat', country: 'India', aliases: ['amdavad'] },
  { name: 'Gandhinagar', formatted: 'Gandhinagar, Gujarat, India', lat: 23.2156, lon: 72.6369, state: 'Gujarat', country: 'India', aliases: ['gandhi nagar', 'ghandhi nagar', 'gandhi nagar gujarat'] },
  { name: 'Surat', formatted: 'Surat, Gujarat, India', lat: 21.1702, lon: 72.8311, state: 'Gujarat', country: 'India', aliases: ['surat city'] },
  { name: 'Vadodara', formatted: 'Vadodara, Gujarat, India', lat: 22.3072, lon: 73.1812, state: 'Gujarat', country: 'India', aliases: ['baroda'] },
  { name: 'Rajkot', formatted: 'Rajkot, Gujarat, India', lat: 22.3039, lon: 70.8022, state: 'Gujarat', country: 'India' },
  { name: 'Bhavnagar', formatted: 'Bhavnagar, Gujarat, India', lat: 21.7645, lon: 72.1519, state: 'Gujarat', country: 'India' },
  { name: 'Jamnagar', formatted: 'Jamnagar, Gujarat, India', lat: 22.4707, lon: 70.0577, state: 'Gujarat', country: 'India' },
  { name: 'Bhuj', formatted: 'Bhuj, Kutch, Gujarat, India', lat: 23.242, lon: 69.6669, state: 'Gujarat', country: 'India', aliases: ['kutch'] },
  { name: 'Dwarka', formatted: 'Dwarka, Gujarat, India', lat: 22.2442, lon: 68.9685, state: 'Gujarat', country: 'India' },
  { name: 'Somnath', formatted: 'Somnath, Gujarat, India', lat: 20.888, lon: 70.4012, state: 'Gujarat', country: 'India', aliases: ['veraval somnath'] },
  { name: 'Anand', formatted: 'Anand, Gujarat, India', lat: 22.5645, lon: 72.9289, state: 'Gujarat', country: 'India' },
  { name: 'Nadiad', formatted: 'Nadiad, Gujarat, India', lat: 22.6916, lon: 72.8634, state: 'Gujarat', country: 'India' },
  { name: 'Mehsana', formatted: 'Mehsana, Gujarat, India', lat: 23.588, lon: 72.3693, state: 'Gujarat', country: 'India' },
  { name: 'Navsari', formatted: 'Navsari, Gujarat, India', lat: 20.9467, lon: 72.952, state: 'Gujarat', country: 'India' },
  { name: 'Satellite', formatted: 'Satellite, Ahmedabad, Gujarat, India', lat: 23.0273, lon: 72.5267, state: 'Gujarat', country: 'India', aliases: ['satellite ahmedabad'] },
  { name: 'Vastrapur', formatted: 'Vastrapur, Ahmedabad, Gujarat, India', lat: 23.0395, lon: 72.5293, state: 'Gujarat', country: 'India', aliases: ['vastrapur ahmedabad'] },
  { name: 'Bopal', formatted: 'Bopal, Ahmedabad, Gujarat, India', lat: 23.0338, lon: 72.4636, state: 'Gujarat', country: 'India', aliases: ['south bopal'] },
  { name: 'Gota', formatted: 'Gota, Ahmedabad, Gujarat, India', lat: 23.1117, lon: 72.5417, state: 'Gujarat', country: 'India', aliases: ['gota ahmedabad'] },
  { name: 'Prahlad Nagar', formatted: 'Prahlad Nagar, Ahmedabad, Gujarat, India', lat: 23.0105, lon: 72.5102, state: 'Gujarat', country: 'India', aliases: ['prahladnagar'] },
  { name: 'Adajan', formatted: 'Adajan, Surat, Gujarat, India', lat: 21.1959, lon: 72.7945, state: 'Gujarat', country: 'India', aliases: ['adajan surat'] },
  { name: 'Vesu', formatted: 'Vesu, Surat, Gujarat, India', lat: 21.1514, lon: 72.7812, state: 'Gujarat', country: 'India', aliases: ['vesu surat'] },
  { name: 'Piplod', formatted: 'Piplod, Surat, Gujarat, India', lat: 21.1588, lon: 72.7707, state: 'Gujarat', country: 'India', aliases: ['piplod surat'] },
  { name: 'Pal', formatted: 'Pal, Surat, Gujarat, India', lat: 21.1902, lon: 72.7636, state: 'Gujarat', country: 'India', aliases: ['pal surat'] },
  { name: 'Athwa', formatted: 'Athwa, Surat, Gujarat, India', lat: 21.1861, lon: 72.8046, state: 'Gujarat', country: 'India', aliases: ['athwalines', 'athwa surat'] },
  { name: 'Infocity', formatted: 'Infocity, Gandhinagar, Gujarat, India', lat: 23.1938, lon: 72.6367, state: 'Gujarat', country: 'India', aliases: ['infocity gandhinagar'] },
  { name: 'Sector 21', formatted: 'Sector 21, Gandhinagar, Gujarat, India', lat: 23.2344, lon: 72.6461, state: 'Gujarat', country: 'India', aliases: ['sector 21 gandhinagar'] },
  { name: 'Jaipur', formatted: 'Jaipur, Rajasthan, India', lat: 26.9124, lon: 75.7873, state: 'Rajasthan', country: 'India' },
  { name: 'Rishikesh', formatted: 'Rishikesh, Uttarakhand, India', lat: 30.0869, lon: 78.2676, state: 'Uttarakhand', country: 'India' },
  { name: 'New Delhi', formatted: 'New Delhi, Delhi, India', lat: 28.6139, lon: 77.209, state: 'Delhi', country: 'India', aliases: ['delhi'] },
  { name: 'Mumbai', formatted: 'Mumbai, Maharashtra, India', lat: 19.076, lon: 72.8777, state: 'Maharashtra', country: 'India', aliases: ['bombay'] },
  { name: 'Bengaluru', formatted: 'Bengaluru, Karnataka, India', lat: 12.9716, lon: 77.5946, state: 'Karnataka', country: 'India', aliases: ['bangalore'] },
  { name: 'Hyderabad', formatted: 'Hyderabad, Telangana, India', lat: 17.385, lon: 78.4867, state: 'Telangana', country: 'India' },
  { name: 'Chennai', formatted: 'Chennai, Tamil Nadu, India', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu', country: 'India', aliases: ['madras'] },
  { name: 'Kolkata', formatted: 'Kolkata, West Bengal, India', lat: 22.5726, lon: 88.3639, state: 'West Bengal', country: 'India', aliases: ['calcutta'] },
  { name: 'Pune', formatted: 'Pune, Maharashtra, India', lat: 18.5204, lon: 73.8567, state: 'Maharashtra', country: 'India' },
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
  { name: 'Andaman and Nicobar Islands', formatted: 'Andaman and Nicobar Islands, India', lat: 11.7401, lon: 92.6586, state: 'Andaman and Nicobar Islands', country: 'India', aliases: ['andaman', 'nicobar'] },
  { name: 'Port Blair', formatted: 'Port Blair, Andaman and Nicobar Islands, India', lat: 11.6234, lon: 92.7265, state: 'Andaman and Nicobar Islands', country: 'India' },
  { name: 'Havelock Island', formatted: 'Swaraj Dweep (Havelock Island), Andaman and Nicobar Islands, India', lat: 11.9659, lon: 92.9956, state: 'Andaman and Nicobar Islands', country: 'India', aliases: ['swaraj dweep'] },
  { name: 'Jammu and Kashmir', formatted: 'Jammu and Kashmir, India', lat: 33.7782, lon: 76.5762, state: 'Jammu and Kashmir', country: 'India', aliases: ['j and k', 'jk', 'jammu kashmir', 'kashmir', 'kashmir valley'] },
  { name: 'Srinagar', formatted: 'Srinagar, Jammu and Kashmir, India', lat: 34.0837, lon: 74.7973, state: 'Jammu and Kashmir', country: 'India', aliases: ['srinagar kashmir'] },
  { name: 'Gulmarg', formatted: 'Gulmarg, Jammu and Kashmir, India', lat: 34.0484, lon: 74.3805, state: 'Jammu and Kashmir', country: 'India' },
  { name: 'Pahalgam', formatted: 'Pahalgam, Jammu and Kashmir, India', lat: 34.0159, lon: 75.3188, state: 'Jammu and Kashmir', country: 'India' },
  { name: 'Kargil', formatted: 'Kargil, Ladakh, India', lat: 34.5539, lon: 76.1349, state: 'Ladakh', country: 'India' },
  { name: 'Lakshadweep', formatted: 'Lakshadweep, India', lat: 10.328, lon: 72.7846, state: 'Lakshadweep', country: 'India' },
  { name: 'Kavaratti', formatted: 'Kavaratti, Lakshadweep, India', lat: 10.5667, lon: 72.6167, state: 'Lakshadweep', country: 'India' },
  {
    name: 'PoK',
    formatted: 'PoK, Kashmir region (India claim context)',
    lat: 34.3637,
    lon: 73.4711,
    state: 'Kashmir region',
    country: 'India claim context',
    aliasesExact: ['pok', 'pojk', 'pakistan occupied kashmir', 'pakistan occupied jammu and kashmir', 'pakistan-administered kashmir'],
  },
  {
    name: 'Muzaffarabad',
    formatted: 'Muzaffarabad, Kashmir region (India claim context)',
    lat: 34.3706,
    lon: 73.4721,
    state: 'Kashmir region',
    country: 'India claim context',
    aliasesExact: ['muzaffarabad'],
  },
  {
    name: 'Gilgit-Baltistan',
    formatted: 'Gilgit-Baltistan, Kashmir region (India claim context)',
    lat: 35.8026,
    lon: 74.9832,
    state: 'Kashmir region',
    country: 'India claim context',
    aliasesExact: ['gilgit baltistan', 'gilgit-baltistan', 'gilgit'],
  },
];

const transitHubNameCatalog = {
  ahmedabad: {
    bus: 'Geeta Mandir Bus Stand',
    rail: 'Ahmedabad Junction',
    air: 'Sardar Vallabhbhai Patel Airport',
  },
  jaipur: {
    bus: 'Sindhi Camp Bus Stand',
    rail: 'Jaipur Junction',
    air: 'Jaipur International Airport',
  },
  rishikesh: {
    bus: 'Rishikesh Bus Stand',
    rail: 'Yog Nagari Rishikesh',
    air: 'Jolly Grant Airport',
  },
  'new delhi': {
    bus: 'Kashmere Gate ISBT',
    rail: 'New Delhi Railway Station',
    air: 'Indira Gandhi International Airport',
  },
  mumbai: {
    bus: 'Mumbai Central Bus Depot',
    rail: 'Mumbai Central',
    air: 'Chhatrapati Shivaji Maharaj Airport',
  },
  bengaluru: {
    bus: 'Kempegowda Bus Station',
    rail: 'KSR Bengaluru City Junction',
    air: 'Kempegowda International Airport',
  },
  hyderabad: {
    bus: 'MGBS Bus Station',
    rail: 'Secunderabad Junction',
    air: 'Rajiv Gandhi International Airport',
  },
  chennai: {
    bus: 'CMBT Bus Terminus',
    rail: 'Chennai Central',
    air: 'Chennai International Airport',
  },
  kolkata: {
    bus: 'Esplanade Bus Terminus',
    rail: 'Howrah Junction',
    air: 'Netaji Subhas Chandra Bose Airport',
  },
  pune: {
    bus: 'Swargate Bus Stand',
    rail: 'Pune Junction',
    air: 'Pune Airport',
  },
  goa: {
    bus: 'Panjim Bus Stand',
    rail: 'Madgaon Junction',
    air: 'Dabolim Airport',
  },
  manali: {
    bus: 'Manali Bus Depot',
    rail: 'Joginder Nagar Rail Link',
    air: 'Kullu Manali Airport',
  },
  shimla: {
    bus: 'Shimla Old ISBT',
    rail: 'Shimla Railway Station',
    air: 'Shimla Airport',
  },
  varanasi: {
    bus: 'Varanasi Bus Stand',
    rail: 'Varanasi Junction',
    air: 'Lal Bahadur Shastri Airport',
  },
  udaipur: {
    bus: 'Udaipur Bus Stand',
    rail: 'Udaipur City Railway Station',
    air: 'Maharana Pratap Airport',
  },
  agra: {
    bus: 'Idgah Bus Stand',
    rail: 'Agra Cantt',
    air: 'Agra Airport',
  },
  kerala: {
    bus: 'KSRTC Bus Terminal',
    rail: 'Ernakulam Junction',
    air: 'Cochin International Airport',
  },
  darjeeling: {
    bus: 'Darjeeling Bus Stand',
    rail: 'New Jalpaiguri Rail Link',
    air: 'Bagdogra Airport',
  },
  'andaman and nicobar islands': {
    bus: 'Port Blair Bus Stand',
    rail: 'Port Blair Ferry Link',
    air: 'Veer Savarkar Airport',
  },
  'port blair': {
    bus: 'Port Blair Bus Stand',
    rail: 'Port Blair Ferry Link',
    air: 'Veer Savarkar Airport',
  },
  'jammu and kashmir': {
    bus: 'Jammu Bus Stand',
    rail: 'Jammu Tawi',
    air: 'Srinagar Airport',
  },
  srinagar: {
    bus: 'Srinagar Bus Station',
    rail: 'Srinagar Rail Link',
    air: 'Srinagar Airport',
  },
  gulmarg: {
    bus: 'Tangmarg Bus Link',
    rail: 'Srinagar Rail Link',
    air: 'Srinagar Airport',
  },
  pahalgam: {
    bus: 'Pahalgam Bus Stand',
    rail: 'Srinagar Rail Link',
    air: 'Srinagar Airport',
  },
  'leh ladakh': {
    bus: 'Leh Bus Stand',
    rail: 'Jammu Rail Link',
    air: 'Kushok Bakula Rimpochee Airport',
  },
  kargil: {
    bus: 'Kargil Bus Stand',
    rail: 'Jammu Rail Link',
    air: 'Kushok Bakula Rimpochee Airport',
  },
  lakshadweep: {
    bus: 'Kavaratti Jetty Transfer',
    rail: 'Kavaratti Ferry Link',
    air: 'Agatti Airport',
  },
  kavaratti: {
    bus: 'Kavaratti Jetty Transfer',
    rail: 'Kavaratti Ferry Link',
    air: 'Agatti Airport',
  },
  pok: {
    bus: 'Muzaffarabad Bus Link',
    rail: 'Islamabad Rail Link',
    air: 'Muzaffarabad Airport',
  },
  muzaffarabad: {
    bus: 'Muzaffarabad Bus Link',
    rail: 'Islamabad Rail Link',
    air: 'Muzaffarabad Airport',
  },
  'gilgit baltistan': {
    bus: 'Gilgit Bus Stand',
    rail: 'Rawalpindi Rail Link',
    air: 'Gilgit Airport',
  },
  amritsar: {
    bus: 'Amritsar Bus Stand',
    rail: 'Amritsar Junction',
    air: 'Sri Guru Ram Dass Jee Airport',
  },
};

const syntheticHubOffsets = {
  bus: [0.028, 0.024],
  rail: [-0.016, 0.019],
  air: [0.072, -0.061],
  road: [0.012, 0.01],
};

let indiaFallbackCatalogPromise = null;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDistance = (meters = 0) => `${(meters / 1000).toFixed(1)} km`;

const normalizeSearchText = (value = '') =>
  value.toLowerCase().replace(/[^a-z0-9,\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const getTravelerCount = (travelers = '1') => {
  if (travelers === '3-5') return 4;
  if (travelers === '6+') return 6;
  if (travelers === '5+') return 5;

  const parsed = Number.parseInt(String(travelers), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getTravelerLabel = (travelers = '1') => {
  const count = getTravelerCount(travelers);
  return count === 1 ? '1 traveler' : `${count} travelers`;
};

const getStopsPerDay = (pace = 'Moderate', travelers = '1') => {
  const baseStops = pace === 'Slow' ? 3 : pace === 'Fast' ? 6 : 5;
  const travelerCount = getTravelerCount(travelers);

  if (travelerCount >= 5) return Math.max(2, baseStops - 2);
  if (travelerCount >= 3) return Math.max(2, baseStops - 1);
  return baseStops;
};

const getStopsPerDayLabel = (pace = 'Moderate') =>
  pace === 'Slow' ? '2 to 3' : pace === 'Fast' ? '6 or more' : '4 to 5';

const getTravelModePreferenceLabel = (travelMode = 'Smart') =>
  travelModePreferenceLabels[travelMode] || travelModePreferenceLabels.Smart;

const getTravelStyleDescription = (travelStyle = 'Relaxed') =>
  travelStyleDescriptions[travelStyle] || travelStyleDescriptions.Relaxed;

const getTripStyleDescription = (tripStyle = 'Relaxed') =>
  tripStyleDescriptions[tripStyle] || tripStyleDescriptions.Relaxed;

const buildInterestSummary = (interests = []) =>
  interests.length ? interests.join(', ') : 'general sightseeing';

const buildPreferenceDigest = (preferences, budgetEstimate) => [
  `Dates: ${preferences.fromDate} to ${preferences.toDate}`,
  `Budget: ${preferences.budget} (${budgetEstimate.selectedRangeLabel} per person)`,
  `Transfer mode: ${getTravelModePreferenceLabel(preferences.travelMode)}`,
  `Travel style: ${preferences.travelStyle}`,
  `Trip style: ${preferences.tripType}`,
  `Travelers: ${getTravelerCount(preferences.travelers)} people`,
  `Pace: ${preferences.pace}`,
  `Interests: ${buildInterestSummary(preferences.interests)}`,
];

const scoreKeywordMatches = (text, keywords = []) =>
  keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);

const isOneEditAway = (source = '', target = '') => {
  const a = source.replace(/\s+/g, '');
  const b = target.replace(/\s+/g, '');
  const lengthDiff = Math.abs(a.length - b.length);

  if (!a || !b || lengthDiff > 1) return false;
  if (a === b) return true;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < a.length || j < b.length) {
    edits += 1;
  }

  return edits <= 1;
};

const formatDuration = (seconds = 0) => {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
};

const estimateTokenCount = (value = '') =>
  Math.max(0, Math.round(String(value || '').trim().length / 4));

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}): ${errorText}`);
  }
  return response.json();
};

const withTimeout = (promise, ms, fallbackValue) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue);
        return;
      }
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        if (fallbackValue !== undefined) {
          resolve(typeof fallbackValue === 'function' ? fallbackValue(error) : fallbackValue);
          return;
        }
        reject(error);
      });
  });

const getRemainingBudget = (startedAt, reserveMs = 1200) =>
  Math.max(1500, TOTAL_READY_LIMIT_MS - (Date.now() - startedAt) - reserveMs);

const reportRuntimeConfig = () => {
  if (!GEOAPIFY_API_KEY) {
    console.warn('Geoapify API key is missing. Using local place fallback data.');
  }
};

const normalizeGeocodeResult = (result) => ({
  placeId: result.place_id || result.rank?.place_id || result.result_type || result.formatted,
  name: result.city || result.town || result.village || result.county || result.state || result.name || result.formatted,
  formatted: result.formatted || result.address_line1 || result.address_line2 || result.name,
  lat: Number(result.lat),
  lon: Number(result.lon),
  city: result.city || result.town || result.village || result.county || result.state,
  state: result.state,
  country: result.country,
  countryCode: result.country_code,
  timezone: result.timezone?.name || result.timezone,
});

const normalizePlaceFeature = (feature) => {
  const props = feature.properties || {};
  return {
    id: props.place_id || props.datasource?.raw?.osm_id || props.name,
    name: props.name || props.address_line1 || props.formatted || 'Unnamed place',
    address: props.formatted || props.address_line2 || props.address_line1 || '',
    lat: Number(feature.geometry?.coordinates?.[1] ?? props.lat),
    lon: Number(feature.geometry?.coordinates?.[0] ?? props.lon),
    categories: props.categories || [],
    categoryLabel: props.categories?.[0]?.split('.').slice(-1)[0]?.replace(/_/g, ' ') || 'attraction',
    distanceMeters: props.distance || 0,
  };
};

const normalizeRouteLine = (coordinates = []) => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];

  if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === 'number') {
    return coordinates
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map(([lon, lat]) => [lat, lon]);
  }

  return coordinates.flatMap((segment) =>
    Array.isArray(segment)
      ? segment
          .filter((point) => Array.isArray(point) && point.length >= 2)
          .map(([lon, lat]) => [lat, lon])
      : []
  );
};

const uniqueByName = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.name}|${item.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const uniqueStopsByName = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeSearchText(item?.name || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toTitleCase = (value = '') =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildDayThemeFromStops = (destination, stops, dayIndex, totalDays) => {
  const uniqueTypes = [...new Set((stops || []).map((stop) => stop.type).filter(Boolean))];
  const primaryType = toTitleCase((uniqueTypes[0] || 'local highlights').replace(/-/g, ' '));
  const secondaryType = uniqueTypes[1] ? toTitleCase(uniqueTypes[1].replace(/-/g, ' ')) : '';

  if (dayIndex === 0) {
    return `Arrival and ${primaryType}`;
  }

  if (dayIndex === totalDays - 1) {
    return secondaryType ? `${primaryType} and ${secondaryType} wrap-up` : `${primaryType} wrap-up`;
  }

  return secondaryType ? `${primaryType} and ${secondaryType} trail` : `${primaryType} highlights`;
};

const buildDaySummaryFromStops = (destination, stops, preferences) => {
  const stopNames = (stops || []).slice(0, 3).map((stop) => stop.name).filter(Boolean);
  if (!stopNames.length) {
    return `Explore ${destination.name} with a ${preferences.tripType.toLowerCase()} itinerary shaped around your ${preferences.travelStyle.toLowerCase()} travel style.`;
  }

  if (stopNames.length === 1) {
    return `Spend the day around ${stopNames[0]} and nearby areas in ${destination.name} with a ${preferences.pace.toLowerCase()} pace and a ${preferences.travelStyle.toLowerCase()} mood.`;
  }

  const finalName = stopNames[stopNames.length - 1];
  const leadingNames = stopNames.slice(0, -1).join(', ');
  return `Cover ${leadingNames} and ${finalName} around ${destination.name} in a ${preferences.tripType.toLowerCase()} flow with a ${preferences.travelStyle.toLowerCase()} feel.`;
};

const buildCatalogSearchResults = (catalog, text, limit = 5) => {
  const query = normalizeSearchText(text);
  if (!query) return [];

  return catalog
    .map((place) => {
      const searchPool = [place.name, place.formatted, ...(place.aliases || [])]
        .map((value) => normalizeSearchText(value))
        .filter(Boolean);
      const exactSearchPool = (place.aliasesExact || [])
        .map((value) => normalizeSearchText(value))
        .filter(Boolean);

      let score = 0;
      searchPool.forEach((value) => {
        if (value === query) score = Math.max(score, 100);
        else if (value.startsWith(query)) score = Math.max(score, 80);
        else if (value.includes(query)) score = Math.max(score, 60);
        else if (query.split(' ').every((part) => value.includes(part))) score = Math.max(score, 40);
        else if (query.length >= 5 && isOneEditAway(value, query)) score = Math.max(score, 36);
      });

       exactSearchPool.forEach((value) => {
         if (value === query) score = Math.max(score, 110);
       });

      return score
        ? {
            score,
            place: {
              placeId: `fallback-${normalizeSearchText(place.name).replace(/\s+/g, '-')}`,
              name: place.name,
              formatted: place.formatted,
              lat: place.lat,
              lon: place.lon,
              city: place.name,
              state: place.state,
              country: place.country,
            },
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((match) => match.place);
};

const uniqueSearchResults = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${normalizeSearchText(item.name)}|${normalizeSearchText(item.formatted)}|${item.lat}|${item.lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const loadIndiaFallbackCatalog = async () => {
  if (!indiaFallbackCatalogPromise) {
    indiaFallbackCatalogPromise = fetch('/data/india-places.json')
      .then((response) => (response.ok ? response.json() : []))
      .catch((error) => {
        console.error('Failed to load local India places dataset', error);
        return [];
      });
  }

  return indiaFallbackCatalogPromise;
};

const buildFallbackSearchResults = async (text, limit = 5) => {
  const manualResults = buildCatalogSearchResults(fallbackPlaceCatalog, text, Math.max(limit * 2, 12));
  const indiaCatalog = await loadIndiaFallbackCatalog();
  const catalogResults = buildCatalogSearchResults(indiaCatalog, text, Math.max(limit * 4, 30));

  return uniqueSearchResults([...manualResults, ...catalogResults]).slice(0, limit);
};

export const searchPlaces = async (text, limit = 5) => {
  if (!text.trim()) return [];
  const fallbackResults = await buildFallbackSearchResults(text, limit);

  if (!GEOAPIFY_API_KEY) {
    return fallbackResults;
  }

  try {
    const url = new URL(`${GEO_BASE}/v1/geocode/search`);
    url.searchParams.set('text', text);
    url.searchParams.set('format', 'json');
    url.searchParams.set('type', 'locality');
    url.searchParams.set('filter', 'countrycode:in');
    url.searchParams.set('bias', 'countrycode:in');
    url.searchParams.set('lang', 'en');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('apiKey', GEOAPIFY_API_KEY);

    const data = await fetchJson(url.toString());
    const liveResults = (data.results || [])
      .map(normalizeGeocodeResult)
      .filter((result) => (result.countryCode || '').toLowerCase() === 'in');

    if (liveResults.length) {
      return liveResults;
    }
  } catch (error) {
    console.warn('Geoapify place search failed. Falling back to local city data.', error);
  }

  return fallbackResults;
};

export const resolvePlace = async (text) => {
  const results = await withTimeout(searchPlaces(text, 1), TIME_BUDGET.geocode);
  if (!results.length) {
    throw new Error('Please choose a city or region in India.');
  }
  return results[0];
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
    toll: false,
    ferry: false,
    line: [
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
    ],
  };
};

export const getRoute = async (origin, destination) => {
  if (!GEOAPIFY_API_KEY) {
    return buildApproxRoute(origin, destination);
  }

  const url = new URL(`${GEO_BASE}/v1/routing`);
  url.searchParams.set('waypoints', `${origin.lat},${origin.lon}|${destination.lat},${destination.lon}`);
  url.searchParams.set('mode', 'drive');
  url.searchParams.set('traffic', 'approximated');
  url.searchParams.set('apiKey', GEOAPIFY_API_KEY);

  const data = await fetchJson(url.toString());
  const feature = data.features?.[0];

  if (!feature) {
    throw new Error('Unable to calculate route');
  }

  const coordinates = normalizeRouteLine(feature.geometry?.coordinates);

  return {
    distanceMeters: feature.properties?.distance || 0,
    distanceKm: (feature.properties?.distance || 0) / 1000,
    durationSeconds: feature.properties?.time || 0,
    durationText: formatDuration(feature.properties?.time || 0),
    toll: Boolean(feature.properties?.toll),
    ferry: Boolean(feature.properties?.ferry),
    line: coordinates,
  };
};

const buildCategoryList = (preferences) => {
  const categories = new Set(['tourism', 'tourism.sights', 'tourism.attraction', 'entertainment.museum']);

  (preferences.interests || []).forEach((interest) => {
    (interestCategoryMap[interest] || []).forEach((category) => categories.add(category));
  });

  if (preferences.travelStyle === 'Adventure' || preferences.tripType === 'Adventure') {
    categories.add('natural');
    categories.add('activity');
  }

  if (preferences.travelStyle === 'Relaxed' || preferences.tripType === 'Relaxed') {
    categories.add('leisure.park');
    categories.add('natural');
  }

  if (preferences.tripType === 'Romantic') {
    categories.add('tourism.attraction');
    categories.add('leisure.park.garden');
  }

  if (preferences.travelStyle === 'Cultural' || preferences.tripType === 'Cultural') {
    categories.add('entertainment.culture');
    categories.add('religion.place_of_worship');
  }

  if (preferences.travelStyle === 'Food') {
    categories.add('catering');
    categories.add('commercial.food_and_drink');
  }

  return [...categories].slice(0, 8);
};

const scorePlaceForPreferences = (place, preferences) => {
  const placeText = normalizeSearchText(
    [place.name, place.address, place.categoryLabel, ...(place.categories || [])].filter(Boolean).join(' ')
  );
  const distanceKm = (place.distanceMeters || 0) / 1000;
  let score = 0;

  (preferences.interests || []).forEach((interest) => {
    score += scoreKeywordMatches(placeText, interestPlaceKeywordMap[interest]) * 10;
  });

  score += scoreKeywordMatches(placeText, travelStyleKeywordMap[preferences.travelStyle] || []) * 12;
  score += scoreKeywordMatches(placeText, tripStyleKeywordMap[preferences.tripType] || []) * 11;

  const travelerCount = getTravelerCount(preferences.travelers);

  if (travelerCount === 2) {
    score += scoreKeywordMatches(placeText, ['lake', 'beach', 'garden', 'palace', 'viewpoint']) * 5;
  }

  if (travelerCount >= 3) {
    score += scoreKeywordMatches(placeText, ['park', 'market', 'beach', 'fort', 'museum', 'landmark']) * 4;
  }

  const paceDistanceFactor = preferences.pace === 'Slow' ? 1.5 : preferences.pace === 'Moderate' ? 1 : 0.65;
  const budgetDistanceFactor = preferences.budget === 'Budget' ? 1.1 : preferences.budget === 'Medium' ? 0.8 : 0.45;
  score -= distanceKm * (paceDistanceFactor + budgetDistanceFactor);

  return score;
};

const sortPlacesForPreferences = (places = [], preferences) =>
  [...places].sort((a, b) => {
    const scoreDiff = scorePlaceForPreferences(b, preferences) - scorePlaceForPreferences(a, preferences);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return (a.distanceMeters || 0) - (b.distanceMeters || 0);
  });

const buildAiPlanningRules = ({ preferences, route, budgetEstimate, journey }) => {
  const rules = [
    `Treat every selected preference from the preferences page as required, not optional.`,
    `Keep the plan aligned to this trip window: ${preferences.fromDate} to ${preferences.toDate}.`,
    `Use a ${preferences.pace.toLowerCase()} pace with about ${getStopsPerDay(preferences.pace, preferences.travelers)} practical stops per day for this group size.`,
    `Respect the ${preferences.budget.toLowerCase()} budget as a per-person budget, around ${budgetEstimate.perPersonLabel} per person and ${budgetEstimate.totalLabel} total.`,
    `Follow the requested transfer preference: ${getTravelModePreferenceLabel(preferences.travelMode).toLowerCase()}.`,
    `Make the plan suitable for ${getTravelerLabel(preferences.travelers).toLowerCase()} traveling together.`,
    `Choose stops, food breaks, and movement plans that stay practical for a group of ${getTravelerCount(preferences.travelers)} people.`,
    `Prioritize places that match these interests: ${buildInterestSummary(preferences.interests)}.`,
    `Reflect the requested travel style (${preferences.travelStyle}: ${getTravelStyleDescription(preferences.travelStyle)}) in the actual stop selection, not just in wording.`,
    `Reflect the requested trip style (${preferences.tripType}: ${getTripStyleDescription(preferences.tripType)}) in the overall structure, themes, and type of places chosen.`,
    `Keep arrival and transfer effort practical because the route is ${route.durationText} and the suggested travel chain is ${journey.summary}.`,
    `If any stop idea conflicts with the selected budget, pace, traveler count, or interests, do not include it.`,
    `Avoid generic plans: the difference between Relaxed, Adventure, Cultural, Food, and Romantic should be clearly visible from the chosen stops.`,
  ];

  return rules.map((rule) => `- ${rule}`).join('\n');
};

export const getNearbyPlaces = async (destination, preferences) => {
  const curatedPlaces = buildCuratedFallbackPlaces(destination);

  if (!GEOAPIFY_API_KEY) {
    return sortPlacesForPreferences(curatedPlaces, preferences);
  }

  const url = new URL(`${GEO_BASE}/v2/places`);
  const categories = buildCategoryList(preferences).join(',');

  url.searchParams.set('categories', categories);
  url.searchParams.set('filter', `circle:${destination.lon},${destination.lat},12000`);
  url.searchParams.set('bias', `proximity:${destination.lon},${destination.lat}`);
  url.searchParams.set('limit', '60');
  url.searchParams.set('apiKey', GEOAPIFY_API_KEY);

  const data = await fetchJson(url.toString());
  const places = uniqueByName([
    ...curatedPlaces,
    ...(data.features || []).map(normalizePlaceFeature),
  ])
    .filter((place) => place.name && place.lat && place.lon)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return sortPlacesForPreferences(places, preferences);
};

const matchStaticDestinationPlaceSet = (destination) => {
  const source = normalizeSearchText(
    [destination.name, destination.formatted, destination.state, destination.city]
      .filter(Boolean)
      .join(' ')
  );

  return (
    staticDestinationPlaceSets.find((set) =>
      set.aliases.some((alias) => source.includes(normalizeSearchText(alias)))
    ) || null
  );
};

const buildCuratedFallbackPlaces = (destination) => {
  const matchedSet = matchStaticDestinationPlaceSet(destination);

  if (!matchedSet) {
    return buildGenericFallbackPlaces(destination);
  }

  return matchedSet.places.map((place, index) => ({
    id: `${normalizeSearchText(destination.name).replace(/\s+/g, '-')}-${normalizeSearchText(place.name).replace(/\s+/g, '-')}`,
    name: place.name,
    address: place.address,
    lat: Number((destination.lat + place.latOffset).toFixed(6)),
    lon: Number((destination.lon + place.lonOffset).toFixed(6)),
    categories: [place.categoryLabel],
    categoryLabel: place.categoryLabel,
    distanceMeters: place.distanceMeters ?? (1200 + index * 1800),
  }));
};

const buildGenericFallbackPlaces = (destination) => ([
  {
    id: `${destination.name}-arrival`,
    name: `${destination.name} Arrival Point`,
    address: destination.formatted,
    lat: destination.lat,
    lon: destination.lon,
    categories: ['tourism'],
    categoryLabel: 'arrival',
    distanceMeters: 0,
  },
  {
    id: `${destination.name}-center`,
    name: `${destination.name} City Center`,
    address: destination.formatted,
    lat: destination.lat,
    lon: destination.lon,
    categories: ['tourism'],
    categoryLabel: 'local highlight',
    distanceMeters: 1200,
  },
  {
    id: `${destination.name}-market`,
    name: `${destination.name} Local Market`,
    address: destination.formatted,
    lat: destination.lat,
    lon: destination.lon,
    categories: ['commercial'],
    categoryLabel: 'market',
    distanceMeters: 2300,
  },
]);

export const getWeatherForecast = async (destination, fromDate, toDate) => {
  const url = new URL(WEATHER_BASE);
  url.searchParams.set('latitude', String(destination.lat));
  url.searchParams.set('longitude', String(destination.lon));
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  );
  url.searchParams.set('forecast_days', '16');
  url.searchParams.set('timezone', 'auto');

  const data = await fetchJson(url.toString());
  const daily = data.daily;

  if (!daily?.time?.length) {
    return [];
  }

  return daily.time
    .map((date, index) => ({
      date,
      max: daily.temperature_2m_max?.[index],
      min: daily.temperature_2m_min?.[index],
      rainChance: daily.precipitation_probability_max?.[index] ?? 0,
      weatherCode: daily.weather_code?.[index],
      summary: weatherCodeMap[daily.weather_code?.[index]] || 'Weather update unavailable',
    }))
    .filter((entry) => entry.date >= fromDate && entry.date <= toDate);
};

export const estimateBudget = ({ route, preferences, journey }) => {
  const profile = budgetProfiles[preferences.budget] || budgetProfiles.Medium;
  const budgetRange = budgetRanges[preferences.budget] || budgetRanges.Medium;
  const travelers = getTravelerCount(preferences.travelers);
  const nights = Math.max(1, preferences.days - 1);
  const rooms = travelers <= 2 ? 1 : Math.ceil(travelers / 2);

  let arrivalTravel = journey?.totalCost ?? 0;

  if (!arrivalTravel) {
    arrivalTravel = route.distanceKm < 250
      ? route.distanceKm * 4.5
      : route.distanceKm < 900
        ? 1000 + route.distanceKm * 1.9
        : 2800 + route.distanceKm * 1.2;

    arrivalTravel *= Math.max(1, Math.ceil(travelers / 2));
  }

  const stay = profile.stayPerNight * nights * rooms;
  const food = profile.foodPerDay * preferences.days * travelers;
  const localTravel = profile.localTravelPerDay * preferences.days;
  const activities = profile.activityPerDay * preferences.days * travelers;
  const total = Math.round(arrivalTravel + stay + food + localTravel + activities);
  const perPersonTotal = Math.round(total / travelers);
  const rangeLabel = budgetRange.max
    ? `${formatCurrency(budgetRange.min)} - ${formatCurrency(budgetRange.max)}`
    : `${formatCurrency(budgetRange.min)}+`;
  const totalRangeLabel = budgetRange.max
    ? `${formatCurrency(budgetRange.min * travelers)} - ${formatCurrency(budgetRange.max * travelers)}`
    : `${formatCurrency(budgetRange.min * travelers)}+`;
  const overBudgetBy = budgetRange.max ? Math.max(0, perPersonTotal - budgetRange.max) : 0;
  const budgetNote = overBudgetBy > 0
    ? `~${formatCurrency(perPersonTotal)} per person · ${formatCurrency(overBudgetBy)} above selected ${preferences.budget.toLowerCase()} range`
    : `~${formatCurrency(perPersonTotal)} per person · within selected ${preferences.budget.toLowerCase()} range`;

  return {
    total,
    totalLabel: formatCurrency(total),
    perPersonTotal,
    perPersonLabel: formatCurrency(perPersonTotal),
    selectedRangeLabel: rangeLabel,
    selectedTotalRangeLabel: totalRangeLabel,
    budgetNote,
    isWithinSelectedBudget: overBudgetBy === 0,
    arrivalTravel: Math.round(arrivalTravel),
    stay,
    food,
    localTravel,
    activities,
    breakdown: [
      { label: 'Travel to destination', value: formatCurrency(arrivalTravel) },
      { label: 'Stays', value: formatCurrency(stay) },
      { label: 'Food', value: formatCurrency(food) },
      { label: 'Local transport', value: formatCurrency(localTravel) },
      { label: 'Activities', value: formatCurrency(activities) },
    ],
  };
};

const getSupportedCityKey = (place) => {
  const exactMatch = buildCatalogSearchResults(
    fallbackPlaceCatalog,
    place.name || place.city || place.formatted || '',
    1
  )[0];
  return normalizeSearchText(exactMatch?.name || place.city || place.name || place.formatted || 'india');
};

const buildTransitHub = (place, hubType) => {
  const cityKey = getSupportedCityKey(place);
  const labelMap = transitHubNameCatalog[cityKey] || {};
  const [latOffset, lonOffset] = syntheticHubOffsets[hubType] || syntheticHubOffsets.road;

  return {
    name:
      labelMap[hubType] ||
      `${place.name} ${
        hubType === 'rail' ? 'Railway Station' : hubType === 'air' ? 'Airport' : hubType === 'bus' ? 'Bus Terminal' : 'Pickup Point'
      }`,
    lat: Number((place.lat + latOffset).toFixed(6)),
    lon: Number((place.lon + lonOffset).toFixed(6)),
    type: hubType,
  };
};

const buildCityStayPoint = (place, label) => ({
  name: label,
  lat: place.lat,
  lon: place.lon,
  type: 'stay',
});

const estimateModeLeg = ({ mode, distanceKm, travelers, budget }) => {
  const perTravelerMultiplier =
    budget === 'Luxury' ? 1.45 : budget === 'Medium' ? 1.15 : 1;

  const rules = {
    'Auto-rickshaw': { baseFare: 35, perKm: 14, speedKph: 18, bufferMinutes: 8, perTraveler: false },
    Cab: { baseFare: 90, perKm: 18, speedKph: 24, bufferMinutes: 8, perTraveler: false },
    Bus: { baseFare: 120, perKm: 1.7, speedKph: 46, bufferMinutes: 30, perTraveler: true },
    Train: { baseFare: 180, perKm: 1.35, speedKph: 62, bufferMinutes: 45, perTraveler: true },
    Flight: { baseFare: 2200, perKm: 3.9, speedKph: 520, bufferMinutes: 170, perTraveler: true },
    'Intercity Cab': { baseFare: 320, perKm: 11, speedKph: 58, bufferMinutes: 12, perTraveler: false },
  };

  const rule = rules[mode] || rules.Cab;
  const baseCost = rule.baseFare + distanceKm * rule.perKm;
  const cost = Math.round(baseCost * (rule.perTraveler ? travelers * perTravelerMultiplier : 1));
  const durationSeconds = Math.max(
    12 * 60,
    Math.round(((distanceKm / rule.speedKph) * 3600) + rule.bufferMinutes * 60)
  );

  return {
    cost,
    costLabel: formatCurrency(cost),
    durationSeconds,
    durationText: formatDuration(durationSeconds),
  };
};

const pickSmartTravelMode = ({ distanceKm, budget }) => {
  if (distanceKm <= 120) return 'Intercity Cab';
  if (distanceKm <= 420) return 'Bus';
  if (distanceKm <= 950) return budget === 'Budget' ? 'Bus' : 'Train';
  if (distanceKm <= 1500) return budget === 'Luxury' ? 'Flight' : 'Train';
  return budget === 'Luxury' ? 'Flight' : 'Train';
};

const pickPrimaryTravelMode = ({ distanceKm, preferences }) => {
  const requestedMode = preferences.travelMode || 'Smart';

  if (requestedMode === 'Road') {
    return distanceKm <= 120 ? 'Intercity Cab' : 'Bus';
  }

  if (requestedMode === 'Train') {
    return distanceKm <= 140 ? 'Intercity Cab' : 'Train';
  }

  if (requestedMode === 'Flight') {
    if (distanceKm <= 120) return 'Intercity Cab';
    if (distanceKm <= 350) return 'Bus';
    return 'Flight';
  }

  return pickSmartTravelMode({ distanceKm, budget: preferences.budget });
};

const getHubTypeForMode = (mode) => {
  if (mode === 'Bus') return 'bus';
  if (mode === 'Train') return 'rail';
  if (mode === 'Flight') return 'air';
  return 'road';
};

const buildJourneyLeg = ({ title, mode, from, to, travelers, budget, distanceKm, line, note }) => {
  const metrics = estimateModeLeg({ mode, distanceKm, travelers, budget });

  return {
    title,
    mode,
    fromLabel: from.name,
    toLabel: to.name,
    distanceKm: Number(distanceKm.toFixed(1)),
    durationSeconds: metrics.durationSeconds,
    durationText: metrics.durationText,
    cost: metrics.cost,
    costLabel: metrics.costLabel,
    note,
    line,
  };
};

const buildJourneyPlan = ({ origin, destination, route, preferences }) => {
  const travelers = getTravelerCount(preferences.travelers);
  const primaryMode = pickPrimaryTravelMode({ distanceKm: route.distanceKm, preferences });
  const hubType = getHubTypeForMode(primaryMode);
  const homePoint = buildCityStayPoint(origin, `Home in ${origin.name}`);
  const stayPoint = buildCityStayPoint(destination, `${destination.name} stay area`);

  if (primaryMode === 'Intercity Cab') {
    const pickupPoint = buildTransitHub(origin, 'road');
    const pickupDistanceKm = haversineDistance(homePoint, pickupPoint) / 1000;
    const directDistanceKm = route.distanceKm;

    const firstLeg = buildJourneyLeg({
      title: 'Leave home and meet your driver',
      mode: preferences.budget === 'Budget' ? 'Auto-rickshaw' : 'Cab',
      from: homePoint,
      to: pickupPoint,
      travelers,
      budget: preferences.budget,
      distanceKm: pickupDistanceKm,
      line: [
        [homePoint.lat, homePoint.lon],
        [pickupPoint.lat, pickupPoint.lon],
      ],
      note: 'Fast first-mile pickup from your home area.',
    });

    const mainLeg = buildJourneyLeg({
      title: `Drive from ${origin.name} to ${destination.name}`,
      mode: 'Intercity Cab',
      from: pickupPoint,
      to: stayPoint,
      travelers,
      budget: preferences.budget,
      distanceKm: directDistanceKm,
      line: route.line?.length ? route.line : [[pickupPoint.lat, pickupPoint.lon], [stayPoint.lat, stayPoint.lon]],
      note: 'Best for short intercity travel with door-to-door convenience.',
    });

    const totalCost = firstLeg.cost + mainLeg.cost;
    const totalDurationSeconds = firstLeg.durationSeconds + mainLeg.durationSeconds;

  return {
    primaryMode,
    requestedMode: getTravelModePreferenceLabel(preferences.travelMode),
    summary: `${firstLeg.mode} -> ${mainLeg.mode}`,
    totalCost,
    totalCostLabel: formatCurrency(totalCost),
      totalDurationSeconds,
      totalDurationText: formatDuration(totalDurationSeconds),
      legs: [firstLeg, mainLeg],
    };
  }

  const originHub = buildTransitHub(origin, hubType);
  const destinationHub = buildTransitHub(destination, hubType);
  const firstMileMode = primaryMode === 'Flight' && preferences.budget !== 'Budget' ? 'Cab' : 'Auto-rickshaw';
  const lastMileMode = primaryMode === 'Flight' ? 'Cab' : 'Auto-rickshaw';

  const firstLeg = buildJourneyLeg({
    title: `Leave home and reach ${originHub.name}`,
    mode: firstMileMode,
    from: homePoint,
    to: originHub,
    travelers,
    budget: preferences.budget,
    distanceKm: haversineDistance(homePoint, originHub) / 1000,
    line: [
      [homePoint.lat, homePoint.lon],
      [originHub.lat, originHub.lon],
    ],
    note: `First-mile transfer from your home area to the ${hubType === 'air' ? 'airport' : hubType === 'rail' ? 'rail station' : 'bus terminal'}.`,
  });

  const mainLeg = buildJourneyLeg({
    title: `${primaryMode} from ${originHub.name} to ${destinationHub.name}`,
    mode: primaryMode,
    from: originHub,
    to: destinationHub,
    travelers,
    budget: preferences.budget,
    distanceKm: route.distanceKm,
    line:
      primaryMode === 'Bus' && route.line?.length
        ? route.line
        : [
            [originHub.lat, originHub.lon],
            [destinationHub.lat, destinationHub.lon],
          ],
    note:
      primaryMode === 'Flight'
        ? 'Chosen to save time on a longer route.'
        : primaryMode === 'Train'
          ? 'Balanced option for comfort, budget, and overnight travel.'
          : 'Suitable road transfer for this route distance.',
  });

  const lastLeg = buildJourneyLeg({
    title: `Last-mile ride into ${destination.name}`,
    mode: lastMileMode,
    from: destinationHub,
    to: stayPoint,
    travelers,
    budget: preferences.budget,
    distanceKm: haversineDistance(destinationHub, stayPoint) / 1000,
    line: [
      [destinationHub.lat, destinationHub.lon],
      [stayPoint.lat, stayPoint.lon],
    ],
    note: 'Final short transfer from your arrival hub to your hotel area.',
  });

  const totalCost = firstLeg.cost + mainLeg.cost + lastLeg.cost;
  const totalDurationSeconds = firstLeg.durationSeconds + mainLeg.durationSeconds + lastLeg.durationSeconds;

  return {
    primaryMode,
    requestedMode: getTravelModePreferenceLabel(preferences.travelMode),
    summary: `${firstLeg.mode} -> ${mainLeg.mode} -> ${lastLeg.mode}`,
    totalCost,
    totalCostLabel: formatCurrency(totalCost),
    totalDurationSeconds,
    totalDurationText: formatDuration(totalDurationSeconds),
    legs: [firstLeg, mainLeg, lastLeg],
  };
};

const buildFallbackItinerary = ({ destination, preferences, places, weather, route }) => {
  const fallbackPlaces = uniqueByName(places.length ? places : buildCuratedFallbackPlaces(destination));
  const stopsPerDay = getStopsPerDay(preferences.pace, preferences.travelers);
  const days = Array.from({ length: preferences.days }).map((_, index) => {
    const date = new Date(preferences.fromDate);
    date.setDate(date.getDate() + index);

    const dayWeather = weather[index];
    const stops = Array.from({ length: Math.min(stopsPerDay, Math.max(1, fallbackPlaces.length)) })
      .map((_, stopIndex) => fallbackPlaces[(index * stopsPerDay + stopIndex) % fallbackPlaces.length])
      .filter(Boolean)
      .map((place, stopIndex) => ({
        name: place.name,
        type: place.categoryLabel,
        reason: `Chosen because it matches your ${preferences.travelStyle.toLowerCase()} travel style and ${preferences.tripType.toLowerCase()} trip style for ${destination.name}.`,
        duration: stopIndex === 0 ? '2 hrs' : stopIndex === 1 ? '1.5 hrs' : '1 hr',
        address: place.address,
        lat: place.lat,
        lon: place.lon,
      }));

    const dayTheme = buildDayThemeFromStops(destination, stops, index, preferences.days);
    const daySummary = buildDaySummaryFromStops(destination, stops, preferences);

    return {
      day: index + 1,
      date: date.toISOString().slice(0, 10),
      theme: dayTheme,
      summary: daySummary,
      weatherNote: dayWeather
        ? `${dayWeather.summary} with ${Math.round(dayWeather.max)}° / ${Math.round(dayWeather.min)}°.`
        : 'Check live weather before departure.',
      stops,
    };
  });

  return {
    overview: `${destination.name} works well for a ${preferences.days}-day ${preferences.tripType.toLowerCase()} trip from ${preferences.originText}. This plan is intentionally built around a ${preferences.travelStyle.toLowerCase()} travel style, a ${preferences.tripType.toLowerCase()} trip structure, ${preferences.pace.toLowerCase()} pace, ${preferences.budget.toLowerCase()} per-person budget, ${getTravelModePreferenceLabel(preferences.travelMode).toLowerCase()} transfer preference, group size of ${getTravelerCount(preferences.travelers)} people, and focus on ${buildInterestSummary(preferences.interests)}.`,
    tips: [
      `Plan for ${route.durationText} of travel from ${preferences.originText} to ${destination.name}.`,
      `Keep one light slot every day so the trip stays ${preferences.pace.toLowerCase()} and comfortable for ${getTravelerLabel(preferences.travelers).toLowerCase()}.`,
      `Prioritize ${buildInterestSummary(preferences.interests)} while keeping the budget close to the ${preferences.budget.toLowerCase()} per-person range.`,
      `The plan prefers ${getTravelModePreferenceLabel(preferences.travelMode).toLowerCase()} transfers and practical movement for ${getTravelerCount(preferences.travelers)} people.`,
      `${preferences.travelStyle} travel style and ${preferences.tripType} trip style should be visible in the kinds of stops chosen, not only in the wording.`,
      `Use the weather card to decide whether to keep outdoor stops in the morning or evening.`,
    ],
    days,
    _generation: {
      providerName: 'fallback_dataset',
      providerSlot: 'fallback',
      wasFallbackUsed: true,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
    },
  };
};

const extractJson = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    console.error('Failed to parse AI JSON output', error);
    return null;
  }
};

const normalizeGroqJson = (parsed, fallbackDays, stopLimit) => {
  if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) return null;

  const fallbackPool = uniqueStopsByName(fallbackDays.flatMap((day) => day.stops || []));
  const globallyUsedStops = new Set();
  const usedThemes = new Set();
  const usedSummaries = new Set();

  return {
    overview: typeof parsed.overview === 'string' ? parsed.overview : 'Your trip plan is ready.',
    tips: Array.isArray(parsed.tips) ? parsed.tips.filter((tip) => typeof tip === 'string').slice(0, 4) : [],
    days: parsed.days
      .slice(0, fallbackDays.length)
      .map((day, index) => {
        const fallbackDay = fallbackDays[index];
        const normalizedStops = Array.isArray(day.stops)
          ? day.stops
              .slice(0, stopLimit)
              .map((stop, stopIndex) => {
                  const fallbackStop = fallbackDay.stops[stopIndex] || fallbackDay.stops[0];
                  return {
                  name: typeof stop.name === 'string' ? stop.name : fallbackStop?.name,
                  type: typeof stop.type === 'string' ? stop.type : fallbackStop?.type || 'attraction',
                  reason: typeof stop.reason === 'string' ? stop.reason : fallbackStop?.reason || 'Included for a balanced day plan.',
                  duration: typeof stop.duration === 'string' ? stop.duration : fallbackStop?.duration || '1 hr',
                };
                })
              .filter((stop) => stop.name)
          : [...fallbackDay.stops];

        const selectedStops = [];
        const selectedNames = new Set();
        const addStopIfAvailable = (stop) => {
          const stopKey = normalizeSearchText(stop?.name || '');
          if (!stopKey || selectedNames.has(stopKey) || globallyUsedStops.has(stopKey)) return false;
          selectedStops.push(stop);
          selectedNames.add(stopKey);
          globallyUsedStops.add(stopKey);
          return true;
        };

        normalizedStops.forEach(addStopIfAvailable);
        (fallbackDay.stops || []).forEach((stop) => {
          if (selectedStops.length < stopLimit) {
            addStopIfAvailable(stop);
          }
        });
        fallbackPool.forEach((stop) => {
          if (selectedStops.length < stopLimit) {
            addStopIfAvailable(stop);
          }
        });

        if (selectedStops.length < stopLimit) {
          uniqueStopsByName([...normalizedStops, ...(fallbackDay.stops || []), ...fallbackPool]).forEach((stop) => {
            const stopKey = normalizeSearchText(stop?.name || '');
            if (!stopKey || selectedNames.has(stopKey) || selectedStops.length >= stopLimit) return;
            selectedStops.push(stop);
            selectedNames.add(stopKey);
          });
        }

        const fallbackTheme = fallbackDay.theme;
        const fallbackSummary = fallbackDay.summary;
        let finalTheme = typeof day.theme === 'string' ? day.theme : fallbackTheme;
        let finalSummary = typeof day.summary === 'string' ? day.summary : fallbackSummary;
        const themeKey = normalizeSearchText(finalTheme);
        const summaryKey = normalizeSearchText(finalSummary);

        if (!themeKey || usedThemes.has(themeKey)) {
          finalTheme = fallbackTheme;
        }

        if (!summaryKey || usedSummaries.has(summaryKey)) {
          finalSummary = fallbackSummary;
        }

        usedThemes.add(normalizeSearchText(finalTheme));
        usedSummaries.add(normalizeSearchText(finalSummary));

        return {
          day: Number(day.day) || fallbackDay.day,
          date: typeof day.date === 'string' ? day.date : fallbackDay.date,
          theme: finalTheme,
          summary: finalSummary,
          weatherNote: typeof day.weatherNote === 'string' ? day.weatherNote : fallbackDay.weatherNote,
          stops: selectedStops.slice(0, stopLimit),
        };
      }),
  };
};

export const generateItinerary = async ({ origin, destination, route, places, weather, preferences, budgetEstimate, journey }) => {
  const stopLimit = getStopsPerDay(preferences.pace, preferences.travelers);
  const fallbackPlan = buildFallbackItinerary({ destination, preferences, places, weather, route });
  return fallbackPlan;
};

export const buildTripPlan = async (preferences, onProgress) => {
  reportRuntimeConfig();
  const buildStartedAt = Date.now();

  onProgress?.('origin');
  const [origin, destination] = await Promise.all([
    withTimeout(resolvePlace(preferences.originText), Math.min(TIME_BUDGET.geocode, getRemainingBudget(buildStartedAt))),
    (async () => {
      onProgress?.('destination');
      return withTimeout(resolvePlace(preferences.destinationText), Math.min(TIME_BUDGET.geocode, getRemainingBudget(buildStartedAt)));
    })(),
  ]);

  onProgress?.('route');
  const routePromise = withTimeout(
    getRoute(origin, destination),
    Math.min(TIME_BUDGET.route, getRemainingBudget(buildStartedAt)),
    () => buildApproxRoute(origin, destination)
  );

  onProgress?.('places');
  const placesPromise = withTimeout(
    getNearbyPlaces(destination, preferences),
    Math.min(TIME_BUDGET.places, getRemainingBudget(buildStartedAt)),
    () => buildCuratedFallbackPlaces(destination)
  );

  onProgress?.('weather');
  const weatherPromise = withTimeout(
    getWeatherForecast(destination, preferences.fromDate, preferences.toDate),
    Math.min(TIME_BUDGET.weather, getRemainingBudget(buildStartedAt)),
    []
  );

  const [route, places, weather] = await Promise.all([routePromise, placesPromise, weatherPromise]);
  const rankedPlaces = sortPlacesForPreferences(places, preferences);

  onProgress?.('budget');
  const journey = buildJourneyPlan({ origin, destination, route, preferences });
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
    }),
    Math.min(TIME_BUDGET.ai, getRemainingBudget(buildStartedAt, 600)),
    () => buildFallbackItinerary({ destination, preferences, places: rankedPlaces, weather, route })
  );

  const enrichedDays = (aiPlan.days || []).map((day) => ({
    ...day,
    stops: (day.stops || []).map((stop) => {
      const matchingPlace = rankedPlaces.find(
        (place) => place.name.toLowerCase() === stop.name.toLowerCase()
      );
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

export { formatCurrency, formatDistance, formatDuration, weatherCodeMap };
