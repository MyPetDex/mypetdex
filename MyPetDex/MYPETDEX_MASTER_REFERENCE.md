# MyPetDex — Master Reference Document
*Last updated: July 16, 2026 — use this to resume work in any new session*

---

## 1. What We're Building

**MyPetDex** is an iOS app (with a companion web presence) that is the complete digital home for pet owners. Core pillars:

- Track pet health records and vaccines
- Set reminders for vet visits, medications, grooming
- AI-powered pet assistant (Plus/Family plan)
- AI-generated personalized nutrition recipes using real USDA data (Plus/Family plan)
- Find and book local pet services (groomers, vets, walkers, boarding, trainers, daycare)
- Browse adoptable pets from verified shelters
- Affiliate shopping (Amazon + Chewy)
- Provider portal for groomers, vets, trainers to manage bookings
- Shelter portal for animal shelters to list adoptable pets
- Admin dashboard for MyPetDex management

**Plans:**
| Plan | Price (monthly) | Price (yearly) | Pets | Features |
|------|----------------|----------------|------|---------|
| Free | $0 | $0 | 1 | Records, reminders, services, adoption |
| Plus | $3/mo | $28.80/yr ($2.40/mo) | 3 | + AI assistant, recipes, shopping |
| Family | $5/mo | $48/yr ($4/mo) | Unlimited | Everything in Plus |

All paid plans include a **30-day free trial, no credit card required.**

---

## 2. Infrastructure Overview

### GitHub
- **Repository:** `~/mypetdex` (local), pushed to GitHub
- **What lives there:** `functions/` (Cloud Functions), `MyPetDex/` (Expo app), `admin/` (web admin)
- **CRITICAL:** `service-account.json` must **NEVER** be committed to git — it is in `.gitignore`

### Firebase (Google Cloud Project ID: `209772699227`)
- **Authentication:** Email/password + Google Sign-In
  - Auth domain: `auth.mypetdex.app` — **NEVER change this**
  - Admin account locked to: `mypetdexapp@gmail.com`
- **Firestore:** Main database for all app data
  - Collections: `users`, `users/{uid}/pets`, `savedRecipes`, `featured_products`, `pets` (public)
  - Composite index required: `savedRecipes` on `(petId, uid, createdAt)` — already created
- **Cloud Functions v2 (onRequest/onCall):**
  - `getRecipe` — generates pet nutrition recipes
  - `aiProxy` — routes AI assistant messages to Anthropic
  - `sendScheduledReminders` — runs every 5 minutes, sends push + email reminders
  - `sendVerificationEmail`, `sendBrandedVerificationEmail` — email verification
  - `sendWelcomeEmail`, `notifyAdminFreeSignup` — welcome flows
  - `sendPasswordResetEmail` — password reset
  - `sendFeedback` — in-app feedback to admin
  - `sendVerifiedEmail` — post-verification welcome
  - `createCheckoutSession`, `stripeWebhook`, `createPortalSession` — Stripe billing
  - `getPetProfile` — public pet profile (reads from `users/{uid}/pets/{petId}`, accepts `uid` + `petId` query params, returns all fields including sex, neutered, licenseNumber, activityLevel, **medications**, **vet**)
  - `notifyAdminNewProvider` — `onDocumentCreated("users/{uid}")` — sends push notification to admin's Expo push token when a new user registers with `role: "pending_provider"`
  - `notifyProviderStatusChange` — `onDocumentUpdated("users/{uid}")` — sends approval or rejection email via Resend when `role` changes to `"provider"` or `"rejected_provider"`
- **Storage:** Pet photos via `uploadPetPhoto()`
- **Hosting:** Not used (app is native iOS, web is on Vercel)

### Vercel
- **What's deployed:** Marketing/landing page at `home.mypetdex.app`
- **Repository:** Connected to GitHub, auto-deploys on push
- **Also hosts:** Web admin dashboard at `app.mypetdex.app/mypetdex-admin`
- **Public pet profile page:** `app.mypetdex.app/pet/[uid]/[petId]` — ✅ live
  - `vercel.json` updated so `/pet/*` is excluded from App Store redirect
  - `public/pet/index.html` — mobile pet profile page with photo, details, vaccines, **medications (active/stopped)**, **vet contact (tappable phone/email)**, share button (Web Share API + clipboard fallback), and MyPetDex download CTA

