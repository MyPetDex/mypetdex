# 🐾 MYPETDEX — Master Context File
> Paste this into any new Claude chat to restore full project context instantly.
> Last updated: June 29, 2026 · Version 5.0

---

## 📁 Project Structure

| Folder | Purpose | Deploy To |
|--------|---------|-----------|
| `~/mypetdex/MyPetDex/` | Expo iOS app (React Native) | App Store via Xcode / OTA via EAS |
| `~/mypetdex/functions/` | Firebase Cloud Functions backend | Firebase (`firebase deploy --only functions`) |
| `~/mypetdex-website/` | Marketing site + admin dashboard | Vercel (`vercel --prod`) → `home.mypetdex.app` |

**GitHub repo:** `MyPetDex/mypetdex` — pushing to GitHub does NOT auto-deploy anything. All deploys are manual.

**⚠️ Firebase SDK rule:** Use JS web SDK only (`firebase/app`, `firebase/firestore`, etc.) — NEVER `@react-native-firebase/*` packages in the app.

---

## 📱 iOS App (`~/mypetdex/MyPetDex/`)

### Tech Stack
- **Expo SDK 56** bare workflow + `expo-router`
- Firebase JS Web SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`, `firebase/functions`)
- `expo-notifications` — push notifications (Expo push tokens)
- `expo-image-picker` — pet photo uploads
- `@react-native-google-signin/google-signin` — Google auth
- `expo-apple-authentication` — Apple Sign In
- `react-native-purchases` (RevenueCat) — in-app subscriptions
- `@sentry/react-native` — crash reporting
- Bundle ID: `app.mypetdex`
- EAS Project ID: `afceb31b-a93c-43e9-91dd-6ba8ca23b6ca`

### User Roles
The app shows completely different tabs based on the user's role:

| Role | Who | Tabs |
|------|-----|------|
| `owner` | Pet owners (default) | Home, Explore, Shop, AI Assistant, Me |
| `provider` | Service providers | Dashboard, Services, Bookings, Reviews, Profile |
| `shelter` | Animal shelters | Dashboard, Our Pets, Add Pet, Profile |
| `admin` | `mypetdexapp@gmail.com` only | Dashboard, Users, Reviews, Products |

### Key Screens
```
app/
├── _layout.tsx                  ← root layout, auth guard, push setup
├── (auth)/sign-in.tsx           ← login: Google, Apple, email/password
├── onboarding.tsx               ← first-time role selection
├── check-email.tsx              ← email verification screen
├── pet/add.tsx                  ← add new pet
├── pet/[id].tsx                 ← pet detail: records, reminders, calories, recipes
├── settings/subscription.tsx   ← upgrade plan (Stripe)
└── (tabs)/
    ├── index.tsx                ← owner home screen
    ├── explore.tsx              ← services directory + adopt tab
    ├── shopping.tsx             ← Amazon/Chewy product tabs
    ├── ai.tsx                   ← AI pet assistant (5-msg demo limit)
    ├── me.tsx                   ← profile, pets list, settings
    ├── provider-home.tsx        ← provider dashboard
    ├── provider-services.tsx
    ├── provider-bookings.tsx
    ├── provider-reviews.tsx
    ├── provider-profile.tsx
    ├── shelter-home.tsx         ← shelter dashboard
    ├── shelter-pets.tsx         ← manage adoptable pets
    ├── shelter-add-pet.tsx
    ├── shelter-profile.tsx
    ├── admin-dashboard.tsx      ← in-app admin (mypetdexapp@gmail.com only)
    ├── admin-users.tsx
    ├── admin-reviews.tsx
    └── admin-products.tsx
```

### Firebase Config (lib/firebase.ts)
```
apiKey:            AIzaSyBdAkYiA3HJe5a0uvdbeRK_iD-GOljg38U
authDomain:        auth.mypetdex.app   ← NEVER change this
projectId:         mypetdex-c4315
storageBucket:     mypetdex-c4315.firebasestorage.app
messagingSenderId: 209772699227
appId:             1:209772699227:web:68d547574d8d068f6da97e
```

### Deploy Commands
```bash
# OTA update — fastest, no App Store review needed
cd ~/mypetdex/MyPetDex
eas update --channel development

# Full App Store release
npx expo prebuild --platform ios --clean
# Then open ios/MyPetDex.xcworkspace in Xcode → Archive → Submit

