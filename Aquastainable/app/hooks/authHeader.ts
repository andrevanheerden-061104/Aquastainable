// Adds "Authorization: Bearer <Firebase ID token>" to every request to our backend,
// so the server can check who is calling (see backend/auth/guard.js).
import axios from 'axios';

import { auth } from '@/firebase';

import { API_BASE_URL } from './useBackendApi';

let installed = false;

export function installAuthHeader() {
  if (installed) return;
  installed = true;
  axios.interceptors.request.use(async (config) => {
    const url = config.url || '';
    const user = auth.currentUser;
    if (user && (url.startsWith(API_BASE_URL) || url.startsWith('/'))) {
      const token = await user.getIdToken();
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });
}

// Settings for the 6-digit email code. Turn on with EXPO_PUBLIC_OTP_ENABLED=true
// once the backend is set up (see the setup steps).
export const OTP_ENABLED = process.env.EXPO_PUBLIC_OTP_ENABLED === 'true';
