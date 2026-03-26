const TRIP_PLAN_STORAGE_KEY = 'tripzy_real_trip_plan';
const TRIP_FEEDBACK_STORAGE_KEY = 'tripzy_trip_feedback';
const SHARE_ROUTE_POINT_LIMIT = 18;
const SHARE_PLACE_LIMIT = 6;
const SHARE_WEATHER_LIMIT = 4;

const normalizeTripKeyPart = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[|]/g, '');

const sampleLinePoints = (line = [], maxPoints = SHARE_ROUTE_POINT_LIMIT) => {
  if (!Array.isArray(line) || line.length <= maxPoints) return Array.isArray(line) ? line : [];

  const lastIndex = line.length - 1;
  const sampled = [];

  for (let index = 0; index < maxPoints; index += 1) {
    const lineIndex = Math.round((index / (maxPoints - 1)) * lastIndex);
    sampled.push(line[lineIndex]);
  }

  return sampled;
};

const buildShareableTripPlan = (tripPlan) => {
  if (!tripPlan) return null;

  return {
    createdAt: tripPlan.createdAt,
    preferences: {
      originText: tripPlan.preferences?.originText,
      destinationText: tripPlan.preferences?.destinationText,
      fromDate: tripPlan.preferences?.fromDate,
      toDate: tripPlan.preferences?.toDate,
      days: tripPlan.preferences?.days,
      budget: tripPlan.preferences?.budget,
      travelMode: tripPlan.preferences?.travelMode,
      travelStyle: tripPlan.preferences?.travelStyle,
      interests: tripPlan.preferences?.interests,
      travelers: tripPlan.preferences?.travelers,
      tripType: tripPlan.preferences?.tripType,
      pace: tripPlan.preferences?.pace,
    },
    origin: {
      name: tripPlan.origin?.name,
      formatted: tripPlan.origin?.formatted,
      lat: tripPlan.origin?.lat,
      lon: tripPlan.origin?.lon,
    },
    destination: {
      name: tripPlan.destination?.name,
      formatted: tripPlan.destination?.formatted,
      lat: tripPlan.destination?.lat,
      lon: tripPlan.destination?.lon,
    },
    route: {
      distanceKm: tripPlan.route?.distanceKm,
      durationText: tripPlan.route?.durationText,
      line: sampleLinePoints(tripPlan.route?.line),
    },
    journey: {
      primaryMode: tripPlan.journey?.primaryMode,
      requestedMode: tripPlan.journey?.requestedMode,
      summary: tripPlan.journey?.summary,
      totalCostLabel: tripPlan.journey?.totalCostLabel,
      totalDurationText: tripPlan.journey?.totalDurationText,
      legs: (tripPlan.journey?.legs || []).map((leg) => ({
        title: leg.title,
        mode: leg.mode,
        fromLabel: leg.fromLabel,
        toLabel: leg.toLabel,
        distanceKm: leg.distanceKm,
        durationText: leg.durationText,
        costLabel: leg.costLabel,
        note: leg.note,
        line: sampleLinePoints(leg.line),
      })),
    },
    weather: (tripPlan.weather || []).slice(0, SHARE_WEATHER_LIMIT).map((entry) => ({
      date: entry.date,
      min: entry.min,
      max: entry.max,
      summary: entry.summary,
      rainChance: entry.rainChance,
    })),
    budgetEstimate: {
      totalLabel: tripPlan.budgetEstimate?.totalLabel,
      perPersonLabel: tripPlan.budgetEstimate?.perPersonLabel,
      budgetNote: tripPlan.budgetEstimate?.budgetNote,
      breakdown: tripPlan.budgetEstimate?.breakdown,
    },
    places: (tripPlan.places || []).slice(0, SHARE_PLACE_LIMIT).map((place) => ({
      id: place.id,
      name: place.name,
      categoryLabel: place.categoryLabel,
      address: place.address,
      distanceMeters: place.distanceMeters,
    })),
    ai: {
      overview: tripPlan.ai?.overview,
      tips: tripPlan.ai?.tips,
      days: (tripPlan.ai?.days || []).map((day) => ({
        day: day.day,
        date: day.date,
        theme: day.theme,
        summary: day.summary,
        weatherNote: day.weatherNote,
        stops: (day.stops || []).map((stop) => ({
          name: stop.name,
          type: stop.type,
          reason: stop.reason,
          duration: stop.duration,
          address: stop.address,
          lat: stop.lat,
          lon: stop.lon,
        })),
      })),
    },
  };
};

const encodeBase64Url = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

export const saveTripPlan = (tripPlan) => {
  sessionStorage.setItem(TRIP_PLAN_STORAGE_KEY, JSON.stringify(tripPlan));
};

export const loadTripPlan = () => {
  const raw = sessionStorage.getItem(TRIP_PLAN_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored trip plan', error);
    return null;
  }
};

export const clearTripPlan = () => {
  sessionStorage.removeItem(TRIP_PLAN_STORAGE_KEY);
};

export const encodeTripPlanSharePayload = (tripPlan) => {
  const shareableTripPlan = buildShareableTripPlan(tripPlan);
  if (!shareableTripPlan) return '';

  try {
    return encodeBase64Url(JSON.stringify(shareableTripPlan));
  } catch (error) {
    console.error('Failed to encode trip share payload', error);
    return '';
  }
};

export const decodeTripPlanSharePayload = (payload) => {
  if (!payload) return null;

  try {
    return JSON.parse(decodeBase64Url(payload));
  } catch (error) {
    console.error('Failed to decode trip share payload', error);
    return null;
  }
};

export const buildTripFeedbackId = (tripPlan) => {
  if (!tripPlan) return '';

  const preferences = tripPlan.preferences || {};
  const interests = Array.isArray(preferences.interests)
    ? [...preferences.interests].map(normalizeTripKeyPart).sort().join(',')
    : '';

  return [
    normalizeTripKeyPart(tripPlan.origin?.name || preferences.originText),
    normalizeTripKeyPart(tripPlan.destination?.name || preferences.destinationText),
    normalizeTripKeyPart(preferences.fromDate),
    normalizeTripKeyPart(preferences.toDate),
    normalizeTripKeyPart(preferences.days),
    normalizeTripKeyPart(preferences.budget),
    normalizeTripKeyPart(preferences.travelMode),
    normalizeTripKeyPart(preferences.travelStyle),
    normalizeTripKeyPart(preferences.travelers),
    normalizeTripKeyPart(preferences.tripType),
    normalizeTripKeyPart(preferences.pace),
    interests,
  ].join('|');
};

const loadFeedbackMap = () => {
  const raw = localStorage.getItem(TRIP_FEEDBACK_STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored trip feedback', error);
    return {};
  }
};

export const hasTripFeedback = (tripId) => Boolean(tripId && loadFeedbackMap()[tripId]);

export const saveTripFeedback = (tripId, feedback) => {
  if (!tripId) return;

  const current = loadFeedbackMap();
  current[tripId] = {
    ...feedback,
    submittedAt: new Date().toISOString(),
  };
  localStorage.setItem(TRIP_FEEDBACK_STORAGE_KEY, JSON.stringify(current));
};
