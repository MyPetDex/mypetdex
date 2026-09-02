# Five Final Fixes — Booking Service, Appointments, Provider Calendar, Tab Animation, Provider Name

Do NOT change auth, subscriptions, recipes, shopping, or admin screens.
Run `npx tsc --noEmit --skipLibCheck` after all changes and fix any TypeScript errors before finishing.

---

## FIX 1: `app/booking/new.tsx` — Skip service selection step if serviceType already known

### Problem
When a pet owner books from a provider's profile, the booking screen asks "What service do you need?"
even though the provider's service type was already passed as a route param (`serviceType`).

### Fix
In `app/booking/new.tsx`, read the `serviceType` route param. If it is non-empty and not `"Service"`,
skip Step 1 entirely by initializing `currentStep` to 1 (the date step) and pre-setting `selectedService`:

```ts
const { providerId, providerName, serviceType } = useLocalSearchParams<{
  providerId: string;
  providerName: string;
  serviceType?: string;
}>();

// Pre-select service from param if available
const initialService = serviceType && serviceType !== "Service" ? serviceType : "";
const [selectedService, setSelectedService] = useState(initialService);
const [currentStep, setCurrentStep] = useState(initialService ? 1 : 0);
```

- If `initialService` is set, show the date/time picker immediately (step 1), skipping step 0.
- If `initialService` is empty, show the service selection step as before.
- The step progress indicator should reflect the skipped step correctly (show 2 steps instead of 3 when service is pre-selected, or start indicator at step 2 of 3).

---

## FIX 2: `app/bookings/index.tsx` — Real-time updates + delete cancelled/past + provider name

### Problem A: Status doesn't update without logout
The screen uses `getDocs` (one-time fetch). After cancelling, local state is updated but if the user
navigates away and comes back, it re-fetches and shows old data briefly. More importantly,
if the provider changes status, the user never sees it without re-opening the screen.

### Fix A: Replace `getDocs` with `onSnapshot` for real-time updates

Replace the `loadBookings` function with a real-time listener:

```ts
useEffect(() => {
  if (!user?.uid) return;
  const q = query(collection(webDb, "bookings"), where("ownerId", "==", user.uid));
  const unsub = onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));
    setBookings(list);
    setLoading(false);
  }, (err) => {
    console.warn("bookings listener error:", err);
    setLoading(false);
  });
  return unsub;
}, [user?.uid]);
```

Remove the `useFocusEffect` / `loadBookings` function entirely — the `onSnapshot` listener stays active
and updates in real-time. Import `onSnapshot` from `firebase/firestore`.

### Problem B: No way to delete cancelled or past bookings

### Fix B: Add "Remove" button for past and cancelled bookings

In `renderCard`, add a delete button for cards where `b.status === "cancelled"` OR `b.date < today`:

```ts
const isDeletable = b.status === "cancelled" || b.date < today;
```

```tsx
{isDeletable && (
  <Pressable onPress={() => confirmDelete(b.id)} style={s.deleteBtn}>
    <Text style={s.deleteBtnText}>Remove from list</Text>
  </Pressable>
)}
```

Add `confirmDelete` function:
```ts
async function confirmDelete(bookingId: string) {
  Alert.alert(
    "Remove Booking",
    "Remove this booking from your list?",
    [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            // Soft delete — update hiddenBy field so provider still sees it
            await updateDoc(doc(webDb, "bookings", bookingId), {
              hiddenByOwner: true,
            });
            // Real-time listener will automatically remove it from the list
          } catch {
            Alert.alert("Error", "Could not remove booking.");
          }
        },
      },
    ]
  );
}
```

Update the `onSnapshot` filter to exclude `hiddenByOwner: true` bookings:
```ts
const list = snap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((b: any) => !b.hiddenByOwner)
  .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));
```

### Problem C: Provider name shows "Provider"

### Fix C: Resolve provider name from Firestore when stored name is generic

In `renderCard`, if `b.providerName` is empty, "Provider", or missing, fetch from `users/{b.providerId}`:

Add a state map for resolved names:
```ts
const [providerNames, setProviderNames] = useState<Record<string, string>>({});
```

Add a `useEffect` that resolves names for all bookings with generic provider names:
```ts
useEffect(() => {
  bookings.forEach((b) => {
    if ((!b.providerName || b.providerName === "Provider") && b.providerId) {
      if (!providerNames[b.providerId]) {
        getDoc(doc(webDb, "users", b.providerId)).then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const name = d.businessName || d.displayName || "Provider";
            setProviderNames((prev) => ({ ...prev, [b.providerId]: name }));
          }
        }).catch(() => {});
      }
    }
  });
}, [bookings]);
```

In `renderCard`, use:
```ts
const displayProviderName = b.providerName && b.providerName !== "Provider"
  ? b.providerName
  : (providerNames[b.providerId] || "Provider");
```

Import `getDoc`, `doc` from `firebase/firestore` and `db` or `webDb` from `@/lib/firebase`.

