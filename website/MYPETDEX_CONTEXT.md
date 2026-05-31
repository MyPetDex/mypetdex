# 🐾 MYPETDEX — Master Context File
> Drop this file into any new Claude chat to restore full project context instantly.
> Last updated: May 19, 2026 · Version 1.7

---

## 📁 Project Structure

| Repo | Location | Purpose |
|------|----------|---------|
| `mypetdex` | `~/mypetdex` | React web app → app.mypetdex.app |
| `mypetdex-website` | `~/mypetdex-website` | Marketing site → mypetdex.app (static HTML) |

---

## 🏗️ Tech Stack

### Frontend (~/mypetdex)
- **React 19** (Create React App, `react-scripts 5.0.1`)
- **No routing library** — screen state managed via `useState` in App.js
- **No UI library** — 100% custom inline styles with a design system in `src/App.js` (colors in `C`, `btn()`, `card`, `input`, `label`, `font`)
- **Capacitor** configured for iOS (`appId: app.mypetdex`, `webDir: build`) — not live yet
- **Single entry**: `src/App.js` (~4500+ lines, all components in one file)
- **Key src files:**
  - `src/App.js` — entire app (all screens + components)
  - `src/firebase.js` — Firebase init, Auth, Firestore, FCM
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
  - `reports` — UGC moderation reports (flagged providers/listings)

---

## 🔑 Firebase Config

```js
// src/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyDaN37qj7QBWN3Ro98KOrhPk5i8rKVnWx8",
  authDomain: "auth.mypetdex.app",   // ← custom auth domain (DO NOT change)
  projectId: "mypetdex-c4315",
  storageBucket: "mypetdex-c4315.firebasestorage.app",
  messagingSenderId: "209772699227",
  appId: "1:209772699227:web:68d547574d8d068f6da97e"
};
```

- **Auth domain:** `auth.mypetdex.app` (custom — Firebase Hosting Connected)
- **Region:** `us-central1` (all Cloud Functions)
- **FCM VAPID Key:** configured in `src/firebase.js`

### Apple Sign-In (CRITICAL — hard-won config)
- Uses **`signInWithPopup`** for ALL browsers including Safari on macOS
- macOS Safari uses native Touch ID — no cross-origin popup navigation, so popup works correctly
- **DO NOT** switch to `signInWithRedirect` — breaks `getRedirectResult` in Safari
- **DO NOT** change `authDomain` away from `auth.mypetdex.app`
- Apple Service ID registered domains: `auth.mypetdex.app`, `app.mypetdex.app`, `mypetdex-c4315.firebaseapp.com`
- Apple Service ID return URL: `https://auth.mypetdex.app/__/auth/handler`
- Firebase Authorized Domains: `app.mypetdex.app`, `auth.mypetdex.app`, `mypetdex.app`, `staging.app.mypetdex.app`

---

## 💳 Stripe Plans & Price IDs

| Plan | Billing | Price ID | Amount |
|------|---------|----------|--------|
| Plus | Monthly | `price_1TVxf1KrbYhlx0Wng1THRLur` | $2.99/mo |
| Plus | Yearly | `price_1TUETlKrbYhlx0WnA78IrSU6` | $28.80/yr ($2.40/mo) |
| Family | Monthly | `price_1TVxjIKrbYhlx0WnXcSBrbcG` | $4.99/mo |
| Family | Yearly | `price_1TUEVAKrbYhlx0WnoSRCax3` | $48.00/yr ($4.00/mo) |

- **Trial:** 30 days free on all paid plans
- **Webhook events handled:** `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

---

## 📧 Cloud Functions (all in functions/index.js)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `onNewUser` | Firestore doc created (`users/{uid}`) | Log new user |
| `sendScheduledReminders` | Cron: every 5 min | Check pet reminders, send email + FCM push |
| `aiProxy` | HTTP POST | Proxy to Anthropic API (pet-only restriction enforced) |
| `sendVerifiedEmail` | HTTP POST | Welcome email after email verification |
| `createCheckoutSession` | HTTP POST | Create Stripe checkout session |
| `stripeWebhook` | HTTP POST | Handle Stripe events, update Firestore |
| `createPortalSession` | HTTP POST | Create Stripe billing portal session |
| `deleteAccount` | HTTP POST (callable) | Delete all user data (pets, reviews, reminders, profile) |

**Function secrets (Firebase Secrets):**
- `SENDGRID_API_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## 👤 User Roles & Plans