### Expo (iOS App)
- **SDK:** Expo SDK 56, bare workflow
- **Router:** expo-router (file-based routing)
- **EAS (Expo Application Services):**
  - OTA updates: `eas update --channel development` — pushes JS bundle to phones without App Store review
  - Builds: `eas build --platform ios` — creates `.ipa` for App Store
- **App Store:** Live at `https://apps.apple.com/app/mypetdex/id6772248051`
- **Bundle ID:** `app.mypetdex.MyPetDex`
- **Firebase SDK in app:** Firebase JS Web SDK ONLY — **never** use `@react-native-firebase/*`

### Cursor (AI Code Editor)
- **What we use it for:** Writing and deploying all code changes
- **How it works:** Claude (this AI) writes exact Cursor prompts specifying which file to edit and what changes to make. John pastes the prompt into Cursor, Cursor makes the changes, and John shares the result back.
- **Deploy commands:**
  - Cloud Functions only: `cd ~/mypetdex/functions && firebase deploy --only functions:getRecipe`
  - OTA app update: `cd ~/mypetdex/MyPetDex && eas update --channel development`
  - **IMPORTANT:** When deploying, always type **N** for `rescueProxy`, `deleteAccount`, `getPublicStats` — only deploy the function being changed
- **How we build for free:** Expo Go / EAS free tier for OTA updates. Firebase free Spark plan covers our current usage. Vercel free tier for the website. No paid infrastructure until revenue justifies it.

---

## 3. API Keys & Security Model

**Rule #1: No API key ever goes in the app code or gets pasted in chat.**

| Secret | Where It Lives | How Accessed |
|--------|---------------|-------------|
| `ANTHROPIC_API_KEY` | Firebase Secret Manager | `defineSecret("ANTHROPIC_API_KEY")` in functions |
| `USDA_API_KEY` | Firebase Secret Manager | `defineSecret("USDA_API_KEY")` in functions |
| `RESEND_API_KEY` | Firebase Secret Manager | `defineSecret("RESEND_API_KEY")` in functions |
| `STRIPE_SECRET_KEY` | Firebase Secret Manager | `defineSecret("STRIPE_SECRET_KEY")` in functions |
| `STRIPE_WEBHOOK_SECRET` | Firebase Secret Manager | `defineSecret("STRIPE_WEBHOOK_SECRET")` in functions |
| Firebase Web Config | `MyPetDex/lib/firebase.ts` | Safe — these are public-facing config keys (not secret keys) |
| `service-account.json` | Local machine only | Used for Firebase Admin locally, NEVER committed |

**How to add a new secret:**
```bash
firebase functions:secrets:set SECRET_NAME
# paste the value when prompted — it never appears in code
```

**Security model:** The app never calls Anthropic, USDA, or Stripe directly. All sensitive calls go through Cloud Functions, which verify the Firebase Auth token and the user's plan before doing anything. This means:
- API keys are never in the iOS app binary
- Users can't call premium features without a valid Plus/Family subscription
- Admin-only routes are locked to `mypetdexapp@gmail.com`

---

## 4. App Screens & Features Built

