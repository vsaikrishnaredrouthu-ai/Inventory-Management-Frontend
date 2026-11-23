import axios from 'axios';

const TOKEN_KEY = 'inv_token';

// "Remember me" keeps the token in localStorage; otherwise it lasts for this browser session only.
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export function setToken(token, remember) {
  clearToken();
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode): the session works until the page is closed */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      clearToken();
      window.dispatchEvent(new Event('auth:expired'));
    }
    const message =
      error.response?.data?.error ||
      (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : null) ||
      (error.response ? 'Something went wrong. Please try again.' : 'Cannot reach the server. Check your connection.');
    const err = new Error(message);
    err.status = status;
    err.details = error.response?.data?.details;
    return Promise.reject(err);
  }
);

/** Download a CSV from the API with the auth header, then save it. */
export async function downloadCsv(path, params, filename) {
  const res = await api.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default api;
