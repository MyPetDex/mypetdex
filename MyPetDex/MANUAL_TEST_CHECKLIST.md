# MyPetDex — Manual Test Checklist (Pre-Submission)

Test on a real iPhone using the **TestFlight build** (not Expo Go, not simulator).
Mark each item ✅ or ❌. Fix every ❌ before running `eas submit`.

---

## Before You Start

```bash
# 1. Confirm 0 TypeScript errors
npx tsc --noEmit --skipLibCheck

# 2. Bump build number in app.json BEFORE building
#    "buildNumber": "1"  →  "buildNumber": "2"

# 3. Build
eas build --platform ios --profile production

# 4. Install on your phone via TestFlight, then go through this checklist
```

---

## 🔐 Authentication

- [ ] Sign up with email — account created, verification email arrives, clicking link lands in app
- [ ] Sign in with email — works correctly
- [ ] Wrong password — shows friendly error (not raw Firebase code)
- [ ] Forgot password — confirmation message appears
- [ ] Google sign-in — completes without screen flash, lands on home
- [ ] **Shelter Google sign-in** — after Google auth, onboarding form opens; typing in fields does NOT push keyboard off-screen (keyboard fix)
- [ ] **Provider Google sign-in** — same keyboard check on the provider onboarding form
- [ ] Sign out — returns to sign-in, no stale data visible
- [ ] Re-sign in — previous pet data reloads correctly

---

## 🏠 Home Screen

- [ ] Pet card shows correct name, breed, age, weight
- [ ] Vaccine and reminder counts are accurate
- [ ] "Full Profile" navigates to pet profile
- [ ] Quick Access tiles all navigate (Pet Assistant, Pet Shop, Services, Add Pet)
- [ ] DISCOVER section visible
- [ ] Pet switcher dropdown works with multiple pets
- [ ] No pets → shows add-pet prompt, no crash

---

## 🐾 Pet Profile

- [ ] Pet photo loads correctly
- [ ] QR code button opens QR
- [ ] "Generate Care Resume PDF" generates and opens a PDF
- [ ] Records tab: vaccinations and vet visits show correct dates
- [ ] Reminders tab: upcoming reminders visible
- [ ] Meds tab: medications listed
- [ ] Calories tab loads without crash
- [ ] Recipes tab: saved recipes show, ingredient builder works
- [ ] Deleting a record: confirmation prompt, then removes it
- [ ] My Vet section: name and phone visible
- [ ] Edit vet form: opens, saves without keyboard pushing content off-screen

---

## ➕ Add Pet

- [ ] Form opens from Quick Access
- [ ] All fields save (name, breed, species, age, weight, activity level)
- [ ] Pet photo upload works
- [ ] After saving, new pet appears in the switcher

---

## 🤖 AI Pet Advisor

- [ ] Free user → upgrade wall appears, "Upgrade" goes to subscription screen
- [ ] Plus user → chat interface loads, pet pre-selected
- [ ] Sending a message gets a response (no asterisks, clean text)
- [ ] Suggestion chips work
- [ ] Switch pet works with multiple pets
- [ ] Long response scrolls correctly
- [ ] Keyboard dismisses after sending

---

## 🗺️ Explore — Services Tab

- [ ] **Green hero banner** shows "Trusted Pet Care, Near You" with stats row (500+ / 6 / All US)
- [ ] Service type cards have icon circles (not plain emoji) — Grooming = scissors, Vet = red cross, etc.
- [ ] State dropdown and zip filter work
- [ ] Search returns results (try NJ, 08816)
- [ ] Category filter chips narrow results correctly
- [ ] Tapping a provider opens the detail screen
- [ ] Detail screen shows name, type, location, phone, website, price range, reviews
- [ ] **"Request Booking" button** appears on user-registered providers (id starts with user_)
- [ ] **Booking modal** opens: date field (required), time, notes
- [ ] Submitting a booking → success state shows "Request Sent!"
- [ ] Booking appears in the provider's Bookings tab (verify with a provider test account)
- [ ] Seed providers (non-user providers) do NOT show the booking button
- [ ] No results state shows correctly

---

## 🐶 Explore — Adopt Tab

