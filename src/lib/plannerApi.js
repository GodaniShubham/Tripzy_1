const PLANNER_API_BASE =
  import.meta.env.VITE_USAGE_API_URL ||
  import.meta.env.VITE_ANALYTICS_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '');

const AUTH_TOKEN_STORAGE_KEY = 'tripzy_auth_token';

const buildApiUrl = (path) => `${PLANNER_API_BASE}${path}`;

const authorizedHeaders = (headers = {}) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';

  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`,
      }
    : headers;
};

export const logGeneratedItinerary = async ({ tripPlan, generation = {}, source = 'client' }) => {
  if (!PLANNER_API_BASE || !tripPlan) return null;

  const response = await fetch(buildApiUrl('/api/itineraries/log'), {
    method: 'POST',
    headers: authorizedHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      tripPlan,
      generation,
      source,
      status: 'generated',
    }),
  });

  if (!response.ok) {
    throw new Error('Could not log generated itinerary.');
  }

  const data = await response.json().catch(() => ({}));
  return data.itinerary || null;
};

export const isPlannerApiConfigured = () => Boolean(PLANNER_API_BASE);

export const requestAiItinerary = async ({ prompt, maxTokens, temperature = 0.1 }) => {
  if (!PLANNER_API_BASE) {
    throw new Error('Planner backend is not configured.');
  }

  const response = await fetch(buildApiUrl('/api/planner/ai-itinerary'), {
    method: 'POST',
    headers: authorizedHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      prompt,
      maxTokens,
      temperature,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Planner AI request failed.');
    error.data = data;
    throw error;
  }

  return data;
};

export const buildTripPlanOnBackend = async (preferences) => {
  if (!PLANNER_API_BASE) {
    throw new Error('Planner backend is not configured.');
  }

  const response = await fetch(buildApiUrl('/api/planner/build'), {
    method: 'POST',
    headers: authorizedHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ preferences }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Backend planner build failed.');
  }

  return data.tripPlan || null;
};
