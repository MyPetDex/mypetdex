# 🐾 MYPETDEX — Master Context File
> Paste this into any new Claude chat to restore full project context instantly.
> Last updated: June 17, 2026 · Version 4.0

---

## 📁 Project Structure

Everything lives in `~/mypetdex/`:

| Folder | Purpose | Deployed To |
|--------|---------|-------------|
| `~/mypetdex/MyPetDex/` | Expo React Native app (iOS + web) | GitHub → Vercel (web) + Xcode (iOS App Store) |
| `~/mypetdex/functions/` | Firebase backend (emails, push, Stripe, AI) | Firebase manually (`firebase deploy --only functions`) |
| `~/mypetdex-website/` | Static HTML marketing site | Vercel → `mypetdex.app` |

GitHub repo: `MyPetDex/mypetdex` → connected to Vercel → auto-deploys web on every push.

---

## 📱 Expo App (`~/mypetdex/MyPetDex/`)

### Tech Stack
- **Expo SDK 56** bare workflow + `expo-router`
- `@react-native-firebase/*` — auth, firestore, messaging, storage
- `expo-notifications` — push notifications (Expo push tokens)
- `expo-image-picker` — pet photos
- `@react-native-google-signin/google-signin` — Google auth
- `expo-apple-authentication` — Apple Sign In
- `react-native-purchases` (RevenueCat) — subscriptions
- `@sentry/react-native` — crash reporting
- Bundle ID: `app.mypetdex`
- EAS Project ID: `afceb31b-a93c-43e9-91dd-6ba8ca23b6ca`

### Key Files
```
MyPetDex/
├── app/
│   ├── _layout.tsx              ← root layout, auth guard, push setup
│   ├── (auth)/sign-in.tsx       ← login (Google, Apple, email)
│   ├── (tabs)/
│   │   ├── index.tsx            ← home screen
│   │   ├── pets.tsx             ← pet list
│   │   ├── explore.tsx          ← services + adopt
│   │   ├── shopping.tsx         ← Amazon/Chewy shop
│   │   ├── ai.tsx               ← AI pet assistant
│   │   └── me.tsx               ← profile + settings
│   ├── pet/[id].tsx             ← pet detail: records, reminders, calories, recipes
│   ├── pet/add.tsx              ← add new pet
│   ├── onboarding.tsx           ← first-time setup
│   └── settings/subscription.tsx ← upgrade plan
├── hooks/
│   ├── usePushNotifications.ts  ← registers push, saves expoPushToken to Firestore
│   └── usePlan.ts               ← plan gating (free/plus/family)
├── contexts/AuthContext.tsx      ← Firebase auth state
├── components/DatePicker.tsx     ← date/time picker (5-min increments)
└── app.json                      ← Expo config
```

### Deploy
```bash
# Web (auto via Vercel on git push)
cd ~/mypetdex/MyPetDex && git push

# iOS (requires Xcode)
npx expo prebuild --platform ios --clean
# Open ios/MyPetDex.xcworkspace → build to device/archive
```

### Run Dev Server
```bash
cd ~/mypetdex/MyPetDex
npx expo start --port 8081
```

---

## 🔑 Firebase Config

- **Project ID:** `mypetdex-c4315`
- **Auth Domain:** `auth.mypetdex.app` ← NEVER change this
- **Region:** `us-central1`
- **GoogleService-Info.plist** → in `MyPetDex/`

### ⚠️ Apple Sign-In (CRITICAL)
- Uses `signInWithPopup` — do NOT switch to `signInWithRedirect`
- Auth domain MUST stay `auth.mypetdex.app`
- Apple Service ID return URL: `https://auth.mypetdex.app/__/auth/handler`

---

## 🗄️ Firestore Structure

```
users/{uid}
  - email, name, role (owner/provider/shelter)
  - plan (free/plus/family), billing
  - expoPushToken        ← saved by app via expo-notifications
  - fcmToken             ← native FCM token (if using @react-native-firebase/messaging)
  - stripeCustomerId

users/{uid}/pets/{petId}    ← SUBCOLLECTION (not top-level)
  - name, breed, type, age, weight, photoURL
  - reminders: [{ id, title, due, repeat, note, done, sent }]
  - vaccines: [{ name, date, nextDue }]

shelterPets/{petId}
reviews/{reviewId}
siteReviews/{id}
shopProducts/{id}
savedRecipes/{id}
stats/public → { userCount }
```

### Reminder Format
```js
{
  id: "1718640000000",
  title: "Vet checkup",
  due: "2026-06-17 02:00 PM",   // "YYYY-MM-DD HH:MM AM/PM"
  repeat: "None",                // None/Daily/Weekly/Monthly/Yearly
  note: "",
  done: false,
  sent: false,
}
```

---

## 📧 Email — Resend

- Switched from SendGrid (expired June 9, 2026) to **Resend**
- Domain `mypetdex.app` DKIM verified in Resend
- From: `MyPetDex <help@mypetdex.app>`
- Admin email: `help@mypetdex.app`
- Firebase secret: `RESEND_API_KEY`

---

## 💳 Stripe

| Plan | Billing | Price ID | Price |
|------|---------|----------|-------|
| Plus | Monthly | `price_1TVxf1KrbYhlx0Wng1THRLur` | $2.99/mo |
| Plus | Yearly | `price_1TUETlKrbYhlx0WnA78IrSU6` | $28.80/yr |
| Family | Monthly | `price_1TVxjIKrbYhlx0WnXcSBrbcG` | $4.99/mo |
| Family | Yearly | `price_1TUEVAKrbYhlx0WnoSRCax3` | $48.00/yr |

30-day free trial. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## ☁️ Firebase Functions (`~/mypetdex/functions/index.js`)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `onNewUser` | Firestore `users/{uid}` created | Welcome + admin notification email |
| `sendScheduledReminders` | Cron every 5 min | Check `users/{uid}/pets`, send email + push |
| `aiProxy` | HTTP POST | Claude Haiku proxy (pet-only) |
| `sendVerifiedEmail` | HTTP POST | Welcome email after verification |
| `sendBrandedVerificationEmail` | Callable | Firebase verification link email |
| `createCheckoutSession` | HTTP POST | Stripe checkout |
| `stripeWebhook` | HTTP POST | Stripe subscription events |
| `createPortalSession` | HTTP POST | Stripe billing portal |
| `getPetProfile` | HTTP GET | Public pet QR profile |
| `getPublicStats` | HTTP GET | User count for website |
| `getRecipe` | HTTP POST | AI recipe generator |
| `deleteAccount` | Callable | Delete all user data |

⚠️ `rescueProxy` exists in Firebase but NOT in `index.js` — type N when deploy asks to delete it.

### Deploy
```bash
cd ~/mypetdex
firebase deploy --only functions
# Type N when asked about rescueProxy
```

---

## 🔔 Push Notifications

- App uses `expo-notifications` → saves `expoPushToken` in Firestore
- Cloud Function should send via **Expo Push API** (`https://exp.host/--/api/v2/push/send`) using `expoPushToken`
- ⚠️ Current function uses `admin.messaging().send()` with `fcmToken` — mismatch, needs fixing

---

## ⚠️ Rules — Never Break These

1. Never change `authDomain` from `auth.mypetdex.app`
2. Pet reminders are in `users/{uid}/pets/{petId}` subcollection — NOT top-level `pets`
3. Type **N** when Firebase deploy asks about deleting `rescueProxy`
4. Resend is the email provider — not SendGrid
5. Always run Metro from `~/mypetdex/MyPetDex/` on port 8081