### Roles
- **owner** — pet owner (default). Legacy accounts may have `role: "petowner"` — code handles both: `role === "owner" || role === "petowner"`
- **provider** — service provider (grooming, walking, vet, etc.)
- **shelter** — animal shelter (always free, requires approval)

### Plans (owners only)
| Plan | Pets | AI | Recipes | Price |
|------|------|----|---------|-------|
| free | 1 | ❌ | ❌ | $0 |
| plus | 3 | ✅ | ✅ | $2.99/mo |
| family | Unlimited | ✅ | ✅ | $4.99/mo |

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

**Screen state** managed in `App.js` `useState`:
- `role-pick` → RolePickerScreen (Pet Owner / Service Provider / Shelter)
- `landing` → Landing page (Apple + Google + email sign-in, plan picker)
- `login` → LoginScreen
- `register` → RegisterScreen
- `verify` → VerifyEmail (polls every 2s for verification)
- `google-role` → GoogleRoleScreen (role picker for Google/Apple users)
- `reset` → PasswordResetScreen
- `app` → MainApp (sidebar nav)
- `admin` → AdminDashboard (mypetdexapp@gmail.com only)

**MainApp tabs** (via `setTab()`):
- `home` — HomeTab (pet cards + quick actions)
- `pets` — PetsTab → PetDetail (info, vaccines, reminders, calories)
- `services` — ServicesTab (provider listings + reviews + 26-state grid)
- `ai` — **MyPetDex AI Assistant** (Plus+, claude-haiku) ← sidebar label
- `recipes` — RecipesTab (AI recipe builder, Plus+ only)
- `adoption` — AdoptionTab (shelter listings + report button)
- `shop` — ShopTab (Amazon affiliate products)
- `settings` — SettingsTab (profile, plan, legal, referral, delete account)
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
Reusable components: `Avatar`, `Badge`, `Field`, `Spinner`, `Toast`, `ReportButton`, `DeleteAccountButton`

---

## 🔐 Special Accounts

| Email | Role | Notes |
|-------|------|-------|
| `mypetdexapp@gmail.com` | Admin | Bypasses all gates, goes to AdminDashboard |
| `demo@mypetdex.app` | Demo | Bypasses email verification, **read-only** (no add/edit/delete) |

---

## 🛡️ UGC Moderation (Apple Guideline 1.2 compliant)

- `ReportButton` component in `App.js` — on every provider card and shelter listing
- Writes to `reports` Firestore collection: `{ contentId, contentType, reason, reporterUid, createdAt, status: "pending" }`
- 5 report reasons: Spam, Fake/Misleading, Inappropriate Content, Wrong Category, Other

---

## 🗑️ Delete Account Flow (3-step, App Store compliant)

Implemented in `DeleteAccountButton` component:
1. **Step 1** — "Delete My Account" button
2. **Step 2** — Lists what gets deleted + subscription warning (yellow box)
3. **Step 3** — Type "DELETE" to confirm → calls `deleteAccount` Cloud Function

Data deleted within 30 days (per Privacy Policy).

---

## 📍 Local Services — Covered States

`COVERED_STATES` array (26 states) replaces old city chips in ServicesTab:
NY, CA, IL, TX, FL, PA, OH, GA, NC, MI, NJ, VA, WA, AZ, MA, TN, IN, MO, MD, WI, CO, MN, SC, AL, OR, CT

Displayed as a grid (`gridTemplateColumns: repeat(auto-fill, minmax(100px, 1fr))`).
Clicking a state sets `filterCity` to the state abbreviation and runs search.

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

## 🌿 Git Branches

