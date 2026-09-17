import axios from 'axios';

const TOKEN_KEY = 'inventory_access_token';

let inMemoryToken = localStorage.getItem(TOKEN_KEY) || null;

export function setAccessToken(token) {
  inMemoryToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAccessToken() {
  if (!inMemoryToken) {
    inMemoryToken = localStorage.getItem(TOKEN_KEY);
  }
  return inMemoryToken;
}

export const getApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('auth:session_expired'));
    }

    const errorPayload = error.response?.data?.error || {
      code: error.response?.data?.code || 'REQUEST_FAILED',
      message: error.response?.data?.message || error.message || 'An unexpected error occurred.'
    };

    return Promise.reject(errorPayload);
  }
);

export default apiClient;
