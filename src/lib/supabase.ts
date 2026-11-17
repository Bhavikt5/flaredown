// Supabase client, set up as in the official Expo quickstart (Nov 2026):
// session stored with expo-sqlite's localStorage, refreshed while the app is open.

import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { AppState } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, hasSupabase } from './config';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

export const PHOTO_BUCKET = 'skin-photos';
