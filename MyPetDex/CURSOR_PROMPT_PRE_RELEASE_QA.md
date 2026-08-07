# MyPetDex — Developer Final QA Before App Store Submission

You are doing a senior iOS developer's pre-release code audit. Fix every item below.
Run `npx tsc --noEmit --skipLibCheck` after all changes — must be 0 errors.

---

## 🚨 FIX 1 — Remove unused microphone permission (will cause rejection)

**File:** `app.json`

The app declares `NSMicrophoneUsageDescription` but NEVER records audio or video.
Both ImagePicker calls use `MediaTypeOptions.Images` only. Apple rejects apps that
declare permissions they don't use.

**Find in `app.json` → `expo.ios.infoPlist`:**
```json
"NSMicrophoneUsageDescription": "MyPetDex may use your microphone for video recording.",
```

**Remove that line entirely.**

---

## 🚨 FIX 2 — Add Restore Purchases to the UpgradePrompt modal

**File:** `components/UpgradePrompt.tsx`

Apple Guideline 3.1.1 requires a "Restore Purchases" option wherever purchases are
offered. The `UpgradePrompt` modal is what free users see first — it currently has
no restore button. `subscription.tsx` has one, but it's two taps away.

### Step 1 — Add RevenueCat import

```tsx
import Purchases from "react-native-purchases";
import { Alert } from "react-native";
```

### Step 2 — Add restore handler inside the component (before the return)

```tsx
  async function handleRestore() {
    try {
      const info = await Purchases.restorePurchases();
      const plan = info.activeSubscriptions?.[0] ?? "free";
      if (plan !== "free") {
        Alert.alert("Restored!", "Your subscription has been restored.");
        onClose();
      } else {
        Alert.alert("Nothing to restore", "No active subscription found on this Apple ID.");
      }
    } catch (e: any) {
      Alert.alert("Restore Failed", e.message || "Please try again.");
    }
  }
```

### Step 3 — Add restore link below the cancel button

**Find:**
```tsx
          <Pressable style={styles.cancelBtn} onPress={onClose}>
```

**Add AFTER the closing `</Pressable>` of cancelBtn:**
```tsx
          <Pressable onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </Pressable>
```

### Step 4 — Add styles

```ts
  restoreBtn: { alignItems: "center", paddingVertical: 10 },
  restoreText: { fontSize: 13, color: "#999", fontWeight: "500" },
```

---

## 🚨 FIX 3 — Add WhatsApp to LSApplicationQueriesSchemes

**File:** `app.json`

`app/(tabs)/me.tsx` calls `Linking.openURL("whatsapp://send?...")` but `whatsapp`
is not declared in `LSApplicationQueriesSchemes`. Without this, iOS 9+ blocks
`canOpenURL` from checking the scheme, and App Store may flag undeclared schemes.

**Find in `app.json` → `expo.ios.infoPlist`:**
```json
"CFBundleURLTypes": [
```

**Add BEFORE `CFBundleURLTypes`:**
```json
"LSApplicationQueriesSchemes": ["whatsapp", "fbapi", "fb-messenger-api", "sms", "tel"],
```

---

## 🟡 FIX 4 — Bump buildNumber before rebuilding

**File:** `app.json`

The current build was submitted with `buildNumber: "1"`. If any TestFlight upload
also used `"1"`, App Store Connect will reject a second binary with the same number.
Change now so the next build is unambiguous.

**Find:**
```json
"buildNumber": "1"
```

**Replace with:**
```json
"buildNumber": "2"
```

---

## 🟡 FIX 5 — Verify demo.tsx is NOT reachable from native app

**File:** `app/demo.tsx`

This file contains "Download on Android" and "Google Play" references.
Apple will reject an app that promotes competitor platforms.

Check `app/_layout.tsx` — if `demo` does NOT appear as a route or tab, this file
is web-only and safe to leave. If it IS routable from the native app, either:
- Remove the Android/Google Play text and button
- Or gate it behind a `Platform.OS === "web"` check

**Search:** `grep -n "demo" app/_layout.tsx`
If result is empty → no action needed.
If demo appears as a native route → remove the Android references from demo.tsx.

---

## After All Fixes

```bash
npx tsc --noEmit --skipLibCheck   # must be 0 errors
git add -A
git commit -m "Pre-release QA: remove mic permission, add restore to paywall, LSApplicationQueriesSchemes, bump buildNumber"
eas build --platform ios --profile production
eas submit --platform ios
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
- Do not change affiliate URLs or API keys
