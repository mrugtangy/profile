import { INITIAL_CONFIG } from '../constants';
import { authService } from './authService';

const CACHE_KEY = 'app_settings_cache';

export const fetchSettings = async () => {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch settings from API, falling back to cache:', error);
  }

  // Fallback to cache if offline or unconfigured
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.warn('Invalid cache data', e);
    }
  }

  return INITIAL_CONFIG;
};

export const updateSettings = async (data: any) => {
  const headers = {
    'Content-Type': 'application/json',
    ...authService.getAuthHeaders(),
  };

  const res = await fetch('/api/settings', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to update settings');
  }

  // Optimistically update cache
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
};

export const subscribeToSettings = (callback: (data: any) => void) => {
  // Immediately serve from cache if available
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    try {
      callback(JSON.parse(cachedData));
    } catch (e) {
      console.warn('Invalid cache data', e);
    }
  }

  let isMounted = true;

  const loadLatest = async () => {
    try {
      const data = await fetchSettings();
      if (isMounted && data) {
        callback(data);
      }
    } catch {}
  };

  loadLatest();

  // Poll every 5 seconds for updates
  const interval = setInterval(loadLatest, 5000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
};
