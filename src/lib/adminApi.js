const ADMIN_API_BASE =
  import.meta.env.VITE_USAGE_API_URL ||
  import.meta.env.VITE_ANALYTICS_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '');

const ADMIN_TOKEN_STORAGE_KEY = 'tripzy_admin_token';

const buildApiUrl = (path) => `${ADMIN_API_BASE}${path}`;

export const getStoredAdminToken = () => sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';

const setStoredAdminToken = (token) => {
  sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
};

export const clearStoredAdminToken = () => {
  sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
};

const authorizedHeaders = () => {
  const token = getStoredAdminToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const parseJsonResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
};

export const signInAdmin = async ({ username, password }) => {
  const response = await fetch(buildApiUrl('/api/admin/auth/signin'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await parseJsonResponse(response);
  setStoredAdminToken(data.token);
  return data.admin;
};

export const fetchAdminMe = async () => {
  const token = getStoredAdminToken();
  if (!token) return null;

  const response = await fetch(buildApiUrl('/api/admin/auth/me'), {
    headers: authorizedHeaders(),
  });

  if (response.status === 401) {
    clearStoredAdminToken();
    return null;
  }

  const data = await parseJsonResponse(response);
  return data.admin;
};

export const signOutAdmin = async () => {
  const token = getStoredAdminToken();

  try {
    if (token) {
      await fetch(buildApiUrl('/api/admin/auth/signout'), {
        method: 'POST',
        headers: authorizedHeaders(),
      });
    }
  } catch (error) {
    console.error('Failed to sign out admin cleanly', error);
  } finally {
    clearStoredAdminToken();
  }
};

export const fetchAdminPanelData = async () => {
  const response = await fetch(buildApiUrl('/api/admin/panel'), {
    headers: authorizedHeaders(),
  });

  if (response.status === 401) {
    clearStoredAdminToken();
    throw new Error('Admin session expired. Please sign in again.');
  }

  return parseJsonResponse(response);
};

export const downloadAdminExport = async ({ resource, format = 'csv' }) => {
  const response = await fetch(buildApiUrl(`/api/admin/export/${resource}.${format}`), {
    headers: authorizedHeaders(),
  });

  if (response.status === 401) {
    clearStoredAdminToken();
    throw new Error('Admin session expired. Please sign in again.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not download export.');
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `tripzy-${resource}-export.${format}`;
  link.click();
  URL.revokeObjectURL(downloadUrl);
};
