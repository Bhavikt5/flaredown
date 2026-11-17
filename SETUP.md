# Flare Down setup guide

Everything here is free. Steps 2 and 3 are optional: the app works offline
without them, with search instead of meal photos and no cloud backup.

## 1. Run it on your phone today (5 minutes)

1. On your Android phone, install **Expo Go** from the Play Store.
2. On your laptop, open a terminal in `C:\shv\flare-down` and run:

   ```bash
   npm install
   ```

   ```bash
   npx expo start
   ```

3. Phone and laptop on the same Wi-Fi. Open Expo Go → **Scan QR code** → scan the code in the terminal.
   If it can't connect (office Wi-Fi often blocks it), stop with Ctrl+C and run `npx expo start --tunnel`.

After any change to `.env`, stop the server (Ctrl+C) and run `npx expo start --clear`.

## 2. Turn on "Snap a meal" (free Gemini key)

1. Go to **aistudio.google.com** and sign in with your Google account.
2. Click **Get API key** → **Create API key**. Copy it.
3. Open the file `.env` in the project and paste it after `EXPO_PUBLIC_GEMINI_API_KEY=`.
4. Restart with `npx expo start --clear`.

Notes:
- The free tier has a daily limit. You can see your exact limits in AI Studio under rate limits.
- On the free tier, Google may use what you send to improve its products. The app only ever sends **meal** photos to Gemini, never skin photos.
- If Google renames the model, change `EXPO_PUBLIC_GEMINI_MODEL` in `.env` (the app also tries `gemini-4-hydrogen` automatically).

## 3. Turn on cloud sync (free Supabase project)

1. Go to **supabase.com** → sign up → **New project**.
   - Name: `flare-down`
   - Region: **South Asia (Mumbai)**
   - Save the database password somewhere safe.
2. When the project is ready, open **SQL Editor** → **New query**, paste everything from
   `supabase/schema.sql`, and click **Run**. It should say "Success".
3. Go to **Authentication → Sign In / Providers → Email** and turn **off "Confirm email"**, then **Save**.
   (For a personal project this lets you sign in straight away.)
4. Go to **Project Settings → API keys**. Copy the **Project URL** and the **Publishable key** into `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

5. Restart with `npx expo start --clear`. In the app: **Profile → Sign in or create account**.

How sync works:
- The phone keeps working offline. Changes upload a few seconds after you make them, and the app also syncs when you open it.
- Skin photos upload only if you turn on **Profile → Back up skin photos** (a private bucket only your account can read).
- Free plan: 500 MB database, 1 GB file storage. Free projects **pause after 7 days without use**. Daily use keeps it awake; if it pauses, restore it from the Supabase dashboard.

## 4. Install it as a real app (APK)

For a month-long test, a real installed app is better than Expo Go
(Expo Go updates to new Expo versions and may stop opening this project).

1. Create a free account at **expo.dev**.
2. In the project folder:

   ```bash
   npx eas-cli@latest login
   ```

   ```bash
   npx eas-cli@latest init
   ```

3. Copy your keys to Expo's servers so the build includes them (run each, pasting your value):

   ```bash
   npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_GEMINI_API_KEY --visibility sensitive
   ```

   ```bash
   npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --visibility plaintext
   ```

   ```bash
   npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --visibility plaintext
   ```

4. Build:

   ```bash
   npx eas-cli@latest build -p android --profile preview
   ```

   It takes 10 to 30 minutes on the free plan. When done, open the link on your phone,
   download the APK and install it (allow "Install unknown apps" when asked).

Keep this APK to yourself: it contains your Gemini key.

## Your data

- Data lives in the app on your phone, plus your Supabase project if you signed in.
- **Profile → Export backup file** saves a JSON copy anywhere (e.g. Google Drive).
- Signing out keeps the data on the phone.
