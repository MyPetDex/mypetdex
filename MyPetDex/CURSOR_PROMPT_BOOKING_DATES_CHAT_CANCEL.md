# Fix: Booking Dates, Chat Names, Cancel Appointment, Booking Cleanup

## Context
Four issues to fix in one pass. Do not change any unrelated screens.

---

## FIX 1 (CRITICAL): `app/booking/new.tsx` — Real calendar date picker + conflict detection

### Problem
The booking screen lets users pick a day-of-week (Monday, Tuesday…) but NOT a specific date.
Multiple users can book the same provider on the same day at the same time — no conflict check.

### What to build
Replace the day-of-week selector with a **horizontal scrollable calendar** showing the next 14 days.
- Only show dates whose weekday matches a day the provider has marked Open
- For the selected date, show available time slots for that day
- Before confirming, query Firestore to check if that `providerId + date + timeSlot` is already booked
- If slot is taken, show "This slot is already booked. Please choose another time." and disable Save

### 1A. Add a date picker state

```ts
const [selectedDate, setSelectedDate] = useState<string>(""); // "YYYY-MM-DD"
const [availableSlots, setAvailableSlots] = useState<string[]>([]);
const [selectedSlot, setSelectedSlot] = useState<string>("");
const [checkingConflict, setCheckingConflict] = useState(false);
const [slotTaken, setSlotTaken] = useState(false);
```

### 1B. Generate next 14 days filtered by provider's open days

```ts
function getAvailableDates(availability: any): { date: string; label: string; dayName: string }[] {
  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const result = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = days[d.getDay()];
    const dayAvail = availability?.[dayName];
    if (dayAvail?.open && dayAvail?.slots?.length > 0) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      result.push({ date: dateStr, label, dayName });
    }
  }
  return result;
}
```

### 1C. Generate time slots for selected date

```ts
function generateSlots(dayAvail: any): string[] {
  if (!dayAvail?.open || !dayAvail?.slots) return [];
  const slots: string[] = [];
  for (const slot of dayAvail.slots) {
    const [openH, openM] = slot.open.split(":").map(Number);
    const [closeH, closeM] = slot.close.split(":").map(Number);
    const duration = dayAvail.slotDuration || 60;
    let cur = openH * 60 + openM;
    const end = closeH * 60 + closeM;
    while (cur + duration <= end) {
      const h = String(Math.floor(cur / 60)).padStart(2, "0");
      const m = String(cur % 60).padStart(2, "0");
      slots.push(`${h}:${m}`);
      cur += duration;
    }
  }
  return slots;
}
```

When user selects a date, compute slots from `providerAvailability[dayName]` and set `availableSlots`.
Clear `selectedSlot` and `slotTaken` when date changes.

### 1D. Conflict check before booking

```ts
async function checkConflict(date: string, slot: string): Promise<boolean> {
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
}
```

Call this when user taps "Confirm Booking". If conflict found, set `slotTaken = true` and abort.

### 1E. UI — Horizontal date scroller

Replace the day-of-week picker with:

```tsx
{/* Date picker */}
<Text style={styles.sectionTitle}>Select Date</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
  {availableDates.map((d) => (
    <Pressable
      key={d.date}
      onPress={() => { setSelectedDate(d.date); setSelectedSlot(""); setSlotTaken(false); }}
      style={{
        marginRight: 10,
        padding: 12,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: selectedDate === d.date ? "#4486F4" : "#fff",
        borderWidth: 1,
        borderColor: selectedDate === d.date ? "#4486F4" : "#E2E8F0",
        minWidth: 72,
      }}
    >
      <Text style={{ fontSize: 11, color: selectedDate === d.date ? "#fff" : "#94A3B8", fontWeight: "600" }}>
        {d.label.split(" ")[0].toUpperCase()}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "800", color: selectedDate === d.date ? "#fff" : "#1E293B" }}>
        {d.label.split(" ")[2]}
      </Text>
      <Text style={{ fontSize: 11, color: selectedDate === d.date ? "#ffffffaa" : "#94A3B8" }}>
        {d.label.split(" ")[1]}
      </Text>
    </Pressable>
  ))}
</ScrollView>

{/* Time slots */}
{selectedDate ? (
  <>
    <Text style={styles.sectionTitle}>Select Time</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
      {availableSlots.map((slot) => (
        <Pressable
          key={slot}
          onPress={() => { setSelectedSlot(slot); setSlotTaken(false); }}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: selectedSlot === slot ? "#4486F4" : "#fff",
            borderWidth: 1,
            borderColor: selectedSlot === slot ? "#4486F4" : "#E2E8F0",
          }}
        >
          <Text style={{ fontWeight: "600", color: selectedSlot === slot ? "#fff" : "#1E293B" }}>{slot}</Text>
        </Pressable>
      ))}
    </View>
    {slotTaken && (
      <Text style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>
        This slot is already booked. Please choose another time.
      </Text>
    )}
  </>
) : (
  <Text style={{ color: "#94A3B8", fontSize: 14, marginBottom: 16 }}>Select a date to see available times.</Text>
)}
```

