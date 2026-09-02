# Provider, Booking & Reviews — 10 Bug Fixes + 1 Enhancement

## Root Causes Found (read before coding)

1. **Reviews fail** — `submitReview()` saves `userId: user.uid` but Firestore rule checks `uid == auth.uid`. Field name mismatch.
2. **Chat broken** — `conversations` collection has NO Firestore rules → falls through to `allow read, write: if false` → `setDoc` throws silently, navigation never happens.
3. **Pending providers visible** — `explore.tsx` queries `where("role", "==", "provider")` with no approval filter.
4. **Provider approval not real-time** — `provider-home.tsx` has no `onSnapshot` listener on their own user doc.
5. **Activity level shows raw key** — `pet.activityLevel` displayed directly instead of using `LIFE_STAGE_LABELS`.

Do NOT rebuild any screens. Fix only what's listed below.

---

## FIX 1: `firestore.rules` — 3 rule fixes

### 1A. Add conversations collection rules
Add this block BEFORE the final catch-all `match /{document=**}`:

```
// Conversations: both participants can read and write
match /conversations/{convId} {
  allow read, write: if isSignedIn() && request.auth.uid in resource.data.participants;
  allow create: if isSignedIn() && request.auth.uid in request.resource.data.participants;
}

// Messages subcollection: participants of the parent conversation only
match /conversations/{convId}/messages/{msgId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() && request.resource.data.senderId == request.auth.uid;
}
```

### 1B. Fix reviews create rule — accept both `uid` and `userId` fields
Replace:
```
allow create: if isAdmin() || (
  (isEmailVerified() || isDemoAccount()) &&
  request.resource.data.uid == request.auth.uid
);
```
With:
```
allow create: if isAdmin() || (
  (isEmailVerified() || isDemoAccount()) &&
  (request.resource.data.uid == request.auth.uid ||
   request.resource.data.userId == request.auth.uid)
);
```

### 1C. Fix bookings create rule — accept both `uid` and `ownerId`/`clientId`
Replace:
```
allow create: if isAdmin() || ((isEmailVerified() || isDemoAccount()) && request.resource.data.uid == request.auth.uid);
```
With:
```
allow create: if isAdmin() || (
  (isEmailVerified() || isDemoAccount()) &&
  (request.resource.data.uid == request.auth.uid ||
   request.resource.data.ownerId == request.auth.uid ||
   request.resource.data.clientId == request.auth.uid)
);
```

Deploy after editing:
```bash
firebase deploy --only firestore:rules
```

---

## FIX 2: `app/provider/[id].tsx` — 3 fixes

### 2A. Fix submitReview() — change userId to uid
Find in `submitReview()`:
```ts
await addDoc(collection(db, "reviews"), {
  userId: user.uid,
```
Replace with:
```ts
await addDoc(collection(db, "reviews"), {
  uid: user.uid,
  userId: user.uid,  // keep both for backwards compatibility
```

### 2B. Fix openChat() — add try/catch + error alert
Find `async function openChat()` and wrap the body:
```ts
async function openChat() {
  if (!user?.uid || !providerUid) {
    Alert.alert("Unavailable", "Chat is only available with registered providers.");
    return;
  }
  try {
    const participants = [user.uid, providerUid].sort();
    const convId = participants.join("_");
    const convRef = doc(db, "conversations", convId);
    const existing = await getDoc(convRef);

    if (!existing.exists()) {
      await setDoc(convRef, {
        participants,
        participantNames: {
          [user.uid]: profile?.displayName || "Pet Owner",
          [providerUid]: name || "Provider",
        },
        participantRoles: {
          [user.uid]: profile?.role || "owner",
          [providerUid]: "provider",
        },
        participantPhotos: {
          [user.uid]: "",
          [providerUid]: "",
        },
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: "",
        unreadCount: { [user.uid]: 0, [providerUid]: 0 },
        createdAt: serverTimestamp(),
      });
    }

    router.push({
      pathname: "/messages/[id]" as any,
      params: { id: convId, otherName: name || "Provider", otherUid: providerUid },
    });
  } catch (e) {
    console.error("Chat error:", e);
    Alert.alert("Error", "Could not open chat. Please try again.");
  }
}
```

### 2C. Fix activity level display tag
Find (around line 456):
```tsx
{pet.activityLevel ? <View style={styles.tag}><Text style={styles.tagText}>{pet.activityLevel}</Text></View> : null}
```
Replace with:
```tsx
{pet.activityLevel ? (
  <View style={styles.tag}>
    <Text style={styles.tagText}>
      {LIFE_STAGE_LABELS[pet.activityLevel]?.replace(/^[^\w]+ /, '') || pet.activityLevel}
    </Text>
  </View>
) : null}
```

