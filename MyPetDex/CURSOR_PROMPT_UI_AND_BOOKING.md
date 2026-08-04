# MyPetDex — UI Improvements + Booking Feature

Run this prompt AFTER CURSOR_PROMPT_5_FIXES.md has been applied and verified.

---

## Fix 1 — Replace Adopt Tab Headline

### File: `app/(tabs)/explore.tsx`

One-line change only:

```tsx
// BEFORE:
<Text style={styles.adoptHeroTitle}>Find Your New Best Friend</Text>

// AFTER:
<Text style={styles.adoptHeroTitle}>Every Rescue Deserves a Family</Text>
```

---

## Fix 2 — Services Tab Redesign

### File: `app/(tabs)/explore.tsx`

The services tab currently has plain heading text and small service type cards.
Redesign it to match the adopt tab's rich layout: a colored hero banner at top,
a stats row, then the search filters and service grid.

**Replace the entire services tab section** (everything inside `{activeTab === "services" && (...)}`) with:

```tsx
{activeTab === "services" && (
  <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>

    {/* Hero */}
    <View style={styles.servicesHero}>
      <View style={styles.servicesHeroInner}>
        <Text style={styles.servicesHeroEmoji}>🛎️</Text>
        <Text style={styles.servicesHeroTitle}>Trusted Pet Care, Near You</Text>
        <Text style={styles.servicesHeroSub}>
          Find groomers, vets, trainers &amp; more in your area
        </Text>
      </View>
    </View>

    {/* Stats row — reuses adopt tab styles */}
    <View style={styles.adoptStatsRow}>
      <View style={styles.adoptStat}>
        <Text style={styles.adoptStatNum}>500+</Text>
        <Text style={styles.adoptStatLabel}>Providers</Text>
      </View>
      <View style={styles.adoptStatDivider} />
      <View style={styles.adoptStat}>
        <Text style={styles.adoptStatNum}>6</Text>
        <Text style={styles.adoptStatLabel}>Service Types</Text>
      </View>
      <View style={styles.adoptStatDivider} />
      <View style={styles.adoptStat}>
        <Text style={styles.adoptStatNum}>All US</Text>
        <Text style={styles.adoptStatLabel}>States</Text>
      </View>
    </View>

    {/* Search filters */}
    <View style={styles.filterRow}>
      <StateDropdown value={stateFilter} onSelect={setStateFilter} />
      <TextInput
        style={styles.zipInput}
        placeholder="Zip code"
        placeholderTextColor="#aaa"
        value={serviceZip}
        onChangeText={(text) => setServiceZip(text.replace(/\D/g, "").slice(0, 5))}
        keyboardType="numeric"
        maxLength={5}
        onSubmitEditing={() => { if (!stateFilter) return; setSearched(true); searchProviders(); }}
      />
      <Pressable
        style={[styles.searchBtn, !stateFilter && { opacity: 0.5 }]}
        onPress={() => { if (!stateFilter) return; setSearched(true); searchProviders(); }}
      >
        <Text style={styles.searchBtnText}>Search</Text>
      </Pressable>
    </View>

    {/* Service type grid */}
    <Text style={styles.adoptSectionTitle}>Browse by Service</Text>
    <View style={styles.serviceGrid}>
      {SERVICE_TYPES.map((s) => (
        <Pressable
          key={s.label}
          style={[
            styles.serviceCard,
            serviceFilter === s.label && { borderColor: s.color, backgroundColor: s.color + "11" },
          ]}
          disabled={providerLoading}
          onPress={() => {
            const next = s.label === serviceFilter ? "" : s.label;
            setServiceFilter(next);
            setSearched(true);
            if (stateFilter) searchProviders(next);
          }}
        >
          <View style={[styles.serviceIconCircle, { backgroundColor: s.color + "18" }]}>
            <Ionicons name={s.icon as any} size={22} color={s.color} />
          </View>
          <Text style={styles.serviceLabel}>{s.label}</Text>
          <Text style={styles.serviceDesc}>{s.desc}</Text>
        </Pressable>
      ))}
    </View>

    {searched && (
      providerLoading ? (
        <View style={{ alignItems: "center", marginTop: 32, gap: 16 }}>
          <ActivityIndicator color={BRAND} size="large" />
          {showCancel && (
            <Pressable onPress={cancelSearch} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>✕ Cancel Search</Text>
            </Pressable>
          )}
        </View>
      ) : providerError ? (
        <View style={styles.comingSoonBox}>
          <Text style={styles.comingSoonEmoji}>⚠️</Text>
          <Text style={styles.comingSoonTitle}>Search failed</Text>
          <Text style={styles.comingSoonSub}>{providerError}</Text>
        </View>
      ) : seedProviders.length > 0 || localProviders.length > 0 ? (
        <View>
          {localProviders.length > 0 ? (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionHeader}>MyPetDex Verified Providers</Text>
              {localProviders.map((p: any) => (
                <ProviderCard key={p.id} p={p} badge="mypetdex" />
              ))}
            </View>
          ) : null}
          {seedProviders.length > 0 ? (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionHeader}>Local Providers Near You</Text>
              {seedProviders.map((p: any) => (
                <ProviderCard key={p.id} p={p} badge="user" />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.comingSoonBox}>
          <Text style={styles.comingSoonEmoji}>🔍</Text>
          <Text style={styles.comingSoonTitle}>No providers found</Text>
          <Text style={styles.comingSoonSub}>Try a different zip code or state</Text>
        </View>
      )
    )}

  </ScrollView>
)}
```

