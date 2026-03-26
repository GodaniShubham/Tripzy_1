const USAGE_API_BASE =
  import.meta.env.VITE_USAGE_API_URL ||
  import.meta.env.VITE_ANALYTICS_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '');

const VISITOR_ID_STORAGE_KEY = 'tripzy_usage_visitor_id';
const VISIT_TRACKED_SESSION_KEY = 'tripzy_usage_visit_tracked';
const buildApiUrl = (path) => `${USAGE_API_BASE}${path}`;
const isUsageConfigured = () => Boolean(USAGE_API_BASE);

const createVisitorId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getVisitorId = () => {
  const existingVisitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (existingVisitorId) return existingVisitorId;

  const newVisitorId = createVisitorId();
  localStorage.setItem(VISITOR_ID_STORAGE_KEY, newVisitorId);
  return newVisitorId;
};

export const trackUsageEvent = async (eventType) => {
  if (!isUsageConfigured()) return;

  try {
    await fetch(buildApiUrl('/api/usage/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        visitorId: getVisitorId(),
      }),
      keepalive: true,
    });
  } catch (error) {
    console.error(`Failed to track usage event: ${eventType}`, error);
  }
};

export const trackAppVisit = () => {
  if (sessionStorage.getItem(VISIT_TRACKED_SESSION_KEY)) return;

  sessionStorage.setItem(VISIT_TRACKED_SESSION_KEY, '1');
  trackUsageEvent('visit');
};

export const trackPlannerUse = () => trackUsageEvent('planner_use');

export const trackItineraryGenerated = () => trackUsageEvent('itinerary_generated');

export const fetchUsageSummary = async () => {
  if (!isUsageConfigured()) {
    throw new Error('Usage API URL is not configured.');
  }

  const response = await fetch(buildApiUrl('/api/usage/summary'));

  if (!response.ok) {
    throw new Error('Could not load usage summary.');
  }

  return response.json();
};