### 1F. Update booking doc fields

When saving the booking, use:
```ts
date: selectedDate,        // "YYYY-MM-DD"
timeSlot: selectedSlot,    // "09:00"
```

Remove any old `dayOfWeek` or `time` field if present — use `date` and `timeSlot` consistently.

### 1G. Disable Confirm button

Disable the confirm/save button if `!selectedDate || !selectedSlot || checkingConflict`.

---

## FIX 2: `app/provider/[id].tsx` — Provider name in chat conversation

### Problem
When `openChat()` creates the conversation, it stores `participantNames[providerUid] = name || "Provider"`.
If `name` is not loaded yet or is empty, "Provider" gets saved and stuck forever.

### Fix
In `openChat()`, change the name resolution to use the loaded profile data:

```ts
const providerDisplayName = name || profile?.businessName || profile?.displayName || "Provider";
```

Also: after `openChat()` creates the conversation, it should pass the real name to the messages screen:
```ts
router.push({
  pathname: "/messages/[id]" as any,
  params: { id: convId, otherName: providerDisplayName, otherUid: providerUid },
});
```

And update `participantNames` in the `setDoc` call:
```ts
participantNames: {
  [user.uid]: profile?.displayName || user?.displayName || "Pet Owner",
  [providerUid]: providerDisplayName,
},
```

---

## FIX 3: `app/booking/` — Cancel appointment for pet owners

### 3A. In the pet owner's booking list / booking detail screen

Find where bookings are displayed for the pet owner (likely `app/(tabs)/bookings.tsx` or similar).
Add a **Cancel** button on each booking card where `status === "pending"` or `status === "confirmed"` and the date is in the future.

```tsx
{canCancel && (
  <Pressable
    onPress={() => confirmCancel(booking.id)}
    style={{
      marginTop: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#EF4444",
      alignItems: "center",
    }}
  >
    <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 14 }}>Cancel Appointment</Text>
  </Pressable>
)}
```

### 3B. Cancel handler

```ts
async function confirmCancel(bookingId: string) {
  Alert.alert(
    "Cancel Appointment",
    "Are you sure you want to cancel this booking?",
    [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel Booking",
        style: "destructive",
        onPress: async () => {
          await updateDoc(doc(webDb, "bookings", bookingId), {
            status: "cancelled",
            cancelledAt: serverTimestamp(),
            cancelledBy: "owner",
          });
        },
      },
    ]
  );
}
```

### 3C. canCancel logic

```ts
const canCancel = (booking.status === "pending" || booking.status === "confirmed") &&
  booking.date >= new Date().toISOString().split("T")[0];
```

---

## FIX 4: Booking display cleanup

### 4A. Provider upcoming bookings (`app/(tabs)/provider-services.tsx`)

The query already filters `date >= today`. Keep it — past bookings drop off automatically.

### 4B. Pet owner bookings list

In the owner's bookings screen, split into two sections:

```ts
const upcoming = bookings.filter(b =>
  b.date >= today && b.status !== "cancelled"
);
const past = bookings.filter(b =>
  b.date < today || b.status === "cancelled"
);
```

Show "Upcoming" section first, then "Past & Cancelled" section collapsed or greyed out.
Cancelled bookings should show a red "Cancelled" badge instead of status.

### 4C. Show cancelled badge

```tsx
const statusColor = {
  confirmed: { bg: "#DCFCE7", text: "#166534" },
  pending: { bg: "#FEF3C7", text: "#92400E" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
}[booking.status] || { bg: "#F1F5F9", text: "#475569" };
```

---

## What NOT to change
- Auth, subscriptions, pet profiles, recipes, shopping
- Provider approval flow
- Admin dashboard

---

## Deploy
JS-only — OTA eligible:
```bash
cd ~/mypetdex/MyPetDex
eas update --channel production --message "booking dates, conflict check, chat names, cancel booking"
```

## Test checklist
- [ ] Booking screen shows horizontal calendar with real dates (Mon Oct 6, Tue Oct 7, etc.)
- [ ] Only provider's open days appear as selectable dates
- [ ] Time slots appear for the selected date
- [ ] Booking the same slot twice shows "already booked" error
- [ ] Chat opened from provider profile shows provider's real name (not "Provider")
- [ ] Pet owner can cancel a pending or confirmed future booking
- [ ] Cancelled bookings show red badge
- [ ] Provider upcoming bookings show correct dates
