# Final Fixes — Booking, Calendar, Chat Names, Navigation, Search

Do NOT change auth, subscriptions, pet profiles, recipes, shopping, or admin screens.
Fix only the files and functions described below. After each file change, verify TypeScript compiles.

---

## FIX 1: `app/booking/new.tsx` — Conflict check must never crash booking

Find `checkConflict()` and wrap the ENTIRE function body in try/catch:

```ts
async function checkConflict(date: string, slot: string): Promise<boolean> {
  try {
    const snap = await getDocs(
      query(
        collection(webDb, "bookings"),
        where("providerId", "==", providerId),
        where("date", "==", date),
        where("timeSlot", "==", slot),
        where("status", "in", ["pending", "confirmed"]),
      )
    );
    return !snap.empty;
  } catch (e) {
    console.warn("Conflict check skipped:", e);
    return false; // if check fails, allow booking to proceed
  }
}
```

Also wrap the conflict check call site in try/catch so no error from this function ever reaches the user as "Failed to send booking request."

---

## FIX 2: `app/(tabs)/messages.tsx` — Resolve real provider/owner name from Firestore

The stored `participantNames[otherUid]` is often `"Provider"` or `"User"` for old conversations.
Fix: In `ConvRow`, fetch the real name from Firestore if the stored name is generic.

Add a `useEffect` inside `ConvRow` (or hoist to parent) that resolves names:

```ts
const [resolvedName, setResolvedName] = useState<string>(
  conv.participantNames?.[otherUid] || "User"
);

useEffect(() => {
  const stored = conv.participantNames?.[otherUid] || "";
  if (!stored || stored === "Provider" || stored === "User" || stored === "Pet Owner") {
    // Fetch real name from Firestore
    getDoc(doc(db, "users", otherUid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const name = d.businessName || d.displayName || d.email?.split("@")[0] || "User";
        setResolvedName(name);
      }
    }).catch(() => {});
  } else {
    setResolvedName(stored);
  }
}, [otherUid, conv.participantNames]);
```

Use `resolvedName` everywhere `otherName` was used in the row (avatar letter, name label, navigation param).

Make sure `getDoc` and `doc` are imported from `firebase/firestore` and `db` is the Firestore instance.

---

## FIX 3: `app/(tabs)/provider-services.tsx` — Real calendar for provider with date + booked slots

### What to build
Replace the static "Mon–Sun open hours" display with a **two-section layout**:
- **Section A**: A 4-week scrollable date calendar showing which days the provider is open
- **Section B**: Upcoming confirmed/pending bookings per day, with ability to block a date

### 3A. Generate 28-day calendar grid

```ts
function generateCalendarDays(availability: any): { date: string; label: string; dayName: string; isOpen: boolean }[] {
  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const result = [];
  const today = new Date();
  for (let i = 0; i <= 27; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = days[d.getDay()];
    const isOpen = !!availability?.[dayName]?.open;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    result.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      dayName,
      isOpen,
    });
  }
  return result;
}
```

### 3B. State

```ts
const [calendarDays, setCalendarDays] = useState<any[]>([]);
const [selectedCalDate, setSelectedCalDate] = useState<string>("");
const [dayBookings, setDayBookings] = useState<any[]>([]);
const [blockedDates, setBlockedDates] = useState<string[]>([]); // dates provider manually blocked
```

Load `blockedDates` from `users/{uid}.blockedDates` (array field) on mount.

### 3C. When provider selects a date, load bookings for that day

```ts
async function loadDayBookings(date: string) {
  if (!user) return;
  try {
    const snap = await getDocs(
      query(
        collection(webDb, "bookings"),
        where("providerId", "==", user.uid),
        where("date", "==", date),
      )
    );
    setDayBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.warn("loadDayBookings error:", e);
    setDayBookings([]);
  }
}
```

### 3D. Block/unblock a date

Provider can mark a specific date as blocked (no bookings accepted):

```ts
async function toggleBlockDate(date: string) {
  if (!user) return;
  const isBlocked = blockedDates.includes(date);
  const updated = isBlocked
    ? blockedDates.filter(d => d !== date)
    : [...blockedDates, date];
  setBlockedDates(updated);
  await updateDoc(doc(webDb, "users", user.uid), { blockedDates: updated });
}
```