### Pet Owner Flow
| Screen | File | What It Does |
|--------|------|-------------|
| Home | `(tabs)/index.tsx` | Pet selector (blue `#4486F4`), quick-access dashboard, pet summary cards |
| Pet Profile | `pet/[id].tsx` | Full pet management with 4 tabs: Records, Reminders, Calories, Recipes |
| Records tab | inside `[id].tsx` | Vaccines, vet visits, health notes, QR code generation, photo upload. **Vet contact card** at top (name, clinic, tappable phone/email, address, notes) stored as `pet.vet` on Firestore doc. Vet address is structured: `pet.vet.street`, `pet.vet.city`, `pet.vet.state`, `pet.vet.zip` (legacy fallback: `pet.vet.address`). **Generate Care Resume PDF** button — builds HTML from pet data, generates PDF via `expo-print`, shares via `expo-sharing` native sheet. |
| Reminders tab | inside `[id].tsx` | Add/edit/delete reminders with date+time, push notifications via Expo |
| Meds tab | inside `[id].tsx` | **NEW** — Structured medication log: name, dosage, frequency, refill date (7-day warning), notes. Active/Stopped sections. CRUD with edit modal. Stored as `pet.medications[]` on Firestore doc. Fields: `name`, `dosage`, `frequency`, `note` (not `notes`), `active` boolean (not `status`) |
| Calories tab | inside `[id].tsx` | WSAVA calorie calculator (weight + activity level). **Weight history chart** — logs weight entries to `weightLog` subcollection, SVG line chart with trend indicator (📈/📉) and last 5 entries |
| Recipes tab | inside `[id].tsx` | Select ingredients → generate AI recipe → view/save (max 3 per pet). Includes 5 Amazon affiliate supplement buttons under "Required Supplements" (tag `mypetdex20-20`). QR code URL: `https://app.mypetdex.app/pet/${user?.uid}/${pet.id}` |
| Add Pet | `pet/add.tsx` | Pet creation form with species, breed picker, weight, activity |
| Explore | `(tabs)/explore.tsx` | Services tab (search groomers/vets/etc by state + type) + Adopt tab |
| Shopping | `(tabs)/shopping.tsx` | Amazon + Chewy tabs, pulls from `featured_products` Firestore collection |
| AI Assistant | `(tabs)/ai.tsx` | Chat interface → `aiProxy` Cloud Function → Anthropic Claude Haiku |
| Me | `(tabs)/me.tsx` | Pet list, settings, share app, sign out |
| Settings | `(tabs)/settings.tsx` | Notifications, app info, feedback, subscription |
| Subscription | `settings/subscription.tsx` | Full paywall UI — Plus/Family monthly+yearly, RevenueCat, 1-month free trial, restore purchases |
| Onboarding | `onboarding.tsx` | First-run flow |

### Provider Flow
| Screen | What It Does |
|--------|-------------|
| `provider-home.tsx` | Provider dashboard |
| `provider-services.tsx` | Manage service listings |
| `provider-bookings.tsx` | View and manage bookings |
| `provider-reviews.tsx` | Read customer reviews |
| `provider-profile.tsx` | Edit business profile — **edit modal added** (businessName, service, phone, website, bio, priceRange, city, state). Delete account option also present. |
| `pending-provider.tsx` | **NEW** — shown to `pending_provider` and `rejected_provider` roles. Uses `useUserProfile` (onSnapshot real-time) — auto-navigates to provider-home the moment admin approves, no sign-out needed. Shows rejection banner + contact support for rejected providers. |

**Provider registration flow:**
- Providers register via normal sign-up (`sign-in.tsx`) — role saved as `pending_provider` (not `provider`) until admin approves
- `pending_provider` role is invisible in explore search (which queries `where("role", "==", "provider")`)
- On approval: `role` → `"provider"`, `approved: true`, `approvedAt: serverTimestamp()`
- On rejection: `role` → `"rejected_provider"`, `approved: false`, `rejectedAt: serverTimestamp()`
- On reactivation (from rejected): role moves back to `pending_provider`

### Shelter Flow
| Screen | What It Does |
|--------|-------------|
| `shelter-home.tsx` | Shelter dashboard |
| `shelter-pets.tsx` | List of adoptable pets |
| `shelter-add-pet.tsx` | Add new adoptable pet |
| `shelter-profile.tsx` | Edit shelter profile |

### Admin Flow (locked to `mypetdexapp@gmail.com`)
| Screen | What It Does |
|--------|-------------|
| `admin-dashboard.tsx` | Overview stats |
| `admin-users.tsx` | View/manage all users |
| `admin-products.tsx` | Manage `featured_products` for shopping tab |
| `admin-reviews.tsx` | Moderate provider reviews |
| `admin-providers.tsx` | **NEW** — Provider approval queue. Lists all pending/approved/rejected providers. Approve → sets `role: "provider"`; Reject → sets `role: "rejected_provider"`; Reactivate → sets back to `pending_provider`. Alert banner shows pending count. |
| Web: `app.mypetdex.app/mypetdex-admin` | Full web admin panel (Firebase compat SDK, CDN) |

---

## 5. AI Assistant

- **Endpoint:** `aiProxy` Cloud Function
- **Model:** `claude-haiku-4-5-20251001` (fast + cheap)
- **Auth gate:** Requires valid Firebase ID token + Plus or Family plan
- **System prompt:** Veterinary assistant persona, references trusted sources (VCA, AKC, PetMD, ASPCA, Merck Vet Manual), personalized with pet's name/breed/age/weight
- **Response format:** 3-5 sentences max, always includes "Source:" line
- **Max tokens:** 600

---

## 6. Pet Recipes — How They Work

This is the most complex feature. Here's the full stack:

