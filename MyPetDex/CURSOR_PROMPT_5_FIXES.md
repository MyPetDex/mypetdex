# MyPetDex — 5 Fixes (Full Audit)

---

## Fix 1 — Keyboard / Infinite Scroll Bug: ALL Files

This is a systemic bug. Every place in the app where a user types inside a **Modal** has the same
broken pattern: `<KeyboardAvoidingView style={{ flex: 1 }}>` wrapping a `<View style={modalContainer}>` 
where `modalContainer` also has `flex: 1`. This causes the keyboard to push content off-screen and 
creates an infinite white scroll below.

**The fix is always the same two changes per modal:**
1. KAV `style={{ flex: 1 }}` → `style={{ flexShrink: 1 }}`
2. The inner container's StyleSheet entry `flex: 1` → `flexGrow: 1`

Apply to every file listed below. Do NOT change any other styles.

---

### `app/(tabs)/settings.tsx`

Two modals — both need the same fix.

**Change 1 — KAV at line ~126:**
```tsx
// BEFORE:
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
// AFTER:
<KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```

**Change 2 — KAV at line ~159 (second modal, same fix):**
```tsx
// BEFORE:
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
// AFTER:
<KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```

**Change 3 — modalContainer style (line ~338):**
```ts
// BEFORE:
modalContainer: { flex: 1, padding: 24, paddingTop: 32, backgroundColor: "#fff" },
// AFTER:
modalContainer: { flexGrow: 1, padding: 24, paddingTop: 32, backgroundColor: "#fff" },
```

---

### `app/(tabs)/me.tsx`

One modal needs the fix.

**Change 1 — KAV at line ~516:**
```tsx
// BEFORE:
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
// AFTER:
<KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```

**Change 2 — modalContainer style (line ~653):**
```ts
// BEFORE:
modalContainer: { flex: 1, backgroundColor: BG },
// AFTER:
modalContainer: { flexGrow: 1, backgroundColor: BG },
```

---

### `app/(tabs)/shelter-profile.tsx`

One modal needs the fix.

**Change 1 — KAV at line ~241:**
```tsx
// BEFORE:
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
// AFTER:
<KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```

**Change 2 — modalContainer style (line ~316):**
```ts
// BEFORE:
modalContainer: { flex: 1, padding: 20, paddingTop: 24, backgroundColor: "#F5F8FF" },
// AFTER:
modalContainer: { flexGrow: 1, padding: 20, paddingTop: 24, backgroundColor: "#F5F8FF" },
```

---

### `app/(tabs)/shelter-pets.tsx`

One modal — this one uses a ScrollView directly as the modal container (instead of a plain View), 
so only the KAV needs changing.

**Change 1 — KAV at line ~248:**
```tsx
// BEFORE:
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
// AFTER:
<KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```

**Change 2 — modalContainer style (line ~367):**
```ts
// BEFORE:
modalContainer: { flex: 1, backgroundColor: "#F5F8FF" },
// AFTER:
modalContainer: { flexGrow: 1, backgroundColor: "#F5F8FF" },
```

---

### `app/pet/[id].tsx`

**Six modals** — all have `<KeyboardAvoidingView style={{ flex: 1 }}>` at approximately
lines 478, 738, 775, 1047, 1277, and 1458.

**Change all 6 KAV instances — find every occurrence of:**
```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
```
**Replace with:**
```tsx
<KeyboardAvoidingView
  style={{ flexShrink: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
```

There is also one instance with `behavior={Platform.OS === "ios" ? "padding" : undefined}` — 
change it too:
```tsx
// BEFORE:
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
// AFTER:
<KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```

**Change modalContainer style (line ~2039):**
```ts
// BEFORE:
modalContainer: { flex: 1, backgroundColor: "#f8f8f8" },
// AFTER:
modalContainer: { flexGrow: 1, backgroundColor: "#f8f8f8" },
```

---

### `app/onboarding.tsx` (full-screen KAV, different fix)

The shelter Google OAuth signup lands here. The KAV wraps the entire screen (not a modal),
so `flex: 1` should stay — but the offset and behavior need fixing.

**Change — KAV at line ~225:**
```tsx
// BEFORE:
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
>

// AFTER:
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
>
```

Also add `automaticallyAdjustKeyboardInsets={true}` to the ScrollView at line ~241:
```tsx
// BEFORE:
<ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>

// AFTER:
<ScrollView
  style={styles.scroll}
  contentContainerStyle={styles.content}
  keyboardShouldPersistTaps="handled"
  automaticallyAdjustKeyboardInsets={true}
  bounces={false}
>
```

---

### Files to leave alone (already correct or no issue)

- `app/(tabs)/provider-profile.tsx` — already fixed (`flexShrink: 1`) ✅
- `app/(tabs)/ai.tsx` — chat screen, KAV wraps entire screen, input pinned at bottom, works correctly
- `app/provider/[id].tsx` — detail screen, KAV wraps screen with scroll, no bug reported
- `app/pet/add.tsx` — add pet form, KAV wraps screen, no bug reported  
- `app/(auth)/sign-in.tsx` — already uses `automaticallyAdjustKeyboardInsets={true}` ✅

