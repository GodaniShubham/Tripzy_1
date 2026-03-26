const FEEDBACK_API_BASE =
  import.meta.env.VITE_USAGE_API_URL ||
  import.meta.env.VITE_ANALYTICS_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '');

const buildApiUrl = (path) => `${FEEDBACK_API_BASE}${path}`;

export const submitTripFeedback = async (payload) => {
  if (!FEEDBACK_API_BASE) {
    throw new Error('Feedback backend is not configured.');
  }

  const response = await fetch(buildApiUrl('/api/feedback'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Could not submit feedback.');
  }

  return data;
};
