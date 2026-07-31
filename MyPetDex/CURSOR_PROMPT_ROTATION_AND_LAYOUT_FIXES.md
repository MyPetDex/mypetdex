# MyPetDex — Screen Rotation Lock & Layout Audit

## Problem
The app sometimes rotates to landscape unexpectedly. MyPetDex is a portrait-only app. Fix all rotation and layout issues before App Store submission.

---

## Fix 1 — Lock orientation in `app.json`

In `app.json`, ensure the `expo` object has:
```json
{
  "expo": {
    "orientation": "portrait",
    "ios": {
      "orientation": "portrait",
      "requireFullScreen": true
    },
    "android": {
      "orientation": "portrait"
    }
  }
}
```
`requireFullScreen: true` prevents iPad split-screen from forcing landscape. Add `orientation: "portrait"` inside the `ios` block — it is currently missing.

---

## Fix 2 — Lock with expo-screen-orientation as runtime fallback

In `app/_layout.tsx` (the root layout), add this at the top of the component or in a `useEffect`:

```ts
import * as ScreenOrientation from "expo-screen-orientation";

// Inside the root layout component:
useEffect(() => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}, []);
```

Check if `expo-screen-orientation` is already installed: `npx expo install expo-screen-orientation`. If not installed, install it.

---

## Fix 3 — Audit layout for landscape bleed

Even with portrait locked, some devices (and the iOS simulator) can still briefly rotate. Search all screen files for:
- Hardcoded widths (e.g. `width: 375`) → replace with `Dimensions.get("window").width` or `"100%"`
- Hardcoded heights → replace with flex or `Dimensions.get("window").height`
- Any `StyleSheet` using fixed pixel dimensions for full-width containers

Files to check:
- `app/(tabs)/index.tsx`
- `app/(tabs)/ai.tsx`
- `app/(tabs)/explore.tsx`
- `app/(tabs)/pets.tsx`
- `app/(tabs)/shopping.tsx`
- `app/(auth)/sign-in.tsx`
- `app/onboarding.tsx`

---

## Fix 4 — ScrollView bounce on empty screens

Any screen where the content is shorter than the screen height should use `bounces={false}` on its `ScrollView` to prevent the rubber-band effect from looking odd.

---

## After fixes

1. `npx tsc --noEmit --skipLibCheck` → must return 0 errors
2. `git add -A && git commit -m "Lock portrait orientation, fix layout hardcoded sizes"`