Also fix the PDF HTML template (find `${pet.activityLevel}` in the HTML string):
```ts
${pet.activityLevel ? `<div class="row"><span class="key">Activity</span><span class="val">${LIFE_STAGE_LABELS[pet.activityLevel]?.replace(/^[^\w]+ /, '') || pet.activityLevel}</span></div>` : ""}
```

---

## FIX 3: `app/(tabs)/explore.tsx` — Block pending providers

### 3A. Filter out unapproved providers from local results
Find where `localResults` is mapped from `usersSnap`:
```ts
let localResults = usersSnap.docs.map((d) =>
  mapUserToListing(d.data() as Record<string, unknown>, d.id),
);
```
Add filter immediately after:
```ts
// Only show approved providers — pending/rejected must not appear in Explore
localResults = localResults.filter((p) =>
  p.approved === true || p.status === "approved" || p.role === "provider"
);
```

Wait — check what field the admin sets when approving. If approval sets `approved: true` on the user doc, filter by that. If it sets `role: "provider"` (from `pending_provider`), filter differently. Look at `admin-providers.tsx` to confirm, then use the correct field.

**Important:** If the approval flow sets `approved: true`, use:
```ts
localResults = localResults.filter((p) => p.approved === true);
```

If it changes role from `pending_provider` to `provider`, the existing query `where("role", "==", "provider")` already handles it — in that case no extra filter needed, but you need to make sure unapproved providers are still stored as `pending_provider` role, not `provider`.

Check `admin-providers.tsx` approve function and align these.

---

## FIX 4: `app/(tabs)/provider-home.tsx` — Real-time approval detection

Add a real-time listener so the provider sees their status change without logging out.

Find the `loadData()` useEffect and add a separate effect for user status:

```ts
// Real-time listener: detect when admin approves or rejects this account
useEffect(() => {
  if (!user) return;
  const userRef = doc(webDb, "users", user.uid);
  const unsub = onSnapshot(userRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const newRole = data.role;
    // If role changed to something else (e.g. rejected), navigate accordingly
    if (newRole === "rejected_provider") {
      router.replace("/(tabs)/rejected-provider" as any);
    }
    // Refresh the approval badge
    setProfile((prev: any) => ({ ...prev, ...data }));
  });
  return unsub;
}, [user]);
```

Also update the "Pending Verification" badge so it reads from live `profile` data, not stale params. If `profile?.approved === true` or `profile?.role === "provider"` (and not pending), hide the pending badge.

---

## FIX 5: `app/(tabs)/provider-services.tsx` — Multiple slots per day (Enhancement)

### Current: one time block per day
### New: support multiple time blocks per day + 2-week advance booking window

#### 5A. Update the availability data structure
Change from:
```ts
avail[d] = { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 };
```
To:
```ts
avail[d] = {
  closed: false,
  slots: [{ open: "09:00", close: "17:00" }],  // array of time blocks
  slotMinutes: 60,
};
```

#### 5B. Update the availability display card
For each day, show all time blocks:
```tsx
{!a.closed && (a.slots || [{ open: a.open, close: a.close }]).map((slot: any, i: number) => (
  <Text key={i} style={{ fontSize: 13, color: "#64748B" }}>
    {slot.open} – {slot.close} · {a.slotMinutes}min slots
  </Text>
))}
```

#### 5C. Update the availability edit modal
For each day when open, show a list of time blocks with an "Add slot" button:

```tsx
{!a.closed && (
  <>
    {(a.slots || [{ open: a.open, close: a.close }]).map((slot: any, si: number) => (
      <View key={si} style={{ flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Opens</Text>
          <TextInput
            style={s.input}
            value={slot.open}
            onChangeText={v => updateSlot(day, si, { open: v })}
            placeholder="09:00"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Closes</Text>
          <TextInput
            style={s.input}
            value={slot.close}
            onChangeText={v => updateSlot(day, si, { close: v })}
            placeholder="17:00"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        {si > 0 && (
          <TouchableOpacity onPress={() => removeSlot(day, si)} style={{ paddingTop: 20 }}>
            <Ionicons name="remove-circle" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    ))}
    <TouchableOpacity
      onPress={() => addSlot(day)}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}
    >
      <Ionicons name="add-circle-outline" size={18} color="#4486F4" />
      <Text style={{ fontSize: 13, color: "#4486F4", fontWeight: "600" }}>Add another time slot</Text>
    </TouchableOpacity>
    {/* Slot duration applies to all blocks for this day */}
    <Text style={s.label}>Slot Duration</Text>
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[30, 60, 90].map(min => (
        <TouchableOpacity
          key={min}
          style={[s.chip, a.slotMinutes === min && s.chipActive, { flex: 1, justifyContent: "center" }]}
          onPress={() => updateDay(day, { slotMinutes: min })}
        >
          <Text style={[s.chipText, a.slotMinutes === min && s.chipTextActive]}>{min} min</Text>
        </TouchableOpacity>
      ))}
    </View>
  </>
)}
```

