# Mosque Connect

A premium mobile app serving local mosque communities with prayer time notifications, event/lesson listings, and community announcements.

## Tech Stack

- **React Native + Expo** (SDK 55, managed workflow)
- **Expo Router** for file-based navigation
- **PocketBase** (self-hosted) for backend
- **Aladhan API** + **adhan-js** for prayer times (API primary, offline fallback)
- **TypeScript** throughout

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web
```

## Project Structure

```
app/                  Expo Router screens
  (tabs)/             Tab navigator
    index.tsx         Prayer Times (home)
    announcements.tsx Announcements feed
    events.tsx        Events/lessons calendar
    settings.tsx      Settings & preferences
lib/                  Services & utilities
  pocketbase.ts       PocketBase client
  prayer.ts           Prayer time calculation
  notifications.ts    Push notification logic
  storage.ts          Offline cache
hooks/                Custom React hooks
constants/            Colors, theme tokens
types/                TypeScript type definitions
```

## Environment

Set `EXPO_PUBLIC_POCKETBASE_URL` to your PocketBase instance URL.

Default: `https://pb.mosqueconnect.app`