**Add these new styles** to `StyleSheet.create({...})`:

```ts
servicesHero: {
  backgroundColor: "#10b981",
  borderRadius: 20,
  marginBottom: 12,
  overflow: "hidden",
},
servicesHeroInner: {
  padding: 24,
  alignItems: "center",
  gap: 6,
},
servicesHeroEmoji: { fontSize: 40 },
servicesHeroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "center" },
servicesHeroSub: { fontSize: 13, color: "#ffffff99", textAlign: "center", lineHeight: 19 },
serviceIconCircle: {
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 6,
},
```

**Update the existing `serviceCard` style** — add shadow:
```ts
serviceCard: {
  width: "30%",
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 14,
  alignItems: "center",
  borderWidth: 1.5,
  borderColor: "#eee",
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
},
```

---

## Fix 3 — Booking Request Feature

### File: `app/provider/[id].tsx`

**Background:** The provider's bookings tab (`provider-bookings.tsx`) already exists and reads
from a `bookings` Firestore collection. But there is no UI for users to actually create a booking.
This fix adds a "Request Booking" button and modal to the provider detail screen.

**Important:** Only user-registered providers (whose `id` param starts with `"user_"`) have Firebase
accounts and can see incoming bookings. Seed providers (pre-loaded data) do not. So show the booking
button only when `id.startsWith("user_")`.

---

### Step 1 — Add new state variables

Add these to the existing state declarations inside `ProviderDetailScreen`:

```ts
const [showBooking, setShowBooking] = useState(false);
const [bookDate, setBookDate]       = useState("");
const [bookTime, setBookTime]       = useState("");
const [bookNotes, setBookNotes]     = useState("");
const [bookingSubmitting, setBookingSubmitting] = useState(false);
const [bookingDone, setBookingDone] = useState(false);
```

---

### Step 2 — Add new import

Add `Modal, TextInput` to the existing React Native import if not already present.
Also add `serverTimestamp` to the existing firebase/firestore import if not already present
(it's already imported for the review submit, so just verify it's there).

---

### Step 3 — Add `submitBooking` function

Add this function after the existing `submitReview` function:

```ts
async function submitBooking() {
  if (!user || !bookDate.trim()) return;
  setBookingSubmitting(true);
  try {
    // Strip "user_" prefix to get the actual Firebase UID of the provider
    const providerUid = id.startsWith("user_") ? id.replace("user_", "") : id;
    const clientName =
      profile?.displayName || profile?.name || user.email?.split("@")[0] || "Pet Owner";
    await addDoc(collection(db, "bookings"), {
      providerId: providerUid,
      providerName: name || "Provider",
      clientId: user.uid,
      clientName,
      clientEmail: user.email || "",
      service: serviceType || "Service",
      date: bookDate.trim(),
      time: bookTime.trim(),
      notes: bookNotes.trim(),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setBookingDone(true);
    setBookDate("");
    setBookTime("");
    setBookNotes("");
  } catch {
    Alert.alert("Error", "Could not send booking request. Please try again.");
  }
  setBookingSubmitting(false);
}
```

---

### Step 4 — Add "Request Booking" button to the hero card

Inside the existing `heroCard` View, after the `heroBio` text (and after any rating row),
add this button — but only for registered providers:

```tsx
{/* Book button — only for user-registered providers */}
{id.startsWith("user_") && user && (
  <Pressable
    style={styles.bookBtn}
    onPress={() => { setShowBooking(true); setBookingDone(false); }}
  >
    <Ionicons name="calendar-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
    <Text style={styles.bookBtnText}>Request Booking</Text>
  </Pressable>
)}
```

---

### Step 5 — Add the booking modal

Add this Modal just before the closing `</KeyboardAvoidingView>` tag at the bottom of the return:

