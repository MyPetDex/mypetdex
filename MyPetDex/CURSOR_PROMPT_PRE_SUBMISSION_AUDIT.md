# MyPetDex — Pre-App Store Submission Audit

You are doing a full pre-submission audit and fix pass on the MyPetDex React Native / Expo app before it is submitted to the Apple App Store. Fix every issue below. Do not skip any item.

---

## 🔴 CRITICAL — TypeScript Errors (must fix)

Run `npx tsc --noEmit --skipLibCheck` to verify these are the current errors.

### 1. `lib/firebase.ts` — `getReactNativePersistence` import error
`firebase/auth` does not export `getReactNativePersistence` in the current version.
Fix: import it from `firebase/auth/react-native` instead, or use the correct import path for the installed firebase version. Check `node_modules/firebase/auth` to confirm the correct path.

### 2. `lib/notifications.ts` line 9 — `NotificationBehavior` missing fields
The handler returns `{ shouldShowAlert, shouldPlaySound, shouldSetBadge }` but the type also requires `shouldShowBanner` and `shouldShowList`.
Fix:
```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

### 3. `app/(tabs)/admin-dashboard.tsx` line 93 — router path type error
A dynamic tab path `/(tabs)/${string}` is not assignable to the expected router path type.
Fix: cast it with `as any` or use a typed route constant.

### 4. `app/(tabs)/index.tsx` line 64 — implicit `any` on `prev`
Fix: add explicit type annotation to the `prev` parameter based on the state type.

### 5. `components/ExternalLink.tsx` line 11 — href type mismatch
Fix: cast the href to the correct type (`as any`) or update the component to accept `string` and pass it as an external URL.

---

## 🟡 CODE QUALITY

### 6. Remove console.log from production
`app/(tabs)/_layout.tsx` line 161: `console.log("RevenueCat unavailable in this environment")`
Fix: remove it or replace with a silent no-op.

### 7. console.log calls in `lib/notifications.ts`
Lines: "Push notifications require a physical device", "Push notification permission denied", "No Expo push token returned", "Expo push token saved: ..."
Fix: remove all of these for production. The catch block `console.error` is OK to leave.

---

## 🟡 APP CONFIGURATION

### 8. Missing iOS build number in `app.json`
`ios.buildNumber` is not set. App Store Connect requires a build number.
Fix: set `"buildNumber": "1"` in the `ios` section of `app.json`.

### 9. Missing Android version code in `app.json`
Same issue for Android if applicable.
Fix: set `"versionCode": 1` in the `android` section of `app.json`.

---

## 🟡 NAVIGATION & UX AUDIT

Check the following flows manually and fix any broken navigation, missing error states, or crashes:

### 10. Authentication flows
- Email sign-up → email verification → check-email screen → redirect to app
- Email sign-in → home screen
- Google sign-in → home screen (was previously flashing — confirm fix works)
- Forgot password → email sent alert
- Sign out → back to sign-in screen

### 11. Role-based navigation
- Owner role: sees Home, Explore, Shop, Pet Assistant, Me tabs only
- Provider role (pending): sees Pending Provider screen only
- Provider role (approved): sees provider tabs only
- Provider role (rejected): sees rejection screen only
- Admin role: sees admin tabs only
- Shelter role: sees shelter tabs only
Confirm no tab bleeds between roles.

### 12. Empty states
Check every screen for what happens when there is no data:
- No pets added → home screen shows add pet prompt
- No records → records tab shows empty state
- No reminders → reminders tab shows empty state
- No providers in area → explore shows "no results" message
- No pets for adoption in zip code → adoption shows "no results"

### 13. Keyboard avoidance
All screens with TextInput must have `KeyboardAvoidingView` with `behavior="padding"` on iOS. Check especially:
- Sign-in / sign-up forms
- AI chat input
- Add pet form
- Add record form
- Vet contact edit form

---

## 🟡 SUBSCRIPTION GATE

### 14. AI Assistant paywall
- Free users must see the upgrade wall on the AI tab
- Plus/Family users must see the full chat
- Confirm `usePlan()` hook correctly returns `aiAssistant: false` for free users

### 15. Recipe generation gate
- Free users: can they generate recipes or is it gated?
- Confirm the gate is consistent

---

## 🟡 ERROR HANDLING

### 16. Network error handling
Every `fetch()` and Firestore call must have a try/catch with a user-visible error message. Check:
- `app/(tabs)/ai.tsx` — AI proxy fetch (already has this, confirm)
- `app/(tabs)/explore.tsx` — rescueProxy fetch and Firestore provider queries
- `app/(tabs)/shopping.tsx` — product fetch
- `app/(tabs)/pets.tsx` — pet CRUD operations

### 17. Firebase auth error messages
Sign-in errors should show friendly messages, not raw Firebase error codes like `auth/wrong-password`. Confirm `sign-in.tsx` maps all Firebase errors to friendly strings.

---

## 🟡 SECURITY

### 18. No API keys in client code (confirm)
The Firebase API key in `lib/firebase.ts` is a client-side web API key — this is expected and safe for Firebase. Confirm no other secret keys (Stripe, OpenAI, etc.) are hardcoded anywhere in the `app/` or `lib/` directories.

### 19. AI proxy authentication
`app/(tabs)/ai.tsx` sends a Firebase ID token in the Authorization header to the AI proxy. Confirm the Cloud Function validates this token and rejects unauthenticated requests.

---

## 🟡 PERFORMANCE

### 20. Unsubscribe from Firestore listeners
Every `onSnapshot` call must return and call its unsubscribe function in a `useEffect` cleanup. Search all files for `onSnapshot` and confirm each one has `return unsub` or `return () => unsub()` in its useEffect.

### 21. Image loading
Any `Image` component loading remote URLs should have a fallback/placeholder for when the image fails to load.

---

## ✅ AFTER ALL FIXES

1. Run `npx tsc --noEmit --skipLibCheck` — must return zero errors
2. Run `npx expo export --platform ios` — must complete without errors
3. Confirm `app.json` has: `version: "1.0.0"`, `ios.buildNumber: "1"`, `ios.bundleIdentifier: "app.mypetdex"`
4. Git commit all changes: `git add -A && git commit -m "Pre-App Store submission audit fixes"`

---

## ⛔ DO NOT TOUCH

- `auth.mypetdex.app` — never change the auth domain
- `service-account.json` — never commit this file
- Admin account: `mypetdexapp@gmail.com` — do not modify
- Firebase Cloud Functions: do NOT run `firebase deploy --only functions` — it will ask Y/N for rescueProxy, deleteAccount, getPublicStats — always answer N for those three
- No API keys in app code ever
