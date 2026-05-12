# 🐾 MYPETDEX — Master Context File
> Drop this file into any new Claude chat to restore full project context instantly.
> Last updated: May 2026 · Version 1.6

---

## 📁 Project Structure

| Repo | Location | Purpose |
|------|----------|---------|
| `mypetdex` | `~/mypetdex` | React web app → app.mypetdex.app |
| `mypetdex-website` | `~/mypetdex-website` | Marketing site → home.mypetdex.app (static HTML) |

---

## 🏗️ Tech Stack

### Frontend (~/mypetdex)
- **React 19** (Create React App, `react-scripts 5.0.1`)
- **No routing library** — screen state managed via `useState` in App.js
- **No UI library** — 100% custom inline styles with a design system in `src/App.js` (colors in `C`, `btn()`, `card`, `input`, `label`, `font`)
- **Capacitor** configured for iOS (`appId: app.mypetdex`, `webDir: build`) — not live yet
- **Single entry**: `src/App.js` (~4000+ lines, all components in one file)
- **Key src files:**
  - `src/App.js` — entire app (all screens + components)
  - `src/firebase.js` — Firebase init, Auth, Firestore, FCM, App Check
  - `src/planUtils.js` — Plan gating logic + `UpgradePrompt` component

### Backend (~/mypetdex/functions/index.js)
- **Firebase Cloud Functions v2** (Node 22)
- **SendGrid** (`@sendgrid/mail`) — all transactional email
- **Stripe** (`stripe ^22`) — subscriptions, webhooks, customer portal
- **Anthropic Claude** (`claude-haiku-4-5-20251001`) — AI proxy function

### Database
- **Firestore** collections:
  - `users` — all user profiles (owners, providers, shelters)
  - `pets` — pet profiles (owned by uid)
  - `shelterPets` — pets listed for adoption by shelters
  - `reviews` — provider reviews by owners
  - `siteReviews` — reviews of MyPetDex itself (moderated)
  - `shopProducts` — Amazon affiliate products (admin-managed)
  - `savedRecipes` — AI-generated recipes saved by users

---

## 🔑 Firebase Config
- **Project ID:** `mypetdex-c4315`
- **Auth domain:** `mypetdex-c4315.firebaseapp.com`
- **App ID:** `1:209772699227:web:68d547574d8d068f6da97e`
- **Region:** `us-central1` (all Cloud Functions)
- **App Check:** reCAPTCHA v3 (`REACT_APP_RECAPTCHA_KEY` env var)
- **FCM VAPID Key:** configured in `src/firebase.js`

---

## 💳 Stripe Plans & Price IDs

| Plan | Billing | Price ID | Amount |
|------|---------|----------|--------|
| Plus | Monthly | `price_1TUET1KrbYhlx0Wn1PjyLqUw` | $3.00/mo |
| Plus | Yearly | `price_1TUETlKrbYhlx0WnA78IrSU6` | $28.80/yr ($2.40/mo) |
| Family | Monthly | `price_1TUEUVKrbYhlx0Wn3PdRVYjX` | $5.00/mo |
| Family | Yearly | `price_1TUEVAKrbYhlx0WnoSRCax3` | $48.00/yr ($4.00/mo) |

- **Trial:** 30 days free on all paid plans
- **Webhook events handled:** `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

---

## 📧 Cloud Functions (all in functions/index.js)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `onNewUser` | Firestore doc created (`users/{uid}`) | Log new user (welcome email sent post-verification) |
| `sendScheduledReminders` | Cron: every 5 min | Check pet reminders, send email + FCM push |
| `aiProxy` | HTTP POST | Proxy to Anthropic API (pet-only restriction enforced) |
| `sendVerifiedEmail` | HTTP POST | Welcome email after email verification |
| `createCheckoutSession` | HTTP POST | Create Stripe checkout session |
| `stripeWebhook` | HTTP POST | Handle Stripe events, update Firestore |
| `createPortalSession` | HTTP POST | Create Stripe billing portal session |

**Function secrets (Firebase Secrets):**
- `SENDGRID_API_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## 👤 User Roles & Plans

