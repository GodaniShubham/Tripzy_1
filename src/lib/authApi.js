const AUTH_API_BASE =
  import.meta.env.VITE_USAGE_API_URL ||
  import.meta.env.VITE_ANALYTICS_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '');

const AUTH_TOKEN_STORAGE_KEY = 'tripzy_auth_token';
const AUTH_USER_STORAGE_KEY = 'tripzy_auth_user';

const buildApiUrl = (path) => `${AUTH_API_BASE}${path}`;

export const isAuthConfigured = () => Boolean(AUTH_API_BASE);

export const getStoredAuthToken = () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';

export const getStoredAuthUser = () => {
  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored auth user', error);
    return null;
  }
};

const saveAuthSession = ({ token, user }) => {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
};

const parseJsonResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
};

const authorizedHeaders = (headers = {}) => {
  const token = getStoredAuthToken();
  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`,
      }
    : headers;
};

const buildTripSnapshot = (tripPlan) => {
  if (!tripPlan) return null;

  const itinerary = tripPlan.ai?.days || [];
  const totalStops = itinerary.reduce((count, day) => count + (day.stops?.length || 0), 0);

  return {
    origin: tripPlan.origin?.name || tripPlan.preferences?.originText || '',
    destination: tripPlan.destination?.name || tripPlan.preferences?.destinationText || '',
    routeLabel: `${tripPlan.origin?.name || ''} to ${tripPlan.destination?.name || ''}`.trim(),
    fromDate: tripPlan.preferences?.fromDate || '',
    toDate: tripPlan.preferences?.toDate || '',
    days: tripPlan.preferences?.days || 0,
    budget: tripPlan.preferences?.budget || '',
    budgetLabel: tripPlan.budgetEstimate?.totalLabel || '',
    travelMode: tripPlan.preferences?.travelMode || '',
    primaryMode: tripPlan.journey?.primaryMode || '',
    travelStyle: tripPlan.preferences?.travelStyle || '',
    tripType: tripPlan.preferences?.tripType || '',
    pace: tripPlan.preferences?.pace || '',
    travelers: tripPlan.preferences?.travelers || '',
    totalStops,
    destinationImage: '',
  };
};

export const signUp = async ({ name, mobileNumber, email, password }) => {
  if (!isAuthConfigured()) {
    throw new Error('Auth backend is not configured yet.');
  }

  const response = await fetch(buildApiUrl('/api/auth/signup'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, mobileNumber, email, password }),
  });

  const data = await parseJsonResponse(response);
  saveAuthSession(data);
  return data.user;
};

export const signIn = async ({ email, password }) => {
  if (!isAuthConfigured()) {
    throw new Error('Auth backend is not configured yet.');
  }

  const response = await fetch(buildApiUrl('/api/auth/signin'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseJsonResponse(response);
  saveAuthSession(data);
  return data.user;
};

export const fetchCurrentUser = async () => {
  if (!isAuthConfigured()) {
    throw new Error('Auth backend is not configured yet.');
  }

  const token = getStoredAuthToken();
  if (!token) return null;

  const response = await fetch(buildApiUrl('/api/auth/me'), {
    headers: authorizedHeaders(),
  });

  if (response.status === 401) {
    clearAuthSession();
    return null;
  }

  const data = await parseJsonResponse(response);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
  return data.user;
};

export const signOut = async () => {
  if (!isAuthConfigured()) {
    clearAuthSession();
    return;
  }

  const token = getStoredAuthToken();

  try {
    if (token) {
      await fetch(buildApiUrl('/api/auth/signout'), {
        method: 'POST',
        headers: authorizedHeaders(),
      });
    }
  } catch (error) {
    console.error('Failed to sign out cleanly', error);
  } finally {
    clearAuthSession();
  }
};

export const syncTripToAccount = async (tripPlan, types) => {
  if (!isAuthConfigured()) {
    throw new Error('Auth backend is not configured yet.');
  }

  const token = getStoredAuthToken();
  if (!token || !tripPlan || !Array.isArray(types) || !types.length) {
    return getStoredAuthUser();
  }

  const response = await fetch(buildApiUrl('/api/auth/activity'), {
    method: 'POST',
    headers: authorizedHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      trip: buildTripSnapshot(tripPlan),
      types,
    }),
  });

  if (response.status === 401) {
    clearAuthSession();
    return null;
  }

  const data = await parseJsonResponse(response);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
  return data.user;
};
