# MyPetDex — Manual Test Checklist (Pre-Submission)

Test on a real iPhone (not simulator). Check each item and mark ✅ or ❌.

---

## 🔐 Authentication

- [ ] **Sign up with email** — create a new account, verify email arrives, click link, lands on app
- [ ] **Sign in with email** — existing account logs in correctly
- [ ] **Wrong password** — shows friendly error (not Firebase code)
- [ ] **Forgot password** — email sent confirmation appears
- [ ] **Google sign-in** — completes without screen flash, lands on home
- [ ] **Sign out** — returns to sign-in screen, no stale data visible
- [ ] **Re-sign in** — previous pet/data loads correctly

---

## 🏠 Home Screen

- [ ] Pet card shows correct name, breed, age, weight
- [ ] Vaccine count and reminder count are accurate
- [ ] "Full Profile" arrow navigates to pet profile
- [ ] Quick Access tiles all navigate correctly (Pet Assistant, Pet Shop, Services, Add Pet)
- [ ] DISCOVER section shows services card
- [ ] Switching pets via dropdown works (if multiple pets)
- [ ] No pets added → shows add-pet prompt, not a crash

---

## 🐾 Pet Profile / Records Tab

- [ ] Pet photo loads (not broken image)
- [ ] QR button opens QR code
- [ ] "Generate Care Resume PDF" generates and opens a PDF
- [ ] Records tab shows vaccinations and vet visits with correct dates
- [ ] Reminders tab shows upcoming reminders
- [ ] Meds tab shows medications
- [ ] Calories tab loads without crash
- [ ] Recipes tab shows saved recipes and ingredient builder
- [ ] Deleting a record shows confirmation, then removes it
- [ ] My Vet section shows vet name and phone
- [ ] Edit vet opens form, saves correctly

---

## ➕ Add Pet

- [ ] Add pet form opens from Quick Access
- [ ] All fields save (name, breed, species, age, weight, activity level)
- [ ] Pet photo upload works
- [ ] After saving, pet appears in the pet switcher

---

## 🤖 AI Pet Advisor

- [ ] **Free user** — upgrade wall appears, "Upgrade" button goes to subscription screen
- [ ] **Plus user** — chat interface loads, pet is pre-selected
- [ ] Sending a message gets a response (no asterisks, no raw markdown)
- [ ] Suggestion chips work (tap to send)
- [ ] "Switch pet" button works if multiple pets
- [ ] Long AI response scrolls correctly
- [ ] Keyboard dismisses properly after sending

---

## 🗺️ Explore — Services

- [ ] Services tab loads provider list
- [ ] Search by zip code returns results
- [ ] Category filter buttons work (Grooming, Vets, Walking, etc.)
- [ ] Tapping a provider opens the detail screen
- [ ] Detail screen shows name, address, phone, reviews
- [ ] No results for unknown zip shows empty state message

---

## 🐶 Explore — Adopt

- [ ] Switching to Adopt tab loads dogs/cats
- [ ] Search by zip returns animals
- [ ] Dog / Cat toggle works
- [ ] Animal cards show name, breed, age, photo
- [ ] "Meet [Name]" button opens correct external link
- [ ] No results shows empty state

---

## 🛒 Shop

- [ ] Product list loads (Amazon products)
- [ ] Category filter tabs work (Food, Treats, Toys, Health, etc.)
- [ ] Tapping "Shop →" opens the correct Amazon link in browser
- [ ] Load error shows retry message (not a crash)
- [ ] Disclaimer "You pay the exact same price" banner visible

---

## 🍽️ Recipes

- [ ] **Free user** — recipe generation shows upgrade CTA
- [ ] **Plus user** — can select ingredients and generate recipe
- [ ] Saved recipes list loads
- [ ] Delete recipe works
- [ ] Share recipe generates PDF

---

## ⚙️ Settings / Me Tab

- [ ] Profile name and email display correctly
- [ ] "Manage Subscription" navigates to subscription screen
- [ ] Subscription screen shows current plan
- [ ] Delete account option exists and works (with confirmation)
- [ ] Sign out works from Me tab

---

## 🔔 Push Notifications

- [ ] Permission prompt appears on first launch (or after sign-in)
- [ ] Accepting permission → token saved (check Firestore users/{uid}.expoPushToken)
- [ ] Reminders set in the app trigger notifications at the right time (test with a 1-minute reminder)

---

## 📱 Screen Rotation

- [ ] Rotating to landscape on every major screen → stays portrait OR rotates gracefully without layout break
- [ ] Keyboard appearance does not shift content off-screen
- [ ] No content is hidden behind the Dynamic Island / notch

---

## 🧭 Navigation Edge Cases

- [ ] Tapping back button on every screen works (no white screen)
- [ ] Deep-linking between tabs does not stack screens incorrectly
- [ ] App backgrounded and resumed → no data loss, no crash
- [ ] App cold-started (killed and reopened) → lands on correct screen based on auth state

---

## ⚠️ Error States

- [ ] No internet connection → app shows error gracefully, not a white screen
- [ ] AI chat with no internet → shows "check your connection" message
- [ ] Image upload failure → shows error, does not crash

---

## 📋 Final Checks

- [ ] App icon appears correctly on home screen (no white border, correct size)
- [ ] Splash screen shows and dismisses cleanly
- [ ] App name on home screen reads "MyPetDex"
- [ ] No test data visible (John's data is fine, but no debug screens accessible to normal users)
- [ ] Admin screens not accessible to non-admin users

---

## After Testing

For every ❌ item, note what happened and open a Cursor fix session.
Once all items pass → proceed with `eas build --platform ios --profile production`.
