# Booking Enhancements: Pet Profile in Booking + Reminders + Profile Sharing

## What we're building
1. **Pet details in booking doc** — breed, age, weight saved to booking so provider sees them
2. **Pet profile sharing prompt** — after booking, ask owner: "Share [pet]'s profile with [provider]?"
3. **Booking reminder in pet profile** — booking auto-creates a reminder shown in the pet's profile
4. **Upcoming bookings on owner home** — the home screen shows "Upcoming Appointments" section

Do NOT rebuild any screens. Edit only the files listed below.

---

## FIX 1: `app/booking/new.tsx` — Save full pet details in booking doc

### 1A. Load full pet data including breed, age, weight

Find `loadProviderAndPets()`. After fetching the pets list, store the full pet objects:

```ts
const list = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
setPets(list);
```

This is already done. Now update pet selection to also capture the full pet object:

Add state at the top:
```ts
const [selectedPetData, setSelectedPetData] = useState<any>(null);
```

Update wherever pet selection happens (find where `setSelectedPetId` and `setSelectedPetName` are called):
```ts
setSelectedPetId(pet.id);
setSelectedPetName(pet.name || "My Pet");
setSelectedPetData(pet);  // ← ADD THIS
```

Make sure this happens in both the auto-select (single pet) case and the manual selection case.

### 1B. Include pet details in the booking addDoc

Find `submitBooking()` and the `addDoc(collection(webDb, "bookings"), {...})` call.

Add these fields to the booking document:
```ts
petId: selectedPetId,
petName: selectedPetName,
petBreed: selectedPetData?.breed || "",
petAge: selectedPetData?.age || "",
petWeight: selectedPetData?.weight || "",
petWeightUnit: selectedPetData?.weightUnit || "lbs",
petSpecies: selectedPetData?.species || selectedPetData?.type || "",
petNeutered: selectedPetData?.neutered || false,
```

These fields are stored in the booking doc. The provider can see them in their booking management screen.

---

## FIX 2: `app/booking/new.tsx` — Pet profile sharing dialog

After a successful booking, instead of just showing the simple confirmation alert, show a two-step alert:

### Replace the current success Alert:
```ts
Alert.alert(
  "Booking Requested! 🎉",
  `Your booking with ${providerName} on ${formatDisplayDate(selectedDate)} at ${selectedTime} has been sent. You'll get a notification when they respond.`,
  [{ text: "OK", onPress: () => router.back() }]
);
```

### With this two-step flow:
```ts
// Save the booking doc ref so we can update it if owner shares pet profile
const bookingRef = await addDoc(collection(webDb, "bookings"), { ...bookingData });

// Also write a reminder to the pet's subcollection
if (selectedPetId) {
  try {
    await addDoc(
      collection(webDb, "users", user.uid, "pets", selectedPetId, "reminders"),
      {
        type: "appointment",
        title: `${selectedService} with ${providerName}`,
        date: selectedDate,
        time: selectedTime,
        providerId,
        providerName: providerName || "Provider",
        bookingId: bookingRef.id,
        createdAt: serverTimestamp(),
      }
    );
  } catch (e) {
    // Non-blocking — don't fail the booking if reminder fails
    console.warn("Reminder write failed:", e);
  }
}

// Now prompt for pet profile sharing
Alert.alert(
  "Booking Requested! 🎉",
  `Your appointment with ${providerName} on ${formatDisplayDate(selectedDate)} at ${selectedTime} has been sent!\n\nWould you like to share ${selectedPetName}'s profile with ${providerName}? They'll see breed, age, weight, and health notes to better prepare for your visit.`,
  [
    {
      text: "No Thanks",
      style: "cancel",
      onPress: () => router.back(),
    },
    {
      text: `Share ${selectedPetName}'s Profile`,
      onPress: async () => {
        try {
          await updateDoc(bookingRef, {
            petProfileShared: true,
            petProfile: {
              name: selectedPetData?.name || selectedPetName,
              species: selectedPetData?.species || selectedPetData?.type || "",
              breed: selectedPetData?.breed || "",
              age: selectedPetData?.age || "",
              weight: selectedPetData?.weight || "",
              weightUnit: selectedPetData?.weightUnit || "lbs",
              neutered: selectedPetData?.neutered || false,
              allergies: selectedPetData?.allergies || "",
              medications: selectedPetData?.medications || "",
              healthNotes: selectedPetData?.healthNotes || selectedPetData?.notes || "",
            },
          });
        } catch (e) {
          console.warn("Share pet profile failed:", e);
        }
        router.back();
      },
    },
  ]
);
```

Make sure to import `updateDoc` from firebase/firestore (it's likely already imported).

---

## FIX 3: `app/pet/[id].tsx` — Show upcoming appointments in pet profile

### 3A. Add a reminders state and load function

Find the existing state declarations (near `const [pet, setPet] = useState`) and add:
```ts
const [reminders, setReminders] = useState<any[]>([]);
```

In the data loading useEffect (where pet data is fetched), add:
```ts
// Load upcoming reminders for this pet
const remindersSnap = await getDocs(
  collection(webDb, "users", user.uid, "pets", petId, "reminders")
);
const now = new Date().toISOString().split("T")[0]; // today as YYYY-MM-DD
const upcoming = remindersSnap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((r: any) => r.date >= now)  // only future/today
  .sort((a: any, b: any) => a.date.localeCompare(b.date));
