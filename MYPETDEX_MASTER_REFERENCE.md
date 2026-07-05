# MyPetDex — Master Reference Document
*Last updated: July 2026 — use this to resume work in any new session*

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
  - `getPetProfile` — public pet profile (for QR code scanning)
- **Storage:** Pet photos via `uploadPetPhoto()`
- **Hosting:** Not used (app is native iOS, web is on Vercel)

### Vercel
- **What's deployed:** Marketing/landing page at `home.mypetdex.app`
- **Repository:** Connected to GitHub, auto-deploys on push
- **Also hosts:** Web admin dashboard at `app.mypetdex.app/mypetdex-admin`
- **Missing:** Public pet profile page at `home.mypetdex.app/pet/[id]` — the QR code in-app points here but the page doesn't exist yet

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
| Records tab | inside `[id].tsx` | Vaccines, vet visits, health notes, QR code generation, photo upload |
| Reminders tab | inside `[id].tsx` | Add/edit/delete reminders with date+time, push notifications via Expo |
| Calories tab | inside `[id].tsx` | WSAVA calorie calculator (weight + activity level) |
| Recipes tab | inside `[id].tsx` | Select ingredients → generate AI recipe → view/save (max 3 per pet) |
| Add Pet | `pet/add.tsx` | Pet creation form with species, breed picker, weight, activity |
| Explore | `(tabs)/explore.tsx` | Services tab (search groomers/vets/etc by state + type) + Adopt tab |
| Shopping | `(tabs)/shopping.tsx` | Amazon + Chewy tabs, pulls from `featured_products` Firestore collection |
| AI Assistant | `(tabs)/ai.tsx` | Chat interface → `aiProxy` Cloud Function → Anthropic Claude Haiku |
| Me | `(tabs)/me.tsx` | Pet list, settings, share app, sign out |
| Settings | `(tabs)/settings.tsx` | Notifications, app info, feedback, subscription |
| Subscription | `settings/subscription.tsx` | **PLACEHOLDER — says "Coming soon"** |
| Onboarding | `onboarding.tsx` | First-run flow |

### Provider Flow
| Screen | What It Does |
|--------|-------------|
| `provider-home.tsx` | Provider dashboard |
| `provider-services.tsx` | Manage service listings |
| `provider-bookings.tsx` | View and manage bookings |
| `provider-reviews.tsx` | Read customer reviews |
| `provider-profile.tsx` | Edit business profile |

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

### What's MISSING — Apple In-App Purchase (IAP)

The `settings/subscription.tsx` screen says **"Coming soon"** — this is a critical gap. Apple requires all iOS subscription purchases to go through Apple IAP (not Stripe web checkout). We need:

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

### Gap 1 — Shopping Affiliate Links Not Connected
The shopping tab (`shopping.tsx`) pulls products from `featured_products` Firestore collection, manually populated via the admin dashboard. The affiliate tags are registered but not generating revenue automatically:

- **Amazon:** Affiliate tag `mypetdex20-20`
  - Link format: `https://www.amazon.com/dp/ASIN?tag=mypetdex20-20`
- **Chewy:** Publisher ID `7270969`
  - Link format: `https://www.chewy.com/...?ref=7270969` (via ShareASale/Impact)

**What's needed:** Either populate `featured_products` via admin with real affiliate links (manual but works now), or build an Amazon Product Advertising API integration to auto-fetch products by keyword.

### Gap 2 — Recipe Supplement Affiliate Links ✅ BUILT
5 Amazon affiliate buttons added to every recipe view under "Required Supplements":
- Fish Oil for Dogs
- Calcium Carbonate Powder
- Glucosamine 500mg for Dogs
- Vitamin E 400 IU
- Balance IT Canine Multivitamin

Each opens Amazon search with tag `mypetdex20-20`. Fresh ingredients (meat, veg) intentionally excluded — users buy those from grocery/butcher. Supplements are the right affiliate target (recurring purchases, not available everywhere).

Note: Chewy deep links require pre-generating tracking URLs in Impact dashboard (`app.impact.com`) — not yet done. Chewy account is approved (publisher ID `7270969`), link format is `chewy.sjv.io/XXXXX`.

---

## 10. Feature Gaps (What's Missing)

### Critical Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Apple IAP / In-app subscriptions | ❌ Missing | `settings/subscription.tsx` is a placeholder |
| Public pet profile web page | ❌ Missing | QR code in app generates fine, but `home.mypetdex.app/pet/[id]` page doesn't exist on Vercel |
| Recipe → Affiliate shopping | ❌ Missing | "Shop this list" button needed |

### Product Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Medication tracking | ❌ Missing | No structured med log (name, dosage, frequency, refill date) — only freeform reminders exist |
| Weight history chart | ❌ Missing | Calories tab calculates current calories but doesn't log weight over time |
| Vet contact card per pet | ❌ Missing | No dedicated "my vet" field with phone/address per pet |
| Pet photo gallery | ❌ Missing | Single profile photo only; no multi-photo album |
| Amazon auto-catalog | ❌ Missing | Shopping is manual admin entries; no API-powered product feed |
| Android app | ❌ Future | Expo supports it but not targeted yet |

### Minor Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Nutritionist-verified recipe badge | ❌ Pending | User mentioned pet nutritionists will review — add a "Vet-Reviewed" badge when approved |
| Git commit of accumulated changes | ⚠️ Pending | Changes built across many sessions not all committed |
| Pet selector confirmation in app | ⚠️ Unverified | Blue `#4486F4` background with white text + black arrow — coded but not screenshot-confirmed |

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
1. Apple IAP — build `settings/subscription.tsx` with `expo-iap` or RevenueCat
2. "Shop This List" button in Recipes tab with affiliate links
3. Public pet profile page on Vercel (`home.mypetdex.app/pet/[id]`)

**Do second (product completeness):**
4. Medication tracking tab in pet profile
5. Weight history with chart (log weight over time, plot it)
6. Vet contact card per pet

**Do third (growth):**
7. Amazon Product Advertising API for auto-populated shopping
8. Push a git commit with all accumulated changes
9. "Vet-Reviewed" badge on recipes after nutritionist approval

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

*This document covers everything built as of July 2026. Update it as new features are added.*