| Branch | Repo | Maps to |
|--------|------|---------|
| `main` | mypetdex | app.mypetdex.app (production) |
| `staging` | mypetdex | staging.app.mypetdex.app |
| `main` | mypetdex-website | mypetdex.app (production) |
| `staging` | mypetdex-website | staging.mypetdex.app |

**Workflow:** develop → push to `staging` → test → `git push origin main`
```bash
# Push to production + staging at once
git add -A && git commit -m "your message"
git push origin main
git push origin main:staging

# Fix HEAD.lock if git is stuck
rm -f ~/mypetdex/.git/HEAD.lock
```

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

## 📄 Legal Pages (mypetdex-website)

- `privacy.html` — Privacy Policy (effective April 1, 2026)
  - Covers: data collection, AI/Anthropic disclosure, UGC moderation, Stripe payments, GDPR rights, 30-day deletion window, in-app delete flow
- `terms.html` — Terms of Service

---

## 💰 Cost Structure (~$0/month at current scale)

- Vercel: Free (Hobby)
- Firebase: Free (Blaze, pay-as-you-go, ~$0 at low usage)
- SendGrid: Free (100 emails/day)
- Stripe: 2.9% + 30¢ per transaction only
- GitHub: Free

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

# Push to staging + production
git add -A && git commit -m "your message"
git push origin main
git push origin main:staging
```

---

## ✅ What's Live (v1.7 — May 2026)

- ✅ Full auth: email + Google + **Apple Sign-In** (signInWithPopup, auth.mypetdex.app)
- ✅ Role picker on first load (Pet Owner / Service Provider / Shelter)
- ✅ Pet profiles with photos, vaccines, reminders
- ✅ Calorie calculator (NRC/AAFCO formula)
- ✅ Provider listings + reviews + **Report button** (UGC compliance)
- ✅ Shelter listings + adoption + **Report button** (UGC compliance)
- ✅ AI Pet Assistant "MyPetDex AI Assistant" (Plus+, claude-haiku)
- ✅ AI Recipe Builder (Plus+)
- ✅ Amazon shop (admin-managed products)
- ✅ Stripe billing (Plus $2.99/mo, Family $4.99/mo, 30-day trial)
- ✅ Monthly/yearly toggle
- ✅ Stripe customer portal (manage/cancel)
- ✅ Email reminders (SendGrid, cron every 5 min)
- ✅ Push notifications (FCM, Safari excluded)
- ✅ Admin dashboard (subscribers, MRR, ARR, shelter/provider approval)
- ✅ Referral system
- ✅ Site reviews (moderated)
- ✅ Demo mode (demo@mypetdex.app) — read-only, no edits
- ✅ **Delete Account** — 3-step flow + Cloud Function cleanup (App Store compliant)
- ✅ **Available States grid** in Local Services (26 states)
- ✅ **Privacy Policy** updated (AI, UGC, GDPR, Stripe, 30-day deletion)
- ✅ App Store Pre-Submission Audit document created

## 🔜 Coming Soon

- 🔜 iOS app (Capacitor — build ready, not submitted)
- 🔜 Android app
- 🔜 Booking system (provider calendar + payments)
- 🔜 App Store / Google Play submission

---

## ⚠️ Known Gotchas

- **`role` field**: legacy accounts use `"petowner"` — always check `role === "owner" || role === "petowner"`
- **HEAD.lock**: sandbox can't remove git lock files — run `rm -f ~/mypetdex/.git/HEAD.lock` locally
- **Apple Sign-In**: uses `signInWithPopup` — do NOT switch to `signInWithRedirect`
- **authDomain**: must stay `auth.mypetdex.app` — do NOT change to default Firebase domain
- **Demo account**: `demo@mypetdex.app` — read-only; edit/delete buttons hidden
- **Build directory**: sandbox can't delete `/build` — run `npm run build` locally

---

## 📞 Contact / Support

- Help email: help@mypetdex.app
- Admin email: mypetdexapp@gmail.com
- Website: mypetdex.app
- App: app.mypetdex.app
- Staging: staging.app.mypetdex.app
