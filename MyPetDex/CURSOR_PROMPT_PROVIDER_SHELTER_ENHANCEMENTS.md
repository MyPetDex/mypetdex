# Provider Dashboard + Shelter Dashboard Enhancements

## Overview
The base dashboards already exist and are solid. This prompt adds targeted enhancements:
- **Provider**: pending bookings alert on home screen, weekly availability editor in services
- **Shelter**: 45-day listing expiry system with countdown badges, "Still Available" refresh, expiry warnings

Do NOT rebuild the existing screens. Edit only what's described below.

---

## PART 1: Provider Enhancements

### 1A. `app/(tabs)/provider-home.tsx` — Add pending bookings alert

Currently `loadData()` fetches total bookings count. Update it to also count pending-status bookings separately.

**In `loadData()`**, update the bookings query to fetch all bookings and count pending ones:

```ts
const bookingsSnap = await getDocs(
  query(collection(webDb, "bookings"), where("providerId", "==", user.uid))
);
let pendingCount = 0;
bookingsSnap.forEach(d => {
  if (d.data().status === "pending") pendingCount++;
});
```

**Update the `stats` state** to include `pending`:

```ts
const [stats, setStats] = useState({ bookings: 0, reviews: 0, rating: 0, pending: 0 });
// ...
setStats({ bookings: bookingsSnap.size, reviews: reviewsSnap.size, rating: avgRating, pending: pendingCount });
```

**Update the stats row** to show 4 cards (Total, Pending, Reviews, Rating):

```tsx
<View style={s.statsRow}>
  <View style={s.statCard}>
    <Text style={s.statNum}>{stats.bookings}</Text>
    <Text style={s.statLabel}>Total</Text>
  </View>
  <View style={[s.statCard, stats.pending > 0 && s.statCardPending]}>
    <Text style={[s.statNum, stats.pending > 0 && { color: "#F5A623" }]}>{stats.pending}</Text>
    <Text style={s.statLabel}>Pending</Text>
  </View>
  <View style={s.statCard}>
    <Text style={s.statNum}>{stats.reviews}</Text>
    <Text style={s.statLabel}>Reviews</Text>
  </View>
  <View style={s.statCard}>
    <Text style={s.statNum}>{stats.rating > 0 ? stats.rating.toFixed(1) : "—"}</Text>
    <Text style={s.statLabel}>Rating</Text>
  </View>
</View>
```

**Add `statCardPending` to StyleSheet**:
```ts
statCardPending: { borderWidth: 1.5, borderColor: "rgba(245,166,35,0.4)" },
```

**Add pending alert card** — insert this immediately above the "Quick Actions" section title, only when `stats.pending > 0`:

```tsx
{stats.pending > 0 && (
  <TouchableOpacity
    style={s.pendingAlert}
    onPress={() => router.push("/(tabs)/provider-bookings" as any)}
  >
    <Ionicons name="notifications-outline" size={18} color="#fff" />
    <Text style={s.pendingAlertText}>
      {stats.pending} booking request{stats.pending > 1 ? "s" : ""} waiting for your response
    </Text>
    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
  </TouchableOpacity>
)}
```

**Add `pendingAlert` and `pendingAlertText` to StyleSheet**:
```ts
pendingAlert: {
  flexDirection: "row", alignItems: "center", gap: 10,
  backgroundColor: "#F5A623", borderRadius: 14, padding: 14,
  marginBottom: 16,
},
pendingAlertText: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 14 },
```

---

### 1B. `app/(tabs)/provider-services.tsx` — Add availability editor

This is a new section added to the existing screen. Add it **below the existing Google Reviews card** (before the edit Modal).

**Add to state**:
```ts
const [availability, setAvailability] = useState<Record<string, any>>({});
const [editAvail, setEditAvail] = useState(false);
const [availForm, setAvailForm] = useState<Record<string, any>>({});
```

**In `loadProfile()`**, load availability:
```ts
setAvailability(d.availability || defaultAvailability());
setAvailForm(d.availability || defaultAvailability());
```

**Add `defaultAvailability()` helper** (place outside component):
```ts
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};
const SLOT_OPTIONS = [30, 60, 90];

function defaultAvailability() {
  const avail: Record<string, any> = {};
  DAYS.forEach(d => {
    avail[d] = { closed: d === "sunday", open: "09:00", close: "17:00", slotMinutes: 60 };
  });
  return avail;
}
```