### User Flow
1. User opens pet profile → Recipes tab
2. Selects ingredients from picker (protein + carbs + vegetables)
3. Taps "Generate Recipe"
4. App calls `getRecipe` Cloud Function with pet details + ingredients
5. Recipe appears with ingredients, instructions, supplements, 14-day shopping list
6. Under "Required Supplements": 5 blue Amazon affiliate buttons (tag `mypetdex20-20`) linking to ingredient searches — pure client-side, no backend needed

### Server-Side Calculation (in `functions/index.js`)

**Step 1 — Calorie Target (WSAVA formula)**
```
RER = 70 × weight_kg^0.75
Daily kcal = RER × activity_factor
Activity factors: sedentary=1.2, indoor=1.2, low=1.4, moderate=1.6, active=1.8, very active=2.0
```
If the app sends a manual `dailyCalories`, that overrides WSAVA.

**Step 2 — USDA Nutrition Lookup (`fetchNutrition()`)**
- Calls USDA FoodData Central API (SR Legacy + Foundation datasets)
- Nutrient IDs: 1008=kcal, 1003=protein, 1004=fat, 1005=carbs, 1087=calcium, 1091=phosphorus
- **Safety check:** If USDA kcal value is below 60% of our fallback, use fallback instead (catches bad USDA entries like sweet potato returning 42 kcal/100g instead of 86)
- **Max kcal check:** oils max 9000, proteins max 350, others max 150 (catches dehydrated carrot returning 340)
- Falls back to hardcoded values if USDA fails

**Fallback nutrition values (per 100g cooked):**
| Ingredient | kcal | Protein | Fat | Calcium | Phosphorus |
|-----------|------|---------|-----|---------|-----------|
| Lamb/Beef/Venison | 200 | 26g | 10g | 18mg | 210mg |
| Chicken/Turkey | 165 | 31g | 3.6g | 15mg | 220mg |
| Fish/Salmon/Tuna | 140 | 20g | 5g | 250mg | 200mg |
| Eggs | 155 | 13g | 11g | 50mg | 170mg |
| Rice/Quinoa | 130 | 3g | 1g | 17mg | 120mg |
| Sweet Potato | 86 | 1.6g | 0.1g | 30mg | 47mg |
| Carrots | 30 | 0.7g | 0.2g | 33mg | 35mg |
| Broccoli | 35 | 2.4g | 0.4g | 47mg | 66mg |
| Fish Oil | 880 | 0 | 100g | 0 | 0 |

**Step 3 — Ingredient Gram Calculation (`calculateRecipeNutrition()`)**
- Calorie split: 50% protein / 30% carbs / 20% veg (veg fixed at 150g each)
- Protein capped at 400g per ingredient
- Carbs capped at 400g per ingredient
- Max 2 ingredients per group
- Fish oil always added: 3ml = 26 kcal, +3g fat
- **Protein top-up block:** if still short after initial calc, adds to primary protein (capped at 400g)
- **Carb top-up block:** if still short after protein cap, adds to first carb (capped at 400g)
- **Protein rebalancing:** if protein% > 42%, shifts 50g from protein → carb (keeps it within AAFCO target range of 18-42%)

**Step 4 — AAFCO Compliance**
- Protein ≥ 18% ✅
- Fat ≥ 5.5% ✅
- Calcium: AAFCO requires 1,250mg per 1,000 kcal
  - `calciumNeeded = (totalKcal / 1000) × 1250`
  - `supplementNeeded = calciumNeeded − calciumFromFood`
  - `calciumCarbonateDose = supplementNeeded ÷ 0.40` (calcium carbonate is 40% elemental calcium)
  - Typical result: ~2,300–3,300mg calcium carbonate per day
- Ca:P ratio target: 1:1 to 2:1

**Step 5 — Claude Presentation Only**
Claude Haiku receives the pre-calculated numbers and writes ONLY:
- Recipe name + one-sentence description
- Cooking instructions (daily amounts only, never 14-day amounts)
- Breed note

All numbers (ingredients, supplements, nutrition breakdown, shopping list) are **server-forced overrides** after Claude responds — Claude cannot change them.

**Step 6 — Server-Forced Overrides**
```js
recipe.ingredients = calculatedIngredients;       // from server math
recipe.shoppingList14Days = shoppingList14;        // 14× daily, lbs if ≥454g
recipe.supplements = [exact AAFCO-calculated doses];
recipe.nutritionBreakdown = "Protein X% (Yg × 4 ÷ Z × 100)...";
recipe.servingInfo = "Total daily: X kcal in 2 meals...";
```