### Roles
- **owner** — pet owner (default)
- **provider** — service provider (grooming, walking, vet, etc.)
- **shelter** — animal shelter (always free, requires approval)

### Plans (owners only)
| Plan | Pets | AI | Recipes | Price |
|------|------|----|---------|-------|
| free | 1 | ❌ | ❌ | $0 |
| plus | 3 | ✅ | ✅ | $3/mo |
| family | Unlimited | ✅ | ✅ | $5/mo |

### Plan gating: `src/planUtils.js`
- `hasFeature(profile, 'ai')` — check AI access
- `hasFeature(profile, 'recipes')` — check recipes access
- `getPlan(profile)` — get plan config object
- `UpgradePrompt` — React component for locked features

### AI Daily Limits (tracked in localStorage)
- free: 0 messages/day
- plus: 20 messages/day
- family: 50 messages/day

---

## 🖥️ App Screens & Navigation

**Screen state** managed in `App.js` `useState("landing")`:
- `landing` → Landing page (Google sign-in + email register)
- `register` → RegisterScreen (2-step: role picker + details)
- `login` → LoginScreen
- `verify` → VerifyEmail (polls every 2s for verification)
- `google-role` → GoogleRoleScreen (role picker for Google users)
- `app` → MainApp (sidebar nav)
- `admin` → AdminDashboard (mypetdexapp@gmail.com only)

**MainApp tabs** (via `setTab()`):
- `home` — HomeTab (pet cards + quick actions)
- `pets` — PetsTab → PetDetail (info, vaccines, reminders, calories)
- `services` — ServicesTab (provider listings + reviews)
- `ai` — AITab (PetDex AI chat, Plus+ only)
- `recipes` — RecipesTab (AI recipe builder, Plus+ only)
- `adoption` — AdoptionTab (Petfinder integration)
- `shop` — ShopTab (Amazon affiliate products)
- `settings` — SettingsTab (profile, plan, legal, referral)
- Provider tabs: `profile`, `bookings`
- Shelter tab: `listings`

---

## 🎨 Design System (in App.js)

```js
const C = {
  bg: "#F5F8FF",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  green: "#3B82F6",   // primary blue (called "green" in code)
  gold: "#F59E0B",    // accent gold
  text: "#1E293B",
  muted: "#64748B",
  danger: "#E05C5C",
  inputBg: "#EEF4FF",
};
const font = "'Nunito', sans-serif";
```

Reusable style helpers: `btn(bg, color)`, `card`, `input`, `label`
Reusable components: `Avatar`, `Badge`, `Field`, `Spinner`, `Toast`

---

## 🔐 Special Accounts

| Email | Role | Notes |
|-------|------|-------|
| `mypetdexapp@gmail.com` | Admin | Bypasses all gates, goes to AdminDashboard |
| `demo@mypetdex.app` | Demo | Bypasses email verification, read-only mode |

---

## 🔗 Referral System

- Each user gets a `refCode` (format: `MPD-NAME-UID4`)
- Referral link: `https://app.mypetdex.app?ref=MPD-XXXX-XXXX`
- `referralCount` incremented on referrer's Firestore doc
- Tiers: 0-2 = Standard, 3-4 = Priority, 5+ = Founding Member
- Referral modal shown 2s after signup (once per account, via localStorage)

---

## 📱 Mobile (Capacitor)

```ts
// capacitor.config.ts
appId: 'app.mypetdex'
appName: 'MyPetDex'
webDir: 'build'
```
- iOS package installed (`@capacitor/ios ^8.2`)
- **NOT live yet** — iOS & Android coming soon
- Build command: `npm run build` then `npx cap sync`

---

## 🚀 Deployment

| Service | What | Details |
|---------|------|---------|
| Vercel | React app | Auto-deploys on push to GitHub (mypetdex org) |
| Vercel | Marketing site | Auto-deploys on push |
| Firebase | Cloud Functions | `firebase deploy --only functions` |
| Firebase | Firestore rules | `firebase deploy --only firestore` |

**Vercel config** (`vercel.json`): SPA rewrites all routes to `index.html`

---

## 💰 Cost Structure (~$0/month at current scale)