Add `deleteBtn` and `deleteBtnText` to StyleSheet:
```ts
deleteBtn: {
  marginTop: 8,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#CBD5E1",
  alignItems: "center",
},
deleteBtnText: { color: "#94A3B8", fontWeight: "600", fontSize: 13 },
```

---

## FIX 3: `app/(tabs)/provider-services.tsx` — Show specific dates in availability section

### Problem
The Availability edit modal shows "Monday", "Tuesday" etc. with no specific dates.
The provider does not know which Monday is which.

### Fix
In the availability template section (the day cards that show Monday, Tuesday etc.),
add the next occurrence date next to each day name.

Find the function or section that renders each day card (e.g., `DAYS.map(day => ...)` or similar).
Add a helper function to get the next occurrence of a weekday:

```ts
function nextOccurrence(dayName: string): string {
  const dayIndex = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].indexOf(dayName);
  const today = new Date();
  const todayIndex = today.getDay();
  let daysUntil = dayIndex - todayIndex;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
```

In the day card header, show the day name AND the next occurrence date:
```tsx
<Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}>
  {DAY_LABELS[day]}
  <Text style={{ fontSize: 13, fontWeight: "400", color: "#64748B" }}>
    {" "}· next: {nextOccurrence(day)}
  </Text>
</Text>
```

This way "Monday · next: Sep 8" and "Tuesday · next: Sep 9" etc. appear clearly.

---

## FIX 4: `app/(tabs)/_layout.tsx` — Remove tab switch animation flash

### Problem
When switching between tabs, there is a visible flash/animation that looks wrong.
This is caused by the default screen transition animation on the Tabs navigator.

### Fix
Add `animation: "none"` to the Tabs `screenOptions` to disable all tab-switch animations:

```tsx
<Tabs
  screenOptions={{
    animation: "none",          // ← ADD THIS LINE
    tabBarActiveTintColor: BRAND,
    // ... rest of existing screenOptions unchanged
  }}
>
```

This removes the flash entirely when switching tabs. The Stack-level screens (chat, booking, provider profile)
keep their own `slide_from_right` animation defined in `app/_layout.tsx` — do not change those.

---

## FIX 5: `app/provider/[id].tsx` — Show real provider name and photo in header

### Problem
The provider profile header shows "Provider" as the name and a building icon.
The `name` param from route params is sometimes empty, and the screen does not fall back to Firestore.

### Fix
In the `loadProvider` / `useEffect` that loads provider data (the one that fetches from `users/{providerUid}`),
make sure the loaded `businessName` or `displayName` is saved to a state variable and shown in the header.

Find where `name` is used in the hero section:
```tsx
<Text style={styles.heroName}>{name || "Provider"}</Text>
```

Change to use a state variable `providerDisplayName` that is set from Firestore data:
```ts
const [providerDisplayName, setProviderDisplayName] = useState(name || "");

// In the useEffect that loads provider data:
const data = snap.data();
if (!providerDisplayName || providerDisplayName === "Provider") {
  setProviderDisplayName(data.businessName || data.displayName || name || "Provider");
}
```

Use `providerDisplayName` everywhere `name || "Provider"` appears in the JSX.

For the avatar: if the provider has a `photoURL` or `profilePhoto` field in their Firestore data,
show it as a circular image. Otherwise show the first letter of `providerDisplayName` in a colored circle:

```tsx
{providerPhoto ? (
  <Image
    source={{ uri: providerPhoto }}
    style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
  />
) : (
  <View style={[styles.heroAvatar, { backgroundColor: accentColor + "22" }]}>
    <Text style={{ fontSize: 32, fontWeight: "800", color: accentColor }}>
      {providerDisplayName[0]?.toUpperCase() || "P"}
    </Text>
  </View>
)}
```

Add `providerPhoto` state:
```ts
const [providerPhoto, setProviderPhoto] = useState("");
// In load useEffect: setProviderPhoto(data.photoURL || data.profilePhoto || "");
```

---

## What NOT to change
- Do not touch auth, subscriptions, recipes, shopping, admin screens
- Do not change `firestore.rules` or `firestore.indexes.json`
- Do not change the Stack screen animations in `app/_layout.tsx`

---

## Deploy
```bash
cd ~/mypetdex/MyPetDex
npx tsc --noEmit --skipLibCheck   # must pass with 0 errors
eas build --platform ios --profile production
```
Then submit:
```bash
eas submit --platform ios --latest
```

## Test checklist
- [ ] Book from a Groomer → booking screen skips service selection, shows date picker immediately
- [ ] My Appointments → cancelling a booking updates instantly without logout/login
- [ ] My Appointments → provider name shows real name (not "Provider")
- [ ] My Appointments → cancelled and past bookings have "Remove from list" button
- [ ] Provider Services → availability days show "Monday · next: Sep 8" etc.
- [ ] Switching between tabs has no flash or animation
- [ ] Provider profile header shows real provider name and avatar initial (not "Provider" + building icon)