```tsx
{/* Booking modal */}
<Modal
  visible={showBooking}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setShowBooking(false)}
>
  <KeyboardAvoidingView
    style={{ flexShrink: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <View style={styles.bookModal}>
      {/* Header */}
      <View style={styles.bookModalHeader}>
        <Text style={styles.bookModalTitle}>Request Booking</Text>
        <Pressable onPress={() => setShowBooking(false)}>
          <Text style={styles.bookModalClose}>Cancel</Text>
        </Pressable>
      </View>

      {bookingDone ? (
        /* Success state */
        <View style={styles.bookSuccess}>
          <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
          <Text style={styles.bookSuccessTitle}>Request Sent!</Text>
          <Text style={styles.bookSuccessSub}>
            {name || "The provider"} will confirm your booking shortly.
            You'll hear back within 24 hours.
          </Text>
          <Pressable style={styles.bookBtn} onPress={() => setShowBooking(false)}>
            <Text style={styles.bookBtnText}>Done</Text>
          </Pressable>
        </View>
      ) : (
        /* Form */
        <ScrollView contentContainerStyle={styles.bookForm} keyboardShouldPersistTaps="handled">
          <Text style={styles.bookProviderName}>{name}</Text>
          <Text style={styles.bookServiceType}>{serviceType}</Text>

          <Text style={styles.bookLabel}>Preferred Date *</Text>
          <TextInput
            style={styles.bookInput}
            placeholder="e.g. July 15, 2026"
            placeholderTextColor="#bbb"
            value={bookDate}
            onChangeText={setBookDate}
            returnKeyType="next"
          />

          <Text style={styles.bookLabel}>Preferred Time</Text>
          <TextInput
            style={styles.bookInput}
            placeholder="e.g. 10:00 AM"
            placeholderTextColor="#bbb"
            value={bookTime}
            onChangeText={setBookTime}
            returnKeyType="next"
          />

          <Text style={styles.bookLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.bookInput, styles.bookNotesInput]}
            placeholder="Your pet's name, breed, any special requests..."
            placeholderTextColor="#bbb"
            value={bookNotes}
            onChangeText={setBookNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.bookSubmitBtn, (!bookDate.trim() || bookingSubmitting) && { opacity: 0.5 }]}
            onPress={submitBooking}
            disabled={!bookDate.trim() || bookingSubmitting}
          >
            {bookingSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.bookBtnText}>Send Request</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.bookDisclaimer}>
            This sends a booking request to the provider. They will contact you to confirm.
          </Text>
        </ScrollView>
      )}
    </View>
  </KeyboardAvoidingView>
</Modal>
```

---

### Step 6 — Add new styles

Add these to the existing `StyleSheet.create({...})` in `provider/[id].tsx`:

```ts
// Book button (shown in hero card)
bookBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BRAND,
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 24,
  marginTop: 16,
  alignSelf: "stretch",
},
bookBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

// Booking modal
bookModal: {
  flexGrow: 1,
  backgroundColor: "#F5F8FF",
},
bookModalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  paddingTop: 24,
  backgroundColor: "#fff",
  borderBottomWidth: 0.5,
  borderBottomColor: "#eee",
},
bookModalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
bookModalClose: { fontSize: 16, color: BRAND, fontWeight: "600" },

// Form
bookForm: { padding: 20, paddingBottom: 40 },
bookProviderName: { fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
bookServiceType: { fontSize: 13, color: BRAND, fontWeight: "600", marginBottom: 20 },
bookLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 14 },
bookInput: {
  backgroundColor: "#fff",
  borderWidth: 1.5,
  borderColor: "#E2E8F0",
  borderRadius: 12,
  padding: 13,
  fontSize: 14,
  color: "#1E293B",
},
bookNotesInput: { minHeight: 100, paddingTop: 12 },
bookSubmitBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BRAND,
  borderRadius: 14,
  paddingVertical: 15,
  marginTop: 24,
},
bookDisclaimer: {
  fontSize: 12,
  color: "#94A3B8",
  textAlign: "center",
  marginTop: 12,
  lineHeight: 17,
},

// Success state
bookSuccess: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: 40,
  gap: 12,
},
bookSuccessTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
bookSuccessSub: {
  fontSize: 14,
  color: "#64748B",
  textAlign: "center",
  lineHeight: 21,
  marginBottom: 8,
},
```

---

## After Applying All Changes

```bash
npx tsc --noEmit --skipLibCheck   # must show 0 errors
git add -A
git commit -m 'Services hero, adopt headline, booking request feature'
eas update --channel production --message "Services redesign + booking request feature"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions deploy: always N for rescueProxy, deleteAccount, getPublicStats
- Do not change `searchAdopt()` or the WebBrowser flow in explore.tsx
