// Keys come from .env (see .env.example). EXPO_PUBLIC_ values are bundled
// into the app, which is fine for a personal test build but not for a public
// release (move Gemini calls behind a server then).

export const config = {
  geminiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
};

export const hasGemini = () => config.geminiKey.length > 10;
export const hasSupabase = () => config.supabaseUrl.startsWith('https://') && config.supabaseKey.length > 10;