**Add `saveAvailability()` function**:
```ts
async function saveAvailability() {
  if (!user) return;
  setSaving(true);
  try {
    await updateDoc(doc(webDb, "users", user!.uid), { availability: availForm });
    setAvailability(availForm);
    setEditAvail(false);
  } catch {
    Alert.alert("Error", "Failed to save availability.");
  } finally { setSaving(false); }
}
```

**Availability display card** — add this JSX block below the Google Reviews card:

```tsx
<View style={s.card}>
  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
    <Text style={s.cardTitle}>📅 Availability & Booking Slots</Text>
    <TouchableOpacity style={s.editBtn} onPress={() => setEditAvail(true)}>
      <Ionicons name="pencil" size={14} color="#fff" />
      <Text style={s.editBtnText}>Edit</Text>
    </TouchableOpacity>
  </View>
  {DAYS.map(day => {
    const a = availability[day] || { closed: true, open: "09:00", close: "17:00", slotMinutes: 60 };
    return (
      <View key={day} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
        <Text style={{ fontSize: 13, color: a.closed ? "#CBD5E1" : "#1E293B", fontWeight: "600", width: 90 }}>{DAY_LABELS[day]}</Text>
        {a.closed ? (
          <Text style={{ fontSize: 13, color: "#CBD5E1" }}>Closed</Text>
        ) : (
          <Text style={{ fontSize: 13, color: "#64748B" }}>{a.open} – {a.close} · {a.slotMinutes}min slots</Text>
        )}
      </View>
    );
  })}
</View>
```

**Availability edit Modal** — add a second `<Modal>` after the existing edit Modal:

```tsx
<Modal visible={editAvail} animationType="slide" presentationStyle="pageSheet">
  <ScrollView style={s.modal} contentContainerStyle={s.modalContent}>
    <View style={s.modalHeader}>
      <Text style={s.modalTitle}>Availability</Text>
      <TouchableOpacity onPress={() => setEditAvail(false)}>
        <Ionicons name="close" size={24} color="#64748B" />
      </TouchableOpacity>
    </View>
    <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 20, lineHeight: 19 }}>
      Set the days and hours you accept bookings. Pet owners will only see available slots when booking.
    </Text>

    {DAYS.map(day => {
      const a = availForm[day] || { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 };
      function updateDay(patch: Record<string, any>) {
        setAvailForm(f => ({ ...f, [day]: { ...a, ...patch } }));
      }
      return (
        <View key={day} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: a.closed ? "#E2E8F0" : "#4486F4" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: a.closed ? 0 : 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>{DAY_LABELS[day]}</Text>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: a.closed ? "#F1F5F9" : "#4486F4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
              onPress={() => updateDay({ closed: !a.closed })}
            >
              <Ionicons name={a.closed ? "close-circle-outline" : "checkmark-circle"} size={14} color={a.closed ? "#94A3B8" : "#fff"} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: a.closed ? "#94A3B8" : "#fff" }}>{a.closed ? "Closed" : "Open"}</Text>
            </TouchableOpacity>
          </View>

          {!a.closed && (
            <>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Opens</Text>
                  <TextInput
                    style={s.input}
                    value={a.open}
                    onChangeText={v => updateDay({ open: v })}
                    placeholder="09:00"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Closes</Text>
                  <TextInput
                    style={s.input}
                    value={a.close}
                    onChangeText={v => updateDay({ close: v })}
                    placeholder="17:00"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <Text style={s.label}>Slot Duration</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {SLOT_OPTIONS.map(min => (
                  <TouchableOpacity
                    key={min}
                    style={[s.chip, a.slotMinutes === min && s.chipActive, { flex: 1, justifyContent: "center" }]}
                    onPress={() => updateDay({ slotMinutes: min })}
                  >
                    <Text style={[s.chipText, a.slotMinutes === min && s.chipTextActive]}>{min} min</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      );
    })}

    <TouchableOpacity style={s.saveBtn} onPress={saveAvailability} disabled={saving}>
      {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Availability</Text>}
    </TouchableOpacity>
  </ScrollView>
</Modal>
```

---

## PART 2: Shelter Enhancements

### 2A. `app/(tabs)/shelter-add-pet.tsx` — Set expiry date when adding pet

In `handleSubmit()`, find the `addDoc(collection(webDb, "shelter_pets"), {...})` call and add `expiresAt` and `listedAt` to the document:

