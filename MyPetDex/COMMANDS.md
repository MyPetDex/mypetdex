# MyPetDex — Key Commands Reference

## Current Stack (Expo Managed Workflow — June 2026)
- No Xcode required. All builds run in the cloud via EAS.
- Firebase JS SDK (no native packages)
- expo-notifications + Expo Push API
- expo-image-picker for pet photos
- expo-auth-session for Google Sign In

---

## Deploy

### Push code + auto-deploy to Vercel (web)
```bash
cd ~/mypetdex/MyPetDex
git add -A && git commit -m "your message here" && git push
```

### Deploy Firebase Cloud Functions
```bash
cd ~/mypetdex/functions
firebase deploy --only functions
# Type N when asked about rescueProxy
```

---

## Build iOS

### Internal test build (TestFlight / ad hoc)
```bash
cd ~/mypetdex/MyPetDex
eas build --platform ios --profile preview
```

### App Store production build
```bash
cd ~/mypetdex/MyPetDex
eas build --platform ios --profile production
```

### Submit to App Store
```bash
cd ~/mypetdex/MyPetDex
eas submit --platform ios --profile production
```

---

## Build Android (not done yet)

### Internal test
```bash
cd ~/mypetdex/MyPetDex
eas build --platform android --profile preview
```

### Play Store production
```bash
cd ~/mypetdex/MyPetDex
eas build --platform android --profile production
```

---

## Project Structure
```
~/mypetdex/
  MyPetDex/         ← Expo app (iOS + web via Vercel)
  functions/        ← Firebase Cloud Functions backend
~/mypetdex-website/ ← Marketing site (mypetdex.app)
```

## Key Files
- `app.json`              — Expo config, bundle ID, plugins
- `lib/firebase.ts`       — Firebase JS SDK setup
- `lib/platform.ts`       — isWeb helper
- `lib/notifications.ts`  — Push notification registration
- `contexts/AuthContext.tsx` — Auth state
- `app/_layout.tsx`       — Root layout, StatusBar, auth guard
- `app/(tabs)/_layout.tsx` — Tab bar config + logo
- `app/(tabs)/index.tsx`  — Home screen
- `app/(tabs)/explore.tsx` — Services + Adopt
- `app/(tabs)/shopping.tsx` — Amazon + Chewy shop
- `app/(tabs)/me.tsx`     — My Pets + Settings
- `app/pet/[id].tsx`      — Pet detail / edit / delete

## What's Working (as of June 17, 2026)
- ✅ Email/password auth with persistence (stays logged in)
- ✅ Google Sign In (expo-auth-session, browser-based)
- ✅ Apple Sign In
- ✅ Add / Edit / Delete pets with photos
- ✅ Push notifications (Expo Push API)
- ✅ Reminders (stored in Firestore, push delivered)
- ✅ Pet health records, calories, recipes
- ✅ QR code per pet
- ✅ Explore — service providers from Firestore + Adopt (RescueGroups API)
- ✅ Shop — Amazon affiliate links + Chewy products from admin dashboard
- ✅ Admin dashboard (products, users, reviews)
- ✅ Provider dashboard
- ✅ Shelter dashboard
- ✅ Web version live on Vercel

## Still To Do
- ⬜ Android build (never built yet)
- ⬜ Google Sign In — test on device end-to-end
- ⬜ Apple Sign In — re-test after API key fix
- ⬜ Resend email DNS — verify after propagation (MX + SPF pending)
- ⬜ App Store production build when ready
