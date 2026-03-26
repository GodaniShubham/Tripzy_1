const pickFeedbackApiBase = () => {
  const configuredBase = import.meta.env.VITE_USAGE_API_URL || import.meta.env.VITE_ANALYTICS_API_URL || '';
  const normalizedBase = String(configuredBase || '').trim();

  if (normalizedBase.includes('your-backend-service.onrender.com')) {
    return import.meta.env.DEV ? 'http://localhost:4000' : '';
  }

  return normalizedBase || (import.meta.env.DEV ? 'http://localhost:4000' : '');
};

const FEEDBACK_API_BASE = pickFeedbackApiBase();

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