---

---

> **Note:** Fixes 2 and 3 (services redesign, adopt headline) are in CURSOR_PROMPT_UI_AND_BOOKING.md — run that prompt separately after this one.

---

## Fix 2 — Services Tab Redesign (match Adopt tab style)

### File: `app/(tabs)/explore.tsx`

Replace the services tab section (everything inside `{activeTab === "services" && (...)}`) with:

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

    {/* Stats */}
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
// Services hero
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

// Service icon circle (replaces inline emoji)
serviceIconCircle: {
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 6,
},
```

**Update existing `serviceCard` style** — add shadow, more padding:
```ts
// BEFORE:
serviceCard: {
  width: "30%",
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 12,
  alignItems: "center",
  borderWidth: 1.5,
  borderColor: "#eee",
},

// AFTER:
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

## Fix 3 — Replace Adopt Tab Headline

### File: `app/(tabs)/explore.tsx`

```tsx
// BEFORE:
<Text style={styles.adoptHeroTitle}>Find Your New Best Friend</Text>

// AFTER:
<Text style={styles.adoptHeroTitle}>Every Rescue Deserves a Family</Text>
```

---

## Fix 4 — Replace ALL Shop Category Icons

### File: `app/(tabs)/shopping.tsx`

Every category currently uses generic or wrong icons. Replace the entire `CATEGORY_ICONS` map with icons that clearly represent each category:

```ts
// BEFORE:
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  Food:        { icon: "restaurant-outline",      color: "#f59e0b" },
  Treats:      { icon: "heart-outline",           color: "#ec4899" },
  Toys:        { icon: "game-controller-outline", color: "#8b5cf6" },
  Health:      { icon: "medkit-outline",          color: "#ef4444" },
  Grooming:    { icon: "cut-outline",             color: "#10b981" },
  Accessories: { icon: "pricetag-outline",        color: "#3b82f6" },
  Beds:        { icon: "moon-outline",            color: "#6366f1" },
};

// AFTER:
const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  Food:        { icon: "fast-food-outline",       color: "#f59e0b" },  // burger/bag — clearly food
  Treats:      { icon: "gift-outline",            color: "#ec4899" },  // gift box — treats as reward
  Toys:        { icon: "basketball-outline",      color: "#8b5cf6" },  // ball — most common pet toy
  Health:      { icon: "medical-outline",         color: "#ef4444" },  // medical cross — clean & clear
  Grooming:    { icon: "cut-outline",             color: "#10b981" },  // scissors — keep, it's perfect
  Accessories: { icon: "bag-handle-outline",      color: "#3b82f6" },  // bag — accessories/shopping
  Beds:        { icon: "bed-outline",             color: "#6366f1" },  // literal bed icon
};
```

**Why each icon was chosen:**
- `fast-food-outline` → food bag/burger, nobody mistakes this for an X
- `gift-outline` → treats = reward/gift for your pet
- `basketball-outline` → ball is the most recognizable pet toy
- `medical-outline` → clean red medical cross, universally understood
- `cut-outline` → scissors, already worked well, keep it
- `bag-handle-outline` → shopping bag = accessories
- `bed-outline` → actual bed silhouette, much clearer than moon/sleep

---

## Fix 5 — Add Amazon Associates Tag + Chewy Affiliate Deep Links

### File: `app/(tabs)/shopping.tsx`

**Amazon — add the Associates tag:**
```ts
// BEFORE:
function getAmazonUrl(search: string): string {
  // Add your Amazon Associates tag here once approved: &tag=YOUR_TAG-20
  return `https://www.amazon.com/s?k=${encodeURIComponent(search)}`;
}

// AFTER:
function getAmazonUrl(search: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(search)}&tag=mypetdex20-20`;
}
```

**Chewy — use Impact.com deep links for affiliate tracking:**
```ts
// BEFORE:
function getChewyUrl(search: string): string {
  return `https://www.chewy.com/s?query=${encodeURIComponent(search)}`;
}

// AFTER:
function getChewyUrl(search: string): string {
  const dest = encodeURIComponent(`https://www.chewy.com/s?query=${encodeURIComponent(search)}`);
  return `https://chewy.sjv.io/c/7270969/2846786/32975?u=${dest}`;
}
```

This uses the same Impact.com publisher/campaign/program IDs already active in `app/pet/[id].tsx`,
so every Chewy search click from the shopping tab will now be tracked and commission-eligible.

---

## After Applying All Fixes

```bash
npx tsc --noEmit --skipLibCheck   # must show 0 errors
git add -A
git commit -m 'Fix keyboard bug app-wide, services hero, adopt headline, all shop icons, Amazon tag'
eas update --channel production --message "App-wide keyboard fix, services redesign, icon overhaul"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions deploy: always N for rescueProxy, deleteAccount, getPublicStats
- `app/(tabs)/provider-profile.tsx` — already fixed, do not change its KAV styles
- Never put API keys in app code
