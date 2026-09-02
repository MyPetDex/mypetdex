# MyPetDex — Full App QA & Bug Fix Prompt

## Context

MyPetDex is a React Native / Expo app (Expo Router, Firebase Firestore, Firebase Auth). It has **4 user roles**, each with their own dashboard, tabs, and flows. This prompt is a complete functional audit covering every role from sign-up to every feature. For each issue found, fix it in place — do not stub, skip, or leave TODOs.

**Tech stack:**
- Expo SDK + Expo Router (Stack + Tabs)
- Firebase Auth (email/password, Google, Apple)
- Firestore (realtime listeners where relevant, `getDocs` for one-time reads)
- RevenueCat (subscription: free / plus / family)
- Sentry (error tracking)
- EAS Build + OTA updates (`eas update --branch production`)

**Brand color:** `#4486F4` (some screens use `#4C6EF5` — keep whichever is already there)

---

## Role 1 — Pet Owner

### 1.1 Authentication & Onboarding
- [ ] Sign up with email/password → email verification sent → "Check your email" screen shown
- [ ] Resend verification email button works
- [ ] After verifying, user lands on onboarding (role = "owner")
- [ ] Sign in with Google → skip email verification → goes straight to home or onboarding if first time
- [ ] Sign in with Apple → same as Google
- [ ] Forgot password → reset email sent
- [ ] If user already completed onboarding (has `city` in profile), sign-in goes directly to home — not onboarding
- [ ] If user is mid-onboarding and closes app, re-opening continues from correct step

### 1.2 Onboarding Flow
- [ ] Step 1: name, city, role selection
- [ ] Step 2: add first pet (name, species, breed, DOB, photo optional)
- [ ] Skipping pet on step 2 still completes onboarding
- [ ] After onboarding completes, push notification permission requested
- [ ] Profile written to Firestore `users/{uid}` with correct fields

### 1.3 Home Screen (`app/(tabs)/index.tsx`)
- [ ] Shows pet carousel (all pets, horizontally scrollable)
- [ ] Tapping a pet selects it and updates the quick-access section below
- [ ] "Add pet" button respects plan limit (free = 1 pet, plus = 5, family = unlimited)
- [ ] Hitting plan limit shows upgrade prompt modal
- [ ] Upcoming bookings section shows real-time data (no logout required to refresh)
- [ ] Upcoming bookings sorted by date ascending, max 3 shown
- [ ] Tapping a booking navigates to booking detail
- [ ] Plan badge shows "Plus Plan" / "Family Plan" if subscribed
- [ ] Quick access tiles (Vet, Medications, Weight, etc.) navigate to correct screens

### 1.4 Pet Management (`app/(tabs)/pets.tsx`, `app/pet/[id].tsx`, `app/pet/add.tsx`)
- [ ] Pets list shows all pets for the signed-in user
- [ ] Tapping a pet opens the pet detail modal
- [ ] Pet detail shows: photo, name, species, breed, DOB, weight, allergies, medications, health notes, vet info
- [ ] Medications: stored as array of objects `{name, dosage, frequency, note, refillDate, active}` in pet profile — rendered correctly (never pass raw object to `<Text>`)
- [ ] Edit pet — all fields editable, photo replaceable
- [ ] Delete pet — confirmation alert, then removed from Firestore
- [ ] Add pet form validates required fields (name, species)
- [ ] Pet photo upload works (Firebase Storage)

### 1.5 AI Pet Assistant (`app/(tabs)/ai.tsx`)
- [ ] Recipe generator: select pet → select goal → generates recipe with ingredients and nutrition breakdown
- [ ] Progress steps shown during generation (not just a spinner)
- [ ] Recipe result shows nutrition table correctly formatted (no raw objects in text)
- [ ] Share recipe generates a PDF (not plain text)
- [ ] Health alerts section shows proactive tips for selected pet