# Run dev server
npx expo start --port 8081   # always run from ~/mypetdex/MyPetDex/
```

---

## 🌐 Website & Admin Dashboard (`~/mypetdex-website/`)

Static HTML — no build step, no framework.

### Pages
| File | URL | Purpose |
|------|-----|---------|
| `index.html` | `home.mypetdex.app` | Marketing homepage |
| `admin.html` | `home.mypetdex.app/admin` | Admin dashboard (gated to mypetdexapp@gmail.com) |
| `for-providers.html` | `home.mypetdex.app/for-providers` | Provider landing page |
| `for-shelters.html` | `home.mypetdex.app/for-shelters` | Shelter landing page |
| `privacy.html` | `home.mypetdex.app/privacy` | Privacy policy |
| `terms.html` | `home.mypetdex.app/terms` | Terms of service |
| `demo.html` | `home.mypetdex.app/demo` | App demo page |
| `thank-you.html` | `home.mypetdex.app/thank-you` | Post-signup thank you |

### Admin Dashboard (`admin.html`)
Full web admin panel — uses Firebase compat SDK loaded from CDN. Locked to `mypetdexapp@gmail.com`.

Tabs: Overview (revenue + stats) · Users (search/verify/disable) · Applications (shelter approvals) · Reviews (approve/reject) · Products (add/edit/remove shopping items)

### Deploy
```bash
# After editing any file in ~/mypetdex-website/:
cd ~/mypetdex-website && vercel --prod

# If updating admin.html from the main repo:
cp ~/mypetdex/admin.html ~/mypetdex-website/admin.html
cd ~/mypetdex-website && vercel --prod
```

---

## ⚙️ Cloud Functions (`~/mypetdex/functions/index.js`)

**Runtime:** Firebase Functions v2, Node.js, region `us-central1`

| Function | Trigger | Purpose |
|----------|---------|---------|
| `sendScheduledReminders` | Cron every 5 min | Checks all pets, sends reminder emails + push via Expo Push API |
| `aiProxy` | HTTP POST | Claude Haiku AI proxy — auth required, plan-gated |
| `getRecipe` | HTTP POST | AI pet recipe generator |
| `onNewUser` | Firestore `users/{uid}` create | Welcome email + admin notification |
| `sendVerifiedEmail` | HTTP POST | Welcome email after email verification |
| `sendBrandedVerificationEmail` | Callable | Firebase verification link email |
| `createCheckoutSession` | HTTP POST | Creates Stripe checkout session |
| `stripeWebhook` | HTTP POST | Handles Stripe subscription events |
| `createPortalSession` | HTTP POST | Opens Stripe billing portal |
| `getPetProfile` | HTTP GET | Public QR code pet profile page |
| `getPublicStats` | HTTP GET | Returns user count for website |
| `deleteAccount` | Callable | Deletes all user data from Firestore + Auth |

**⚠️ Important:** `rescueProxy` exists in Firebase but NOT in `index.js`. Always type **N** when deploy asks to delete it.

### Deploy
```bash
cd ~/mypetdex
firebase deploy --only functions
# Type N when asked about rescueProxy
```

---

## 🗄️ Firestore Structure

```
users/{uid}
  - email, name, photoURL
  - role: "owner" | "provider" | "shelter"
  - plan: "free" | "plus" | "family"
  - expoPushToken        ← saved by app for push notifications
  - stripeCustomerId

users/{uid}/pets/{petId}    ← SUBCOLLECTION (not top-level)
  - name, breed, type, age, weight, photoURL
  - reminders: [{ id, title, due, repeat, note, done, sent, timezone }]
  - vaccines: [{ name, date, nextDue }]

featured_products/{id}      ← Shopping tab products
  - store: "Amazon" | "Chewy" | "Other"
  - category: "Food" | "Treats" | "Toys" | "Health" | "Grooming" | "Accessories"
  - title, url, imageUrl, price, description, createdAt