- [ ] **Blue hero banner** shows "Every Rescue Deserves a Family" with stats row
- [ ] Breed chips scroll horizontally (dogs / cats)
- [ ] "How adoption works" steps card visible
- [ ] Dog / Cat toggle works and updates breed chips and hero subtitle
- [ ] Entering a zip code and tapping Search → **opens Adopt-a-Pet in an in-app Safari sheet** (not a broken page)
- [ ] Adopt-a-Pet page loads correctly for dogs: adoptapet.com/dog-adoption?zip=...
- [ ] Adopt-a-Pet page loads correctly for cats: adoptapet.com/cat-adoption?zip=...
- [ ] "Powered by Adopt-a-Pet.com" link at bottom is tappable
- [ ] Search button is disabled when zip has fewer than 5 digits

---

## 🛒 Shop Tab

- [ ] Dog / Cat species toggle works
- [ ] Amazon tab and Chewy tab both selectable
- [ ] **Category icons are correct** — Food = burger icon, Treats = gift, Toys = basketball, Health = medical cross, Grooming = scissors, Accessories = bag, Beds = bed
- [ ] Tapping a product in Amazon tab → opens Amazon search with `&tag=mypetdex20-20` in the URL
- [ ] Tapping a product in Chewy tab → opens `chewy.sjv.io/c/7270969/...` affiliate link
- [ ] Search bar filters products correctly
- [ ] All 7 category filter chips work

---

## 🍽️ Recipes

- [ ] Free user → recipe generation shows upgrade prompt
- [ ] Plus user → can select ingredients and generate a recipe
- [ ] Saved recipes list loads
- [ ] Delete recipe works
- [ ] Share recipe generates and opens a PDF

---

## 🏠 Shelter Account Flow

- [ ] Shelter signs up via Google → onboarding form opens without keyboard issues
- [ ] Shelter fills details → lands on shelter home screen after submit
- [ ] Shelter home screen shows manage pets, bookings links
- [ ] Shelter can add a pet (shelter-add-pet screen)
- [ ] **Send Feedback modal** in shelter profile: typing does not push content off-screen (keyboard fix)

---

## 🛎️ Provider Account Flow

- [ ] Provider signs up → goes to pending screen "Under Review"
- [ ] Admin approves → provider sees their home screen (not pending)
- [ ] Provider profile: edit business name, bio, phone saves correctly
- [ ] **Send Feedback modal** in provider profile: typing works without keyboard bug
- [ ] Provider bookings tab: shows incoming bookings from users
- [ ] Provider can confirm/decline/complete a booking

---

## ⚙️ Settings / Me Tab

- [ ] Name and email display correctly
- [ ] "Manage Subscription" navigates to subscription screen
- [ ] Subscription screen shows current plan
- [ ] **Send Feedback modal**: typing in the feedback field does NOT push content off-screen (keyboard fix)
- [ ] Delete account shows confirmation, then deletes
- [ ] Sign out works

---

## 🔔 Notifications

- [ ] Permission prompt appears on first launch
- [ ] Accepting saves token to Firestore (users/{uid}.expoPushToken)
- [ ] A reminder set in the app triggers a push notification at the right time

---

## 📱 Layout & Keyboard (Global)

- [ ] On every screen with a text input: keyboard appears without pushing content off-screen
- [ ] On every modal with a text input: no infinite white scroll below the modal
- [ ] No content hidden behind Dynamic Island or notch
- [ ] Portrait orientation maintained on all screens

---

## 🧭 Navigation Edge Cases

- [ ] Back button works on every screen (no white screen)
- [ ] App backgrounded and resumed → no data loss
- [ ] App killed and cold-started → correct screen based on auth state (home if signed in, sign-in if not)
- [ ] Switching tabs rapidly → no crash

---

## ⚠️ Error States

- [ ] No internet → app shows error gracefully, not a white screen
- [ ] AI chat offline → friendly "check your connection" message
- [ ] Image upload failure → error shown, no crash

---

## 📋 Final Checks Before Submitting

- [ ] App icon correct on home screen (no white border)
- [ ] Splash screen shows and dismisses cleanly
- [ ] App name on home screen reads "MyPetDex"
- [ ] No debug or test screens accessible to regular users
- [ ] Admin screens not accessible to non-admin users
- [ ] `buildNumber` in app.json is **"2"** (or higher — never reuse a number)
- [ ] `version` in app.json is **"1.0.0"** (or your intended release version)
- [ ] App Store Connect: description filled in
- [ ] App Store Connect: keywords filled in
- [ ] App Store Connect: privacy policy URL entered
- [ ] App Store Connect: age rating completed
- [ ] App Store Connect: 6.9" iPhone screenshots uploaded (5–10 screens)

---

## When All Items Pass

```bash
eas submit --platform ios --latest
```

Then in App Store Connect → click "Submit for Review".