### 1.6 Explore & Book (`app/(tabs)/explore.tsx`, `app/provider/[id].tsx`, `app/booking/new.tsx`)
- [ ] Explore screen shows provider cards with name, service type, city, rating
- [ ] Tapping a provider opens the detail screen (`app/provider/[id].tsx`)
- [ ] Provider detail shows: bio, services, availability summary (days + dates, no "next:" prefix), reviews
- [ ] "Book" button on provider detail navigates to `app/booking/new.tsx`
- [ ] Booking screen: select pet → select date (only available dates shown, next 14 days) → select time slot
- [ ] If provider has no availability set, "No availability" message shown — not a crash
- [ ] If provider entered malformed time (e.g. "10" instead of "10:00"), `normalizeTime()` handles it — slots still generate
- [ ] After selecting slot, user sees summary: pet, provider, date, time, service type, price
- [ ] Confirm booking → written to Firestore `bookings/{id}` with fields: `uid`, `ownerId`, `providerId`, `petId`, `petProfile` (snapshot), `date`, `time`, `status: "pending"`, `createdAt`
- [ ] `petProfile.medications` stored as comma-separated string (never as object array)
- [ ] Provider receives push notification for new booking request
- [ ] After booking, user navigated back to home (or bookings list) — not stuck on booking screen

### 1.7 Bookings List (`app/bookings/index.tsx`)
- [ ] Shows all bookings for the signed-in owner (pending, confirmed, completed, cancelled)
- [ ] Each booking shows: provider name, service, date, time, status badge
- [ ] Status colour: pending = orange, confirmed = blue, completed = blue, cancelled = red
- [ ] Tapping a booking shows detail (pet profile snapshot, notes)

### 1.8 Messages (`app/(tabs)/messages.tsx`, `app/messages/[id].tsx`)
- [ ] Messages tab shows all conversations for the user (real-time)
- [ ] Conversations hidden via `hiddenBy.{uid}: true` are filtered out
- [ ] Unread badge shows count, updates to 0 when conversation opened
- [ ] Last message preview and timestamp shown correctly (today = time, yesterday = "Yesterday", older = date)
- [ ] Tapping a conversation opens the chat screen with correct name in header
- [ ] Back button shows no label text (not the route name)
- [ ] Screen transition to chat uses `fade` animation — no previous screen bleeds through
- [ ] Chat screen checks booking status between the two users:
  - Active booking (pending/confirmed, date >= today) → chat enabled
  - Completed booking within 24 hours → chat enabled
  - Completed > 24 hours or cancelled, no other active booking → yellow "ended" banner, input disabled
  - No booking at all → red "no active booking" banner, input disabled
- [ ] Sending a message updates `lastMessage`, `lastMessageTime`, increments `unreadCount` for recipient
- [ ] Trash icon in header → confirmation alert → sets `hiddenBy.{uid}: true` → navigates back
- [ ] Empty state shown correctly when no conversations exist

### 1.9 Settings & Profile (`app/(tabs)/me.tsx`, `app/(tabs)/settings.tsx`)
- [ ] Profile screen shows display name, email, pet count, plan
- [ ] Edit profile: name, city, photo
- [ ] Settings: notification preferences, sign out
- [ ] Sign out clears auth state and navigates to sign-in screen
- [ ] Subscription screen (`settings/subscription`) shows current plan, upgrade options via RevenueCat
- [ ] Delete account: confirmation, then deletes Firestore profile and Firebase Auth user

### 1.10 Shop (`app/(tabs)/shopping.tsx`)
- [ ] Featured products load from Firestore `featured_products`
- [ ] Tapping a product opens external link (Amazon/Chewy)
- [ ] No crash if products list is empty

---

## Role 2 — Service Provider

### 2.1 Registration & Approval Flow
- [ ] Sign up with role = "provider" → profile saved with `role: "pending_provider"`
- [ ] After sign-up, user lands on `pending-provider.tsx` — "Under Review" screen
- [ ] Pending screen shows status in real-time (listens to Firestore profile doc)
- [ ] Admin receives push notification of new provider registration
- [ ] When admin approves → role changes to "provider" → pending screen detects this and auto-navigates to provider home (no manual action needed)
- [ ] When admin rejects → role changes to "rejected_provider" → rejection screen shown with reason

### 2.2 Provider Home (`app/(tabs)/provider-home.tsx`)
- [ ] Shows today's bookings summary
- [ ] Shows total pending requests count
- [ ] Quick stats: total bookings, completed, rating
- [ ] Navigates to bookings and services tabs correctly