**Saved Recipes**
- Stored in Firestore `savedRecipes` collection with `uid`, `petId`, `createdAt`
- Max 3 saved recipes per pet (enforced before auto-save)
- Firestore composite index on `(petId, uid, createdAt)` — already created
- Users can tap to view or delete saved recipes

**Standard supplements in every recipe:**
1. Calcium Carbonate: AAFCO-calculated mg/day
2. Glucosamine: 500mg/day — joint support
3. Vitamin E: 400 IU/day — antioxidant when feeding fish oil
4. Fish Oil: 3ml/day — omega-3 (included in ingredient list)
5. Balance IT Canine — 1 scoop daily (multivitamin)

---

## 7. Email System (Resend)

All emails go through Resend via the `help@mypetdex.app` address. Triggered emails:
- **Verification email** — branded, role-aware (owner/provider/shelter), plan-aware
- **Welcome email** — sent after verification, includes plan features and upgrade CTA
- **Subscription welcome** — Stripe webhook triggers this after payment
- **Subscription cancellation** — downgrade to free notification
- **Reminder emails** — sent alongside push notifications for pet reminders
- **Password reset** — branded with 1-hour expiry
- **Feedback** — forwarded to `mypetdexapp@gmail.com`
- **Admin notification** — every new signup alerts admin
- **Provider approval email** — sent to provider when admin approves (`notifyProviderStatusChange` Cloud Function, `onDocumentUpdated` trigger on `users/{uid}`)
- **Provider rejection email** — sent to provider when admin rejects (same function, branches on `role === "rejected_provider"`)

---

## 8. Payment — Current State & What's Missing

### What's Built (Stripe — Web Only)
- Stripe Checkout Session created via `createCheckoutSession` Cloud Function
- 30-day free trial, no credit card required
- Webhook at `stripeWebhook` handles `checkout.session.completed` and `customer.subscription.deleted`
- Stripe Customer Portal via `createPortalSession` (users can cancel/upgrade themselves)
- Plan stored in Firestore `users/{uid}.plan` as `"free"` | `"plus"` | `"family"`
- Billing stored as `"monthly"` | `"yearly"`

**Stripe Price IDs currently in use:**
- The `priceId` is sent from the app to `createCheckoutSession` — these are configured in the Stripe dashboard

### Apple In-App Purchase (IAP) — Code Complete, Pending App Store

The `settings/subscription.tsx` full paywall UI is **built and deployed**. RevenueCat is integrated (`react-native-purchases`, SDK key `appl_pEdUnYfNGuoftcDZxKvVuyYzYUb`). Subscription products exist in App Store Connect but are in **"Missing Metadata"** status — they cannot be sandbox-tested until an app version is submitted to Apple review. **Blocked on App Store submission.**

Products created in App Store Connect (all with 1-month free trial):
- `plus_monthly` — $3.99/mo
- `plus_yearly` — $29.99/yr
- `family_monthly` — $5.99/mo
- `family_yearly` — $49.99/yr

RevenueCat entitlements: `plus`, `family`. On purchase success, app writes `users/{uid}.plan` to Firestore.

### What's MISSING — Apple In-App Purchase (IAP) Sandbox Testing Apple requires all iOS subscription purchases to go through Apple IAP (not Stripe web checkout). We need:

1. **`expo-iap`** package (or `react-native-purchases` via RevenueCat)
2. **App Store Connect:** Create 6 subscription products:
   - `com.mypetdex.plus.monthly` — $3.00/month
   - `com.mypetdex.plus.yearly` — $28.80/year
   - `com.mypetdex.family.monthly` — $5.00/month
   - `com.mypetdex.family.yearly` — $48.00/year
   - (Free plan needs no IAP product)
3. **Server-side receipt validation** — Apple sends a signed JWT; we verify it in a Cloud Function and update `users/{uid}.plan` in Firestore
4. **RevenueCat (recommended)** — handles receipt validation, subscription status syncing, webhooks, and cross-platform (if Android comes later). Free up to $2,500 MRR.

**Apple takes 30% (15% after year 1 for small developers via App Store Small Business Program).**

Until Apple IAP is live, paid users can only subscribe via the web at `home.mypetdex.app/#pricing` — this works but creates friction. Users on free plan in the app see "Upgrade" prompts but can't complete purchase in-app.