### 3E. Calendar UI

Show a horizontal scrollable row of day chips at the top, then below it the bookings for the selected day:

```tsx
{/* Calendar strip */}
<Text style={{ fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 10 }}>
  Schedule
</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
  {calendarDays.map((day) => {
    const isBlocked = blockedDates.includes(day.date);
    const isSelected = selectedCalDate === day.date;
    const bgColor = isBlocked ? "#FEE2E2" : isSelected ? "#4486F4" : day.isOpen ? "#fff" : "#F8FAFC";
    const textColor = isBlocked ? "#991B1B" : isSelected ? "#fff" : day.isOpen ? "#1E293B" : "#CBD5E1";
    return (
      <Pressable
        key={day.date}
        onPress={() => { setSelectedCalDate(day.date); loadDayBookings(day.date); }}
        style={{
          marginRight: 8, padding: 10, borderRadius: 14, alignItems: "center",
          backgroundColor: bgColor, borderWidth: 1,
          borderColor: isSelected ? "#4486F4" : isBlocked ? "#FCA5A5" : "#E2E8F0",
          minWidth: 64, opacity: day.isOpen || isBlocked ? 1 : 0.4,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "700", color: textColor }}>
          {day.label.split(" ")[0].toUpperCase()}
        </Text>
        <Text style={{ fontSize: 20, fontWeight: "800", color: textColor }}>
          {day.label.split(" ")[2]}
        </Text>
        <Text style={{ fontSize: 10, color: textColor }}>{day.label.split(" ")[1]}</Text>
        {isBlocked && <Text style={{ fontSize: 9, color: "#991B1B", fontWeight: "700" }}>BLOCKED</Text>}
      </Pressable>
    );
  })}
</ScrollView>

{/* Selected day detail */}
{selectedCalDate ? (
  <View style={{ marginBottom: 20 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>
        {calendarDays.find(d => d.date === selectedCalDate)?.label}
      </Text>
      <Pressable
        onPress={() => toggleBlockDate(selectedCalDate)}
        style={{
          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
          backgroundColor: blockedDates.includes(selectedCalDate) ? "#DCFCE7" : "#FEE2E2",
        }}
      >
        <Text style={{
          fontSize: 12, fontWeight: "700",
          color: blockedDates.includes(selectedCalDate) ? "#166534" : "#991B1B",
        }}>
          {blockedDates.includes(selectedCalDate) ? "Unblock Day" : "Block Day"}
        </Text>
      </Pressable>
    </View>

    {dayBookings.length === 0 ? (
      <Text style={{ color: "#94A3B8", fontSize: 14 }}>No bookings on this day.</Text>
    ) : (
      dayBookings.map((b: any) => {
        const statusColors: any = {
          confirmed: { bg: "#DCFCE7", text: "#166534" },
          pending: { bg: "#FEF3C7", text: "#92400E" },
          cancelled: { bg: "#FEE2E2", text: "#991B1B" },
        };
        const sc = statusColors[b.status] || { bg: "#F1F5F9", text: "#475569" };
        return (
          <View key={b.id} style={{
            backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
            flexDirection: "row", alignItems: "center", gap: 12,
            borderLeftWidth: 3,
            borderLeftColor: b.status === "confirmed" ? "#22C55E" : b.status === "cancelled" ? "#EF4444" : "#F59E0B",
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>
                {b.timeSlot || b.time} · {b.clientName || b.ownerName || "Client"}
              </Text>
              <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                {b.petName} · {b.service}
              </Text>
              {b.notes ? (
                <Text style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", marginTop: 2 }}>
                  "{b.notes}"
                </Text>
              ) : null}
            </View>
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: sc.bg }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: sc.text, textTransform: "capitalize" }}>
                {b.status}
              </Text>
            </View>
          </View>
        );
      })
    )}
  </View>
) : (
  <Text style={{ color: "#94A3B8", fontSize: 14, marginBottom: 16 }}>
    Tap a date to see bookings for that day.
  </Text>
)}
```