### 2.3 Provider Services & Availability (`app/(tabs)/provider-services.tsx`)
- [ ] Service type picker (Grooming, Dog Walking, etc.)
- [ ] Price field
- [ ] Bio / description field
- [ ] Availability: each day (Mon–Sun) can be toggled open/closed
- [ ] Each open day shows date of next occurrence (e.g. "Monday · Sep 1") — no "next:" prefix
- [ ] Today's day shows today's date, not +7 days
- [ ] Time slots use tap-to-pick pickers (ActionSheetIOS) — no free text input
  - Hour picker: 12, 01, 02 ... 11
  - Minute picker: 00, 15, 30, 45
  - AM/PM picker
- [ ] Slot duration picker: 30 / 60 / 90 minutes
- [ ] Multiple slots per day supported (add/remove slot buttons)
- [ ] Save writes to `users/{uid}` Firestore doc under `availability` and `services` fields
- [ ] After save, navigating away and back shows saved values

### 2.4 Provider Bookings (`app/(tabs)/provider-bookings.tsx`)
- [ ] Shows all bookings where `providerId == uid`
- [ ] Filter tabs: All / Pending / Confirmed / Completed / Cancelled
- [ ] Each booking shows: pet owner name, pet name, species, date, time, status
- [ ] Pet profile detail expandable: weight, neutered, allergies, medications (shown as string, never crashes)
- [ ] Actions:
  - Pending → "Confirm" or "Cancel"
  - Confirmed → "Complete" or "Cancel"
  - Completed / Cancelled → no actions
- [ ] Status update writes to Firestore and updates local state immediately
- [ ] When provider marks "completed", `completedAt` timestamp saved to booking
- [ ] Pet owner receives push notification when booking status changes

### 2.5 Provider Profile (`app/(tabs)/provider-profile.tsx`)
- [ ] Shows business name, email, city, bio, rating
- [ ] Edit: business name, city, bio, phone, photo
- [ ] Photo upload works
- [ ] Delete account: confirmation → removes Firestore doc → removes Firebase Auth user → navigates to sign-in

### 2.6 Provider Reviews (`app/(tabs)/provider-reviews.tsx`)
- [ ] Shows all reviews for the provider
- [ ] Each review: reviewer name, rating (stars), comment, date
- [ ] Empty state if no reviews yet

### 2.7 Messages (Provider Side)
- [ ] Same chat rules as pet owner side — provider can only chat with owners who have an active booking
- [ ] Provider sees conversations with pet owners
- [ ] Delete (hide) conversation works the same way

---

## Role 3 — Shelter

### 3.1 Registration & Onboarding
- [ ] Sign up with role = "shelter" → onboarding collects shelter name, city, address, photo
- [ ] After onboarding, navigates to shelter home directly (no approval queue needed)

### 3.2 Shelter Home (`app/(tabs)/shelter-home.tsx`)
- [ ] Shows shelter name and stats (total pets listed, adopted count)
- [ ] Quick links to add pet and manage listings

### 3.3 Shelter Pets (`app/(tabs)/shelter-pets.tsx`, `app/(tabs)/shelter-add-pet.tsx`)
- [ ] List of all pets the shelter has added (from `shelter_pets` collection)
- [ ] Each pet card: photo, name, species, breed, age, status (available / adopted)
- [ ] Tapping a pet opens edit view
- [ ] Add pet: name, species, breed, DOB, description, photo, status
- [ ] Edit pet: all fields editable
- [ ] Delete pet: confirmation then removed from Firestore
- [ ] Photos upload to Firebase Storage correctly

### 3.4 Shelter Profile (`app/(tabs)/shelter-profile.tsx`)
- [ ] Shows shelter name, city, address, contact info
- [ ] Edit profile fields
- [ ] Sign out works

### 3.5 Explore (Pet Owner side, Shelter listings)
- [ ] Pet owners can browse shelter pets on the Explore screen (adoption section)
- [ ] Shelter pets are readable by any signed-in user per Firestore rules
- [ ] Tapping a shelter pet shows full profile with "Inquire" or contact option

---

## Role 4 — Admin