```ts
import { Timestamp } from "firebase/firestore";

// Inside handleSubmit(), in the addDoc call, add these fields:
listedAt: serverTimestamp(),
expiresAt: Timestamp.fromDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)),
```

The `Timestamp` import comes from `"firebase/firestore"` — add it to the existing import line.

---

### 2B. `app/(tabs)/shelter-pets.tsx` — Expiry countdown + refresh

**Add expiry helper functions** (outside component):

```ts
function daysUntilExpiry(expiresAt: any): number | null {
  if (!expiresAt?.seconds) return null;
  const ms = expiresAt.seconds * 1000 - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function expiryLabel(days: number | null): { text: string; color: string } | null {
  if (days === null) return null;
  if (days <= 0) return { text: "Listing expired", color: "#EF4444" };
  if (days <= 7) return { text: `Expires in ${days}d`, color: "#F5A623" };
  if (days <= 14) return { text: `Expires in ${days}d`, color: "#94A3B8" };
  return null; // don't show if more than 14 days
}
```

**Add `refreshListing()` function** (inside component):

```ts
async function refreshListing(petId: string) {
  if (!user) return;
  const newExpiry = Timestamp.fromDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000));
  await updateDoc(doc(webDb, "shelter_pets", petId), { expiresAt: newExpiry });
  setPets(prev => prev.map(p => p.id === petId ? { ...p, expiresAt: newExpiry } : p));
}
```

Make sure `Timestamp` is imported from `"firebase/firestore"`.

**Update the pet card JSX** — in the existing pet card render (inside the `pets.filter(...).map(...)` or equivalent), after the status badge and before the edit/delete buttons, add the expiry badge and "Still Available" button:

```tsx
{/* Expiry badge */}
{(() => {
  const days = daysUntilExpiry((pet as any).expiresAt);
  const label = expiryLabel(days);
  if (!label) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
      <Ionicons name="time-outline" size={13} color={label.color} />
      <Text style={{ fontSize: 12, color: label.color, fontWeight: "600" }}>{label.text}</Text>
      {(days !== null && days <= 7) && (
        <TouchableOpacity
          onPress={() => Alert.alert(
            "Still Available?",
            "This will refresh the listing for another 45 days.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Refresh", onPress: () => refreshListing(pet.id) },
            ]
          )}
          style={{ marginLeft: 6, backgroundColor: "#4486F4", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Still Available</Text>
        </TouchableOpacity>
      )}
    </View>
  );
})()}
```

Place this block in the pet card UI, just below where the pet name and status badge are shown, and above the action buttons (edit/delete).

Also update the `PetRecord` type to include `expiresAt`:
```ts
type PetRecord = {
  // ...existing fields...
  expiresAt?: any;
};
```

---

## Firestore rules — no changes needed
The existing `shelter_pets` rules already cover shelter owners writing their own pets. No changes required.

---

## What NOT to change
- Do not touch `provider-home.tsx` stats card styles (only add `statCardPending`)
- Do not change `shelter-home.tsx` — it's complete
- Do not change `shelter-add-pet.tsx` beyond adding `listedAt` + `expiresAt` to the `addDoc` call
- Do not change any auth flow, Cloud Functions, Stripe, Resend, Firestore rules, or storage rules
- Do not change any pet owner screens (index, explore, shopping, ai, me)
- Do not change `app.json`, `firestore.rules`, or `storage.rules`

---

## After applying

**No new build required** — all changes are JavaScript-only.

Test as provider:
1. Create a booking request (from an owner account) → provider home should show orange pending alert
2. Open Services tab → Availability section should appear → tap Edit, toggle days, change times → Save

Test as shelter:
1. Add a new pet → in shelter-pets, the pet card should have no expiry badge (45 days is fine)
2. In Firestore console, manually set `expiresAt` to a past date for a pet → reload shelter-pets → should show red "Listing expired" badge
3. Set `expiresAt` to 3 days from now → should show orange "Expires in 3d" badge + "Still Available" button → tap it → should reset to 45 days

Commit:
```bash
git add app/(tabs)/provider-home.tsx app/(tabs)/provider-services.tsx app/(tabs)/shelter-add-pet.tsx app/(tabs)/shelter-pets.tsx
git commit -m "feat: provider pending bookings alert, availability editor, shelter pet expiry system"
```