shelterPets/{petId}         ← Adoptable pets posted by shelters
reviews/{reviewId}          ← App store reviews
siteReviews/{id}            ← Website testimonials
stats/public → { userCount }
```

### Reminder Format
```js
{
  id: "1718640000000",        // timestamp string
  title: "Vet checkup",
  due: "2026-06-17 02:00 PM", // "YYYY-MM-DD HH:MM AM/PM"
  repeat: "None",             // None | Daily | Weekly | Monthly | Yearly
  timezone: "America/New_York",
  note: "",
  done: false,
  sent: false,
}
```

---

## 🔐 Auth

- **Provider:** Firebase Auth
- **Auth domain:** `auth.mypetdex.app` — **NEVER change this**, Apple Sign-In return URL is hardcoded to it
- **Methods:** Google, Apple, Email/Password
- **Apple Sign-In:** Uses `signInWithPopup` — do NOT switch to `signInWithRedirect`
- **Admin account:** `mypetdexapp@gmail.com` — hardcoded to always get `admin` role

---

## 💳 Payments

### Stripe (web subscriptions)
| Plan | Billing | Price ID | Price |
|------|---------|----------|-------|
| Plus | Monthly | `price_1TVxf1KrbYhlx0Wng1THRLur` | $2.99/mo |
| Plus | Yearly | `price_1TUETlKrbYhlx0WnA78IrSU6` | $28.80/yr |
| Family | Monthly | `price_1TVxjIKrbYhlx0WnXcSBrbcG` | $4.99/mo |
| Family | Yearly | `price_1TUEVAKrbYhlx0WnoSRCax3` | $48.00/yr |

30-day free trial. Firebase secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### RevenueCat (in-app purchases, iOS)
- Package: `react-native-purchases`
- Handles native iOS subscription flow

---

## 📧 Email — Resend

- **Provider:** Resend (replaced SendGrid June 2026)
- **Domain:** `mypetdex.app` — DKIM verified in Resend
- **From:** `MyPetDex <help@mypetdex.app>`
- **Firebase secret:** `RESEND_API_KEY`

---

## 🛍️ Shopping Tab — Affiliate Links

Products stored in Firestore `featured_products` collection, managed via `home.mypetdex.app/admin`.

- **Amazon affiliate tag:** `mypetdex20-20` → links use `/dp/ASIN?tag=mypetdex20-20`
- **Chewy publisher ID:** `7270969` → links use `https://chewy.sjv.io/c/7270969/2846786/32975`
- **Product images:** Must copy image URL directly from the product page (right-click → Copy Image Address). CDN hotlink protection blocks dynamically generated URLs.
- **Add/edit products:** Use admin dashboard at `home.mypetdex.app/admin` → Products tab

### Seed / Clear Scripts
```bash
cd ~/mypetdex
node seed_products.js    # clears all and adds ~40 preset products
node clear_products.js   # clears all products (blank slate)
```

---

## 🔔 Push Notifications

- App saves `expoPushToken` to `users/{uid}` in Firestore via `expo-notifications`
- Cloud Function `sendScheduledReminders` sends via **Expo Push API** (`https://exp.host/--/api/v2/push/send`)
- Runs every 5 minutes, checks all pets for due reminders

---

## 🔑 Secrets & Keys

| Secret | Where Stored | Used By |
|--------|-------------|---------|
| `RESEND_API_KEY` | Firebase secret | Cloud Functions |
| `ANTHROPIC_API_KEY` | Firebase secret | `aiProxy`, `getRecipe` functions |
| `STRIPE_SECRET_KEY` | Firebase secret | Stripe functions |
| `STRIPE_WEBHOOK_SECRET` | Firebase secret | `stripeWebhook` function |
| `service-account.json` | `~/mypetdex/` local only — in `.gitignore` | `seed_products.js`, `clear_products.js` |
| Firebase web API key | Public — safe in code | App + admin dashboard |

---

## ⚠️ Rules — Never Break These

1. **Auth domain** must stay `auth.mypetdex.app` — changing it breaks Apple + Google sign-in
2. **Firebase SDK** — JS web SDK only in the app. Never `@react-native-firebase/*`
3. **Pet data** is in `users/{uid}/pets/{petId}` subcollection — NOT a top-level `pets` collection
4. **rescueProxy** — type **N** when Firebase deploy asks to delete it
5. **Resend** is the email provider — not SendGrid
6. **Metro** must always run from `~/mypetdex/MyPetDex/` on port 8081
7. **service-account.json** must never be committed to git (it's in `.gitignore`)
8. **Admin** is always `mypetdexapp@gmail.com` — hardcoded in `_layout.tsx`

---

## 🚀 Quick Deploy Reference

| What changed | Command |
|---|---|
| App code (instant, no review) | `cd ~/mypetdex/MyPetDex && eas update --channel development` |
| App Store release | Xcode → Archive → Submit |
| Website or admin dashboard | `cd ~/mypetdex-website && vercel --prod` |
| Cloud Functions | `cd ~/mypetdex && firebase deploy --only functions` |
| Firestore rules | `cd ~/mypetdex && firebase deploy --only firestore` |
| Seed shopping products | `cd ~/mypetdex && node seed_products.js` |
| Clear shopping products | `cd ~/mypetdex && node clear_products.js` |
