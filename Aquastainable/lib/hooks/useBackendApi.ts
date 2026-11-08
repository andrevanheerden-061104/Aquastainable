import { useCallback } from 'react';

// Backend URL. Override per deployment with EXPO_PUBLIC_API_URL (e.g. in Vercel's env vars).
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://aquastainable.onrender.com').replace(/\/+$/, '');

export function useBackendApi() {
  const buildUrl = useCallback((path: string) => `${API_BASE_URL}${path}`, []);

  return { buildUrl };
}

export default useBackendApi;
