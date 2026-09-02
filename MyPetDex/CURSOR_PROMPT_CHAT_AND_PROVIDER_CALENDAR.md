# Fix Chat + Provider Booked Slots Calendar

## FIX 1: `app/provider/[id].tsx` — Chat fails with "Could not open chat"

### Root cause
`openChat()` calls `getDoc(convRef)` to check if the conversation exists.
Firestore's read rule for conversations is:
```
allow read: if isSignedIn() && request.auth.uid in resource.data.participants;
```
When the conversation does NOT exist yet, `resource` is null → `resource.data.participants`
evaluates to null → the read is DENIED → `getDoc` throws → catch shows the error alert.

### Fix: Remove the getDoc entirely. Use `setDoc` with `{ merge: true }` instead.

Find `async function openChat()` and replace the entire function body with:

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

    // setDoc with merge:true creates if missing, updates if exists — no getDoc needed
    await setDoc(convRef, {
      participants,
      participantNames: {
        [user.uid]: profile?.displayName || user?.displayName || "Pet Owner",
        [providerUid]: name || "Provider",
      },
      participantRoles: {
        [user.uid]: "owner",
        [providerUid]: "provider",
      },
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: "",
      unreadCount: { [user.uid]: 0, [providerUid]: 0 },
    }, { merge: true });  // ← merge:true: safe to call multiple times

    router.push({
      pathname: "/messages/[id]" as any,
      params: { id: convId, otherName: name || "Provider", otherUid: providerUid },
    });
  } catch (e: any) {
    console.error("Chat error:", e);
    Alert.alert("Error", "Could not open chat. Please try again.");
  }
}
```

Make sure `setDoc` is imported from `firebase/firestore` (add it to the import if missing).
`serverTimestamp` should already be imported.

---

## FIX 2: `app/(tabs)/provider-services.tsx` — Show booked slots on availability calendar

### Current state
The availability screen shows the provider's weekly template (Mon–Sun, open/close times).
Booked slots are NOT shown — the provider can't see which specific slots are taken.

### What to add
A "This Week's Bookings" section below the availability template, showing actual confirmed
bookings as a simple list grouped by date.

### 2A. Add state for upcoming bookings

At the top of `ProviderServices` component, add:
```ts
const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
const [loadingBookings, setLoadingBookings] = useState(false);
```

### 2B. Load upcoming bookings on mount

In the existing `useEffect` that loads availability, also fetch bookings:
```ts
async function loadBookings() {
  if (!user) return;
  setLoadingBookings(true);
  try {
    const today = new Date().toISOString().split("T")[0];
    const snap = await getDocs(
      query(
        collection(webDb, "bookings"),
        where("providerId", "==", user.uid),
        where("status", "in", ["pending", "confirmed"]),
      )
    );
    const upcoming = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((b: any) => b.date >= today)
      .sort((a: any, b: any) => {
        const dateCompare = (a.date || "").localeCompare(b.date || "");
        return dateCompare !== 0 ? dateCompare : (a.timeSlot || a.time || "").localeCompare(b.timeSlot || b.time || "");
      });
    setUpcomingBookings(upcoming as any[]);
  } catch (e) {
    console.warn("loadBookings error:", e);
  } finally {
    setLoadingBookings(false);
  }
}
```

Call `loadBookings()` in the useEffect.

Make sure `query`, `where`, `getDocs`, `collection` are imported from `firebase/firestore`.

### 2C. Add "Upcoming Bookings" section to the UI

Add this section in the ScrollView BELOW the availability days list and ABOVE the Save button:

```tsx
{/* Upcoming Bookings */}
<View style={{ marginTop: 28 }}>
  <Text style={{ fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 4 }}>
    Upcoming Bookings
  </Text>
  <Text style={{ fontSize: 13, color: "#94A3B8", marginBottom: 14 }}>
    These slots are reserved — your availability template shows open hours excluding these.
  </Text>

  {loadingBookings ? (
    <ActivityIndicator color={BRAND} />
  ) : upcomingBookings.length === 0 ? (
    <View style={{
      backgroundColor: "#F8FAFC", borderRadius: 12, padding: 20,
      alignItems: "center",
    }}>
      <Ionicons name="calendar-outline" size={28} color="#CBD5E1" />
      <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 8 }}>No upcoming bookings</Text>
    </View>
  ) : (
    upcomingBookings.map((b: any) => {
      const dateObj = new Date(b.date + "T12:00:00");
      const dateLabel = dateObj.toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric"
      });
      const isConfirmed = b.status === "confirmed";
      return (
        <View key={b.id} style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderLeftWidth: 3,
          borderLeftColor: isConfirmed ? "#22C55E" : "#F59E0B",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>
              {dateLabel} · {b.timeSlot || b.time}
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              {b.clientName || b.ownerName || "Client"} · {b.petName || "Pet"} · {b.service}
            </Text>
            {b.petBreed ? (
              <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>
                {b.petBreed}{b.petAge ? ` · ${b.petAge}` : ""}
              </Text>
            ) : null}
            {b.notes ? (
              <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 1, fontStyle: "italic" }}>
                "{b.notes}"
              </Text>
            ) : null}
          </View>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: isConfirmed ? "#DCFCE7" : "#FEF3C7",
          }}>
            <Text style={{
              fontSize: 11, fontWeight: "700",
              color: isConfirmed ? "#166534" : "#92400E",
              textTransform: "capitalize",
            }}>
              {b.status}
            </Text>
          </View>
        </View>
      );
    })
  )}
</View>
```

---

## What NOT to change
- Do not change the availability template editing logic (days/slots/hours)
- Do not change the save availability function
- Do not change any pet owner screens or admin screens

---

## Deploy
JS-only changes — OTA eligible:
```bash
cd ~/mypetdex/MyPetDex
eas update --channel production --message "fix chat setDoc merge, provider booked slots calendar"
```

## Test checklist
- [ ] Pet owner taps Message on provider → chat opens without error
- [ ] Chat navigates to messages screen and sends messages
- [ ] Provider opens Services tab → sees "Upcoming Bookings" section
- [ ] A confirmed booking appears with green border, client name, pet name, date+time
- [ ] A pending booking appears with orange border
- [ ] After date passes, booking disappears from the list