setReminders(upcoming as any[]);
```

### 3B. Add an "Upcoming Appointments" section to the pet profile UI

Find where the pet profile renders (the main return/ScrollView in `[id].tsx`).
Add this section BEFORE the health/weight/vet sections:

```tsx
{reminders.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
    {reminders.map((r: any) => (
      <View key={r.id} style={{
        backgroundColor: "#EFF6FF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: "#4486F4",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="calendar-outline" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>{r.title}</Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            {new Date(r.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short", month: "long", day: "numeric"
            })} · {r.time}
          </Text>
        </View>
      </View>
    ))}
  </View>
)}
```

---

## FIX 4: `app/(tabs)/index.tsx` — Show upcoming bookings on owner home screen

### 4A. Load upcoming bookings

Find the home screen's data loading (useEffect or loadData function). Add:
```ts
const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
```

In the data loading:
```ts
// Load upcoming bookings for this user
try {
  const today = new Date().toISOString().split("T")[0];
  const bookingsSnap = await getDocs(
    query(
      collection(webDb, "bookings"),
      where("ownerId", "==", user.uid),
      where("status", "in", ["pending", "confirmed"]),
      limit(5)
    )
  );
  const upcoming = bookingsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b: any) => b.date >= today)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(0, 3);
  setUpcomingBookings(upcoming as any[]);
} catch (e) {
  console.warn("bookings load error:", e);
}
```

### 4B. Add "Upcoming Appointments" section to home screen

Find a good place in the home screen ScrollView — add it AFTER the Quick Access section and BEFORE the pet cards:

```tsx
{upcomingBookings.length > 0 && (
  <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
    <Text style={{ fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 12 }}>
      Upcoming Appointments
    </Text>
    {upcomingBookings.map((b: any) => (
      <TouchableOpacity
        key={b.id}
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => router.push({ pathname: "/booking/detail" as any, params: { id: b.id } })}
        activeOpacity={0.85}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: "#4486F420",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="calendar-outline" size={22} color="#4486F4" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>
            {b.service} · {b.petName}
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            {b.providerName} · {new Date(b.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric"
            })} at {b.timeSlot || b.time}
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
          backgroundColor: b.status === "confirmed" ? "#DCFCE7" : "#FEF3C7",
        }}>
          <Text style={{
            fontSize: 11, fontWeight: "700",
            color: b.status === "confirmed" ? "#166534" : "#92400E",
            textTransform: "capitalize",
          }}>{b.status}</Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>
)}
```

---

## FIX 5: `app/(tabs)/provider-bookings.tsx` — Show pet profile if shared

In the provider's bookings list or booking detail view, when `petProfileShared === true`,
show an expandable "Pet Profile" section:

```tsx
{booking.petProfileShared && booking.petProfile && (
  <View style={{
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  }}>
    <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 10 }}>
      🐾 {booking.petProfile.name}'s Profile
    </Text>
    {[
      ["Species", booking.petProfile.species],
      ["Breed", booking.petProfile.breed],
      ["Age", booking.petProfile.age],
      ["Weight", `${booking.petProfile.weight} ${booking.petProfile.weightUnit}`],
      ["Neutered/Spayed", booking.petProfile.neutered ? "Yes" : "No"],
      ["Allergies", booking.petProfile.allergies],
      ["Medications", booking.petProfile.medications],
      ["Health Notes", booking.petProfile.healthNotes],
    ].filter(([, v]) => v).map(([label, value]) => (
      <View key={label as string} style={{ flexDirection: "row", marginBottom: 6 }}>
        <Text style={{ fontSize: 13, color: "#64748B", width: 110 }}>{label}</Text>
        <Text style={{ fontSize: 13, color: "#1E293B", flex: 1, fontWeight: "500" }}>{value as string}</Text>
      </View>
    ))}
  </View>
)}
```

---

## Firestore rules — add reminders subcollection

In `firestore.rules`, inside the `match /users/{userId}` block, add:
```
match /pets/{petId}/reminders/{reminderId} {
  allow read, write: if request.auth.uid == userId;
}
```

Deploy after:
```bash
firebase deploy --only firestore:rules
```

---

## What NOT to change
- Do not change auth, subscriptions, payments, or any provider screens not listed above
- Do not change `app.json`, `eas.json`, or Cloud Functions
- Do not change the recipe or adopt screens

---

## Deploy order
1. Firestore rules → `firebase deploy --only firestore:rules`
2. App (JS-only) → `eas update --channel production --message "booking enhancements: pet profile, reminders, home appointments"`

## Test checklist
- [ ] Book service → booking doc contains petBreed, petAge, petWeight
- [ ] Book service → "Share pet profile" dialog appears after booking
- [ ] Tap "Share" → booking doc has `petProfileShared: true` + `petProfile` object
- [ ] Pet profile screen shows upcoming appointment card
- [ ] Owner home screen shows "Upcoming Appointments" section with booking cards
- [ ] Provider bookings screen shows pet profile section when owner shared it
- [ ] Appointment disappears from pet profile after the date passes