### 4.1 Admin Dashboard (`app/(tabs)/admin-dashboard.tsx`)
- [ ] Accessible only to `mypetdexapp@gmail.com`
- [ ] Shows total users, providers pending, total bookings
- [ ] Links to all admin sub-screens

### 4.2 Provider Approval Queue (`app/(tabs)/admin-providers.tsx`)
- [ ] Lists all users with `role: "pending_provider"`
- [ ] Each row: business name, email, date registered
- [ ] "Approve" → sets `role: "provider"`, sends approval email via Cloud Function
- [ ] "Reject" → sets `role: "rejected_provider"` + `rejectionReason`, sends rejection email
- [ ] After action, the provider disappears from the pending list

### 4.3 Admin Users (`app/(tabs)/admin-users.tsx`)
- [ ] Lists all users (paginated or scrollable)
- [ ] Search by name or email

### 4.4 Admin Reviews (`app/(tabs)/admin-reviews.tsx`)
- [ ] Lists all reviews
- [ ] Can delete a review

---

## Cross-Cutting Checks

### Navigation & Routing
- [ ] Back button never shows route name as label (e.g. "provider/[id]" or "messages/[id]") — all back titles suppressed via `headerBackTitleVisible: false`
- [ ] Tab switching animation has `animation: "none"` — no flicker between tabs
- [ ] Chat screen uses `animation: "fade"` — no slide-through of previous screen
- [ ] Deep linking: opening a notification navigates to the correct screen
- [ ] No screen gets stuck — all loading states resolve (either data or empty state)
- [ ] Auth guard: unauthenticated users always redirect to sign-in; authenticated users never land on sign-in

### Real-time vs One-time Reads
- [ ] Home screen bookings: `onSnapshot` (real-time)
- [ ] Pets list: `onSnapshot` (real-time)
- [ ] Conversations list: `onSnapshot` (real-time)
- [ ] Chat messages: `onSnapshot` (real-time)
- [ ] Provider bookings: `getDocs` (acceptable — pulled on screen focus)
- [ ] Provider profile/pending: `onSnapshot` for role changes

### Error Handling
- [ ] No screen crashes when Firestore returns empty data
- [ ] No `<Text>` component receives a non-string value — all objects/arrays converted to strings before rendering
- [ ] All `.catch()` handlers in place — no unhandled promise rejections
- [ ] `ErrorBoundary` in `_layout.tsx` catches JS crashes and shows "Something went wrong" with Try Again
- [ ] Sentry captures all unhandled errors

### Firestore Security Rules (`firestore.rules`)
- [ ] Users can only read/write their own profile
- [ ] Provider and shelter public profiles readable by any signed-in user
- [ ] Bookings readable/writable by both `uid` (owner) and `providerId`
- [ ] Conversations readable/writable only by `participants` array members
- [ ] Messages subcollection readable/writable only by conversation participants
- [ ] `shelter_pets` readable by any signed-in user, writable only by the owning shelter
- [ ] `reviews` creatable by verified users only, deletable by admin only
- [ ] All other paths denied by default catch-all rule

### Push Notifications
- [ ] Token registered on login for all user types
- [ ] New booking → provider notified
- [ ] Booking status change (confirmed/completed/cancelled) → owner notified
- [ ] New provider registration → admin notified
- [ ] Provider approved/rejected → provider notified (via Cloud Function email + push)

### Subscriptions (RevenueCat)
- [ ] Free plan: max 1 pet
- [ ] Plus plan: max 5 pets, unlocks premium AI features
- [ ] Family plan: unlimited pets, all features
- [ ] Plan correctly detected on app launch via `usePlan` hook
- [ ] Upgrade prompt shown when user hits limit
- [ ] Purchasing a plan via RevenueCat updates plan immediately (no restart required)

---

## How to Audit

1. Read every file listed under `app/(tabs)/` and `app/` that maps to the checks above.
2. For each failing check, fix the issue directly in the relevant file.
3. Do not introduce new dependencies unless absolutely necessary.
4. Do not change the Firestore data model or collection names.
5. Do not modify `firestore.rules` — the rules are already correct and deployed.
6. After all fixes, run `npx tsc --noEmit` and resolve any TypeScript errors.
7. Report a summary of every fix made, grouped by role/section.