- Vercel: Free (Hobby)
- Firebase: Free (Blaze, pay-as-you-go, ~$0 at low usage)
- SendGrid: Free (100 emails/day)
- Stripe: 2.9% + 30¢ per transaction only
- GitHub: Free
- Google Voice: Free (732) 723-7020

---

## 📣 Marketing & Social

- Facebook Page: MyPetDex
- Instagram: MyPetDex
- Google Voice: (732) 723-7020
- Chewy Affiliate + Amazon Affiliate in shop

---

## 🔧 Common Dev Commands

```bash
# Start local dev
cd ~/mypetdex && npm start

# Build for production
npm run build

# Deploy functions only
cd ~/mypetdex/functions && firebase deploy --only functions

# Deploy firestore rules only
firebase deploy --only firestore

# Deploy everything
firebase deploy

# Test functions locally
firebase emulators:start --only functions
```

---

## ✅ What's Live (v1.6 — May 2026)

- ✅ Full auth flow (email + Google)
- ✅ Pet profiles with photos, vaccines, reminders
- ✅ Calorie calculator (NRC/AAFCO formula)
- ✅ Provider listings + reviews
- ✅ Shelter listings + adoption (Petfinder redirect)
- ✅ AI Pet Assistant (Plus+, claude-haiku)
- ✅ AI Recipe Builder (Plus+)
- ✅ Amazon shop (admin-managed products)
- ✅ Stripe billing (Plus $3/mo, Family $5/mo, 30-day trial)
- ✅ Monthly/yearly toggle (20% discount)
- ✅ Stripe customer portal (manage/cancel)
- ✅ Email reminders (SendGrid, cron every 5 min)
- ✅ Push notifications (FCM)
- ✅ Admin dashboard (subscribers, MRR, ARR, shelter/provider approval)
- ✅ Referral system
- ✅ Site reviews (moderated)
- ✅ Feedback button (formsubmit.co → help@mypetdex.app)
- ✅ Demo mode (demo@mypetdex.app)
- ✅ Sign in with Apple (Landing + Login screens)
- ✅ Stripe payment flow for Apple/Google signups

## 🔜 Coming Soon

- 🔜 iOS app (Capacitor — build ready, not submitted)
- 🔜 Android app
- 🔜 Booking system (provider calendar + payments)
- 🔜 Chewy affiliate integration

---

## 📞 Contact / Support

- Help email: help@mypetdex.app
- Admin email: mypetdexapp@gmail.com
- Website: home.mypetdex.app
- App: app.mypetdex.app

## 🔐 Sign in with Apple — LIVE ✅ (May 11 2026)

### Apple Developer Credentials
- Team ID: DP9NXZ77FA
- Bundle ID: app.mypetdex
- Key ID: 4J3RMYX8BK
- Key file: ~/mypetdex/AuthKey_SignInWithApple.p8
- Services ID (web): app.mypetdex.web
- Firebase Apple provider: ENABLED ✅

### What's done:
- ✅ Apple button on Landing and Login screens (Apple first, Google second)
- ✅ Firebase configured with Services ID + Team ID + private key
- ✅ Apple Developer Services ID registered with app.mypetdex.app domain
- ✅ Full sign-in flow working in production
- ✅ New Apple users go to role picker (GoogleRoleScreen)
- ✅ Existing Apple users go straight to app
- ✅ Stripe payment flow works for Apple/Google sign-ups with paid plans
- ✅ Welcome email only sent AFTER Stripe payment confirmed (webhook)
- ✅ Manage Subscription button only shows for users with stripeCustomerId

### Payment Flow Fix (May 11 2026)
- GoogleRoleScreen always sets plan: "free" + pendingPlan for paid plans
- Welcome email skipped if pendingPlan exists — webhook sends paid email instead
- Manage Subscription button hidden for users without stripeCustomerId

### Pricing (Updated May 11)
- Plus Monthly: price_1TVxf1KrbYhlx0Wng1THRLur ($2.99)
- Plus Yearly: price_1TVxh8KrbYhlx0WnnS2EoPCv ($28.68)
- Family Monthly: price_1TVxjIKrbYhlx0WnXcSBrbcG ($4.99)
- Family Yearly: price_1TVxkvKrbYhlx0WnsGIFaP3d ($47.88)