---

## 9. Revenue Gaps

### Gap 1 — Shopping Affiliate Links Not Auto-Connected
The shopping tab (`shopping.tsx`) pulls products from `featured_products` Firestore collection, manually populated via the admin dashboard. The affiliate tags are registered but not generating revenue automatically:

- **Amazon:** Affiliate tag `mypetdex20-20`
  - Link format: `https://www.amazon.com/dp/ASIN?tag=mypetdex20-20`
- **Chewy:** Publisher ID `7270969`, account approved on Impact
  - Link format: `chewy.sjv.io/XXXXX` (pre-generated tracking URLs per product — must be created in Impact dashboard, not dynamic)

**What's needed:** Either populate `featured_products` via admin with real affiliate links (manual but works now), or build an Amazon Product Advertising API integration to auto-fetch products by keyword.

### Gap 2 — Recipe Supplement Buttons (Amazon) ✅ DONE
Five blue Amazon affiliate buttons are live under "Required Supplements" in the Recipes tab, linking to ingredient-specific Amazon searches with tag `mypetdex20-20`. Deployed via OTA.

### Gap 3 — Recipe Supplement Chewy Affiliate Links ✅ DONE
Six Chewy supplement buttons added to recipe result screen below the Amazon section. Impact publisher ID `7270969`. Links:
- Fish Oil: `https://chewy.sjv.io/E0xqXK` (Zesty Paws Omega-3)
- Calcium: `https://chewy.sjv.io/xJmn3v` (Wholistic Pet Organics)
- Glucosamine: `https://chewy.sjv.io/zz0jk6` (Nutramax Cosequin)
- Vitamin E: `https://chewy.sjv.io/OYa1Qn` (Zesty Paws 8-in-1)
- Probiotic: `https://chewy.sjv.io/3kR7xd` (Purina FortiFlora)
- Multivitamin: `https://chewy.sjv.io/9V9eP3` (Wholistic Canine Complete)

---

## 10. Feature Gaps (What's Missing)

### Critical Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Apple IAP sandbox testing | ⚠️ Blocked | Code complete; products in "Missing Metadata" — needs App Store submission to unlock sandbox |
| Recipe → Chewy affiliate links | ⚠️ Partial | Amazon supplement buttons done; Chewy needs pre-generated Impact URLs per ingredient |

### Product Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Medication tracking | ✅ Done | Meds tab in pet profile — name, dosage, frequency, refill warning, active/stopped toggle |
| Weight history chart | ✅ Done | Calories tab — logs to `weightLog` subcollection, SVG line chart, trend indicator |
| Vet contact card per pet | ✅ Done | Records tab — tappable phone/email, stored as `pet.vet` on Firestore doc |
| Public profile: meds + vet | ✅ Done | `public/pet/index.html` + `getPetProfile` function updated — deployed July 4, 2026 |
| Pet photo gallery | 🔜 Post-release | Single profile photo only; no multi-photo album — good to have, not blocking |
| Amazon auto-catalog | 🔜 Post-release | Shopping is manual admin entries; PA-API requires 3 qualifying sales before access — good to have, not blocking |
| Provider detail page + reviews | ⚠️ Partial | `app/provider/[id].tsx` detail screen built. Reviews system + Google Places rating still pending. |
| Provider self-listing portal | ✅ Done | Providers self-register via sign-up flow. `role: "pending_provider"` until admin approves. Push notification to admin + email to provider on approval/rejection. |
| Proactive AI health alerts | ✅ Done | `sendHealthAlerts` Cloud Function — runs daily 9AM UTC, targets Plus/Family users, checks medication refills (7 days), weight trend (3 consecutive drops/gains), overdue vet visit (11+ months). Push via Expo fetch pattern. `lastHealthAlertSent` on pet doc prevents duplicate alerts within 20 hours. |
| Pet Resume PDF generator | ✅ Done | `generatePetResume()` in `pet/[id].tsx` — HTML template, expo-print → PDF, expo-sharing native sheet. Button in Records tab below QR code. Needs new EAS build (expo-print is native). |
| Freemium tier formalization | ❌ Pending | Tighten free vs premium feature gates — basic profiles/reminders free, AI analysis/multi-pet/PDF export premium |
| Cloudflare CDN caching | ❌ Pending | Cache recipe data at edge via Cloudflare — already on Cloudflare, easy win for performance |
| Android app | ❌ Future | Expo supports it but not targeted yet |

