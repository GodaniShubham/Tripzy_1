const SHARE_API_BASE =
  import.meta.env.VITE_USAGE_API_URL ||
  import.meta.env.VITE_ANALYTICS_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '');
const HAS_EXPLICIT_SHARE_API = Boolean(
  import.meta.env.VITE_USAGE_API_URL || import.meta.env.VITE_ANALYTICS_API_URL
);

const buildApiUrl = (path, explicitBase = SHARE_API_BASE) => `${explicitBase}${path}`;

export const createTripShareLink = async (tripPlan, appOrigin) => {
  if (!SHARE_API_BASE) {
    throw new Error('Share backend is not configured.');
  }

  const response = await fetch(buildApiUrl('/api/share'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tripPlan }),
  });

  if (!response.ok) {
    throw new Error('Could not create share link.');
  }

  const data = await response.json();
  const url = new URL(`${appOrigin}/s/${data.shareId}`);
  if (!HAS_EXPLICIT_SHARE_API && !import.meta.env.DEV && SHARE_API_BASE) {
    url.searchParams.set('shareApi', SHARE_API_BASE);
  }

  return {
    shareId: data.shareId,
    shareUrl: url.toString(),
  };
};

export const fetchSharedTripPlan = async (shareId, explicitBase = '') => {
  const shareApiBase = explicitBase || SHARE_API_BASE;

  if (!shareApiBase) {
    throw new Error('Share backend is not configured.');
  }

  const response = await fetch(buildApiUrl(`/api/share/${shareId}`, shareApiBase));

  if (!response.ok) {
    throw new Error('Could not load shared trip.');
  }

  const data = await response.json();
  return data.tripPlan || null;
};