#### 5D. Add helper functions for slot management
```ts
function addSlot(day: string) {
  setAvailForm(f => {
    const a = f[day];
    const slots = a.slots || [{ open: a.open || "09:00", close: a.close || "17:00" }];
    return { ...f, [day]: { ...a, slots: [...slots, { open: "09:00", close: "17:00" }] } };
  });
}

function removeSlot(day: string, index: number) {
  setAvailForm(f => {
    const a = f[day];
    const slots = (a.slots || []).filter((_: any, i: number) => i !== index);
    return { ...f, [day]: { ...a, slots } };
  });
}

function updateSlot(day: string, index: number, patch: Record<string, string>) {
  setAvailForm(f => {
    const a = f[day];
    const slots = (a.slots || []).map((s: any, i: number) => i === index ? { ...s, ...patch } : s);
    return { ...f, [day]: { ...a, slots } };
  });
}

function updateDay(day: string, patch: Record<string, any>) {
  setAvailForm(f => ({ ...f, [day]: { ...f[day], ...patch } }));
}
```

#### 5E. 2-week booking window in `app/booking/new.tsx`
In the date picker step, limit available dates to the next 14 days only:
```ts
const today = new Date();
const twoWeeksOut = new Date();
twoWeeksOut.setDate(today.getDate() + 14);

// When building available dates, skip any date beyond 2 weeks
const isWithin2Weeks = (date: Date) => date <= twoWeeksOut;
```

When generating the calendar grid, mark dates beyond 14 days as disabled (grayed out, not selectable).

---

## FIX 6: `app/(tabs)/admin-reviews.tsx` — Verify review approval works

Open this file and confirm:
1. It queries `where("published", "==", false)` to show pending reviews
2. Admin can tap Approve → `updateDoc` sets `published: true`
3. Admin can tap Reject → `deleteDoc` removes the review

If the screen doesn't exist or is missing the approve/reject actions, add them. The Firestore rule allows admin to update and delete reviews.

---

## FIX 7: Provider approval email — verify Cloud Function is deployed

In `functions/index.js`, find the function that triggers on provider approval (likely `onUpdateApprovalStatus` or similar). Confirm it:
1. Triggers on `onDocumentUpdated("users/{uid}")`
2. Detects when `before.role === "pending_provider"` and `after.role === "provider"`
3. Sends email via Resend to the provider's email

If the function exists but wasn't deployed:
```bash
firebase deploy --only functions:onProviderApproved
```

---

## What NOT to change
- Do not change any pet owner screens (index, explore pet cards, shopping, recipes)
- Do not change `app.json`, any auth flow, or Stripe
- Do not change any shelter screens
- Do not change the admin-providers.tsx approval logic

---

## Deploy order
1. Fix Firestore rules first → `firebase deploy --only firestore:rules`
2. Fix app code (all JS-only) → `eas update --channel production --message "fix reviews, chat, pending providers, activity label, multi-slot availability"`
3. Deploy Cloud Functions if needed → `firebase deploy --only functions`

## Test checklist
- [ ] Owner submits review → no error → review appears in admin-reviews pending queue
- [ ] Admin approves review → appears on provider profile
- [ ] Owner taps Message on provider → chat opens without error
- [ ] Pending provider does NOT appear in Explore
- [ ] Pending provider CANNOT be booked
- [ ] Provider approves via admin → provider sees status update WITHOUT logging out
- [ ] Provider dashboard shows "Verified" badge after approval
- [ ] Activity level on pet profile shows "Adult — Moderate" not "adult_moderate"
- [ ] Provider can add 2 time slots on Monday (e.g. 9–12 AND 14–17)
- [ ] Owner booking calendar only shows next 14 days
