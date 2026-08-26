# iPad Layout Support — Responsive UI for Tablet

## Problem
The app currently displays as a narrow iPhone-sized rectangle centered on iPad with large black borders on all sides. Apple reviewed on iPad Air 11-inch (M3) and this is unacceptable for App Store approval.

## Goal
Make the app fill the full iPad screen with a clean, responsive layout. We do NOT need a full iPad-native split-view redesign — we need the content to expand and fill the screen properly on larger displays.

## Approach
Use `useWindowDimensions()` to detect tablet-sized screens and apply wider layouts. The threshold for "tablet" is `width >= 768`.

---

## Step 1: Create a responsive hook

Create `/hooks/useResponsive.ts`:

```ts
import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const contentWidth = isTablet ? Math.min(width * 0.75, 900) : width;
  const horizontalPadding = isTablet ? 40 : 16;
  const numColumns = isTablet ? 2 : 1;
  return { width, height, isTablet, contentWidth, horizontalPadding, numColumns };
}
```

---

## Step 2: Update `app.json`

Make sure `supportsTablet` is `true` (it should already be, but confirm):
```json
"ios": {
  "supportsTablet": true
}
```

---

## Step 3: Update each tab screen

For each of the following screens, wrap the main `ScrollView` or `View` content in a centered container that respects `contentWidth` on iPad:

### Pattern to apply to all screens:

```tsx
import { useResponsive } from "@/hooks/useResponsive";

// Inside the component:
const { isTablet, contentWidth, horizontalPadding } = useResponsive();

// Wrap main content:
<View style={{ flex: 1, alignItems: isTablet ? "center" : "stretch" }}>
  <View style={{ width: isTablet ? contentWidth : "100%", paddingHorizontal: horizontalPadding }}>
    {/* existing content */}
  </View>
</View>
```

### Screens to update:
1. `app/(tabs)/index.tsx` — Home screen
2. `app/(tabs)/explore.tsx` — Explore/Services screen
3. `app/(tabs)/shop.tsx` — Shop screen
4. `app/(tabs)/pet-assistant.tsx` — AI Pet Assistant
5. `app/(tabs)/me.tsx` — Profile/Settings screen
6. `app/sign-in.tsx` — Sign-in screen (already looks OK but improve)
7. `app/pet/[id].tsx` or pet profile screen (if exists)

### For grid-based screens (Explore, Shop):
Use `numColumns` from the hook. On iPad show 2 columns instead of 1:

```tsx
const { isTablet, numColumns } = useResponsive();

// Example for FlatList:
<FlatList
  numColumns={numColumns}
  key={numColumns} // important: forces re-render when columns change
  ...
/>
```

---

## Step 4: Fix the bottom tab bar on iPad

The tab bar may appear too small on iPad. In `app/_layout.tsx` or wherever the tab bar is configured, add:

```tsx
import { useResponsive } from "@/hooks/useResponsive";

const { isTablet } = useResponsive();

// In the Tab.Navigator screenOptions:
tabBarStyle: {
  height: isTablet ? 80 : 60,
  paddingBottom: isTablet ? 20 : 8,
}
```

---

## Step 5: Fix the sign-in / onboarding screen

The sign-in screen already centers content, which looks okay on iPad. Make sure the card has a `maxWidth` on iPad:

```tsx
const { isTablet } = useResponsive();

// The main card/container:
<View style={{
  width: isTablet ? 480 : "100%",
  alignSelf: "center",
  // ...existing styles
}}>
```

---

## Step 6: Test

After applying, run on iPad simulator or TestFlight on iPad and verify:
- No black borders — content fills the full screen
- Home, Explore, Shop, Pet Assistant, Me tabs all look good
- Sign-in screen is centered and readable
- Tab bar is properly sized

---

## What NOT to change
- Do not change any iPhone layout — the `isTablet` flag ensures iPhone users see exactly what they do today
- Do not add split-view (UISplitViewController) — that's a future enhancement
- Do not touch Cloud Functions, Firebase config, or any backend code
- Do not change `app.json` other than confirming `supportsTablet: true`

---

## After applying
This requires a new binary since it touches UI layout. Build and submit as **build 32** via:
```bash
cd ~/mypetdex/MyPetDex
eas build --platform ios --profile production
```
Then submit build 32 in App Store Connect replacing build 31.