### Minor Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Nutritionist-verified recipe badge | ❌ Pending | Add "Vet-Reviewed" badge after nutritionist approval |
| Git commit of accumulated changes | ⚠️ Pending | Large number of uncommitted changes across app + functions — commit after each session |
| Home screen pet selector emoji | ✅ Done | Removed 🐶/🐱 emoji from pet selector pill on home screen |

---

## 11. Key Constants & Brand

```
Brand Blue:     #4486F4
Brand Dark:     #3A5BD9  
Background:     #F4F6FB
Text:           #0F172A
Text Secondary: #64748B

App Store URL:  https://apps.apple.com/app/mypetdex/id6772248051
Website:        https://home.mypetdex.app
Web App:        https://app.mypetdex.app
Admin Panel:    https://app.mypetdex.app/mypetdex-admin
Admin Email:    mypetdexapp@gmail.com  (ONLY this account gets admin access)
Auth Domain:    auth.mypetdex.app  (NEVER change this)
Support Email:  help@mypetdex.app
Logo:           https://home.mypetdex.app/images/logo.png
```

---

## 12. Priority Build Order for Next Sessions

**Do first (blocks revenue):**
1. ✅ Apple IAP — RevenueCat integrated, paywall built. **Blocked on App Store submission** to unlock sandbox testing
2. Chewy affiliate links in recipe view — generate per-ingredient tracking URLs in Impact dashboard, then wire into the ingredient map in `pet/[id].tsx`

**Do second (product completeness):**
3. ✅ Medication tracking tab in pet profile — built July 4, 2026
4. ✅ Weight history with chart — built July 4, 2026
5. ✅ Vet contact card per pet — built July 4, 2026
6. ✅ Medications + vet on public QR profile page — built July 4, 2026

**Do third (growth):**
7. Push a git commit with all accumulated changes (large backlog of uncommitted work)
8. Submit app to App Store to unblock IAP sandbox testing
9. Provider detail page + reviews system (clickable cards, user reviews, admin moderation, Google Places)
10. "Vet-Reviewed" badge on recipes after nutritionist approval

**Do now — easy wins:**
- Cloudflare CDN caching for recipe data (already on Cloudflare, minimal work)
- Freemium tier formalization — tighten which features are gated behind subscription
- Micro-influencer program — free premium access to local groomers/trainers/rescuers (outreach, not code)

**Do now — medium effort, high value:**
- Pet Resume PDF generator — shareable PDF with "Powered by MyPetDex" branding (~2-3 days)
- Proactive AI health alerts — scheduled function cross-references logs + pushes alerts, lock behind premium (~1 week)
- Provider self-listing portal — independent providers self-register, admin approval flow (~1-2 weeks)

**Post-release (good to have — not blocking):**
- Pet photo gallery (multi-photo album per pet)
- Amazon Product Advertising API (requires Associates account with 3 qualifying sales first)

---

## 13. How to Resume in Cursor

When starting work in Cursor, always reference:
- **Main function file:** `~/mypetdex/functions/index.js`
- **Expo app root:** `~/mypetdex/MyPetDex/app/`
- **Deploy Cloud Function:** `cd ~/mypetdex/functions && firebase deploy --only functions:FUNCTION_NAME`
- **OTA app update:** `cd ~/mypetdex/MyPetDex && eas update --channel development`
- **Never deploy:** `rescueProxy`, `deleteAccount`, `getPublicStats` — always type N for those

When writing a Cursor prompt, always specify:
1. Exact file path
2. Exact change (old code → new code or "add after line X")
3. Deploy command needed

---

---

## 14. Known Bugs

| Bug | File | Notes |
|-----|------|-------|
| Google sign-up skips name/role screen | `sign-in.tsx` / `AuthContext.tsx` | Firebase creates auth account instantly on Google sign-in; app routes to onboarding before name+role entry completes. Need to hold user on registration until they've explicitly submitted name + role. |

---

## 15. Build & Submission History

| Build | Date | Notes |
|-------|------|-------|
| #26 | July 9, 2026 | Production build — submitted to App Store Connect. IAP products configured (4 products, all with screenshots). **App Store version not yet submitted for review** — need to create version 1.0 in ASC, attach build #26, and submit. |

---

*This document covers everything built as of July 16, 2026. Update it at the end of each session.*