Keep the existing "Availability & Booking Slots" template section below this calendar — providers still need to set their weekly hours.
Remove the old static "Upcoming Bookings" list (it's replaced by the date-based calendar above).

---

## FIX 4: `app/booking/new.tsx` — Block provider's blocked dates

When generating the 14-day calendar in the booking screen, fetch `users/{providerId}.blockedDates` and exclude those dates from the selectable list.

```ts
const [providerBlockedDates, setProviderBlockedDates] = useState<string[]>([]);

// In loadProviderAndPets():
const provData = provSnap.data();
setProviderBlockedDates(provData.blockedDates || []);
```

In `getAvailableDates()`, add:
```ts
if (providerBlockedDates.includes(dateStr)) continue; // skip blocked dates
```

---

## FIX 5: `app/(tabs)/explore.tsx` — Search triggers on first tap

The search button likely reads state that hasn't updated yet because `setState` is async.
Find the search button's `onPress` handler. Change it to pass the current input values directly into the search function instead of reading from state:

```ts
// Instead of:
onPress={() => handleSearch()}

// Do:
onPress={() => handleSearch({ state: stateInput, zip: zipInput })}
```

Update `handleSearch` to accept optional overrides:
```ts
async function handleSearch(overrides?: { state?: string; zip?: string }) {
  const useState = overrides?.state ?? stateFilter;
  const useZip = overrides?.zip ?? zipInput;
  // ... rest of search using useState and useZip
}
```

---

## FIX 6: Chat navigation — smooth screen transitions

In `app/messages/[id].tsx`, set navigation options to use a smooth slide transition and proper header:

```ts
useEffect(() => {
  navigation.setOptions({
    title: otherName || "Messages",
    headerBackTitle: "Messages",
    headerStyle: { backgroundColor: "#fff" },
    headerTintColor: "#4486F4",
    headerTitleStyle: { fontWeight: "700", fontSize: 17 },
    animation: "slide_from_right",
  });
}, [navigation, otherName]);
```

In the root layout (`app/_layout.tsx`), make sure the Stack for messages uses:
```tsx
<Stack.Screen
  name="messages/[id]"
  options={{
    animation: "slide_from_right",
    headerShown: true,
  }}
/>
```

---

## FIX 7: Pet owner — cancel appointment + booking list

In `app/bookings/index.tsx` (create if it doesn't exist), show the pet owner's bookings split into Upcoming and Past:

```ts
const today = new Date().toISOString().split("T")[0];
const upcoming = bookings.filter(b => b.date >= today && b.status !== "cancelled");
const past = bookings.filter(b => b.date < today || b.status === "cancelled");
```

Add Cancel button for upcoming bookings:
```ts
async function cancelBooking(bookingId: string) {
  Alert.alert("Cancel Appointment", "Are you sure?", [
    { text: "Keep it", style: "cancel" },
    {
      text: "Cancel", style: "destructive",
      onPress: async () => {
        await updateDoc(doc(webDb, "bookings", bookingId), {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          cancelledBy: "owner",
        });
      },
    },
  ]);
}
```

Show cancel button only when `b.date >= today && (b.status === "pending" || b.status === "confirmed")`.

Register this screen in `_layout.tsx` if not already done. Add a link from the home screen or Me tab so users can find their bookings.

---

## Firestore rule for blockedDates

In `firestore.rules`, make sure providers can write their own `blockedDates` field.
The existing `users/{uid}` write rule `allow write: if request.auth.uid == uid` covers this — no change needed.

---

## Deploy order
```bash
cd ~/mypetdex/MyPetDex
npx tsc --noEmit --skipLibCheck   # must pass before deploying
eas update --channel production --message "calendar dates, blocked days, chat names, search fix, navigation"
```

## Test checklist
- [ ] Booking: selecting a date and time slot works, tapping Send Booking Request succeeds
- [ ] Booking: a date blocked by provider does not appear in the 14-day calendar
- [ ] Provider services: calendar strip shows 28 days, tap a date shows bookings for that day
- [ ] Provider services: "Block Day" button marks a date red and prevents pet owner from booking it
- [ ] Messages list: provider/owner name shows real name, not "Provider" or "User"
- [ ] Explore: tapping Search once triggers results (no double-tap needed)
- [ ] Chat: entering and exiting chat screen transitions smoothly
- [ ] Pet owner: can cancel an upcoming booking from their appointments list
