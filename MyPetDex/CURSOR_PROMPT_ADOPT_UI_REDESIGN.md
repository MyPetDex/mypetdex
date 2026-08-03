# MyPetDex — Adopt Tab UI Redesign

## Problem
The adopt tab looks bare and uninviting before the user searches. It shows only a toggle, a zip input, and a plain white card with a paw emoji. Users and Apple reviewers need to feel engaged the moment they open the tab.

## Goal
Redesign the adopt section inside `app/(tabs)/explore.tsx` to look rich, warm, and inviting — with a gradient hero, stats, breed preview chips, and a stronger CTA. The search flow itself (WebBrowser opening Adopt-a-Pet) stays exactly the same.

---

## Changes — only the Adopt tab section inside `ExploreScreen`

### Replace the Adopt tab JSX

Replace everything inside `{activeTab === "adopt" && (...)}` with:

```tsx
{activeTab === "adopt" && (
  <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>

    {/* Hero */}
    <View style={styles.adoptHero}>
      <View style={styles.adoptHeroInner}>
        <Text style={styles.adoptHeroEmoji}>🐾</Text>
        <Text style={styles.adoptHeroTitle}>Find Your New Best Friend</Text>
        <Text style={styles.adoptHeroSub}>
          Search real adoptable {petType === "Dog" ? "dogs" : "cats"} from shelters near you
        </Text>
      </View>
    </View>

    {/* Stats row */}
    <View style={styles.adoptStatsRow}>
      <View style={styles.adoptStat}>
        <Text style={styles.adoptStatNum}>15k+</Text>
        <Text style={styles.adoptStatLabel}>Shelters</Text>
      </View>
      <View style={styles.adoptStatDivider} />
      <View style={styles.adoptStat}>
        <Text style={styles.adoptStatNum}>225k+</Text>
        <Text style={styles.adoptStatLabel}>Adoptions</Text>
      </View>
      <View style={styles.adoptStatDivider} />
      <View style={styles.adoptStat}>
        <Text style={styles.adoptStatNum}>All US</Text>
        <Text style={styles.adoptStatLabel}>Zip Codes</Text>
      </View>
    </View>

    {/* Dog / Cat toggle */}
    <View style={styles.typeRow}>
      {(["Dog", "Cat"] as const).map((t) => (
        <Pressable
          key={t}
          style={[styles.typeBtn, petType === t && styles.typeBtnActive]}
          onPress={() => setPetType(t)}
        >
          <Text style={styles.typeBtnEmoji}>{t === "Dog" ? "🐶" : "🐱"}</Text>
          <Text style={[styles.typeText, petType === t && styles.typeTextActive]}>
            {t === "Dog" ? "Dogs" : "Cats"}
          </Text>
        </Pressable>
      ))}
    </View>

    {/* Search bar */}
    <View style={styles.adoptSearchCard}>
      <Text style={styles.adoptSearchLabel}>Enter your zip code to search</Text>
      <View style={styles.searchRow}>
        <View style={styles.adoptZipWrapper}>
          <Ionicons name="location-outline" size={18} color="#4486F4" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. 08816"
            placeholderTextColor="#bbb"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="numeric"
            maxLength={5}
            returnKeyType="search"
            onSubmitEditing={searchAdopt}
          />
        </View>
        <Pressable
          style={[styles.adoptSearchBtn, zipCode.length < 5 && { opacity: 0.45 }]}
          onPress={searchAdopt}
          disabled={zipCode.length < 5}
        >
          <Ionicons name="search" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.adoptSearchBtnText}>Search</Text>
        </Pressable>
      </View>
    </View>

    {/* Popular breeds chips */}
    <Text style={styles.adoptBreedsLabel}>
      {petType === "Dog" ? "Popular dog breeds" : "Popular cat breeds"} available for adoption
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.breedChipsRow}
    >
      {(petType === "Dog"
        ? ["Labrador", "German Shepherd", "Golden Retriever", "Beagle", "Bulldog", "Poodle", "Chihuahua", "Husky"]
        : ["Domestic Shorthair", "Siamese", "Maine Coon", "Persian", "Ragdoll", "Bengal", "Sphynx", "Tabby"]
      ).map((breed) => (
        <View key={breed} style={styles.breedChip}>
          <Text style={styles.breedChipText}>{breed}</Text>
        </View>
      ))}
    </ScrollView>

    {/* How it works */}
    <Text style={styles.adoptSectionTitle}>How adoption works</Text>
    <View style={styles.adoptStepsCard}>
      {[
        { icon: "location-outline",   color: "#4486F4", step: "1", title: "Enter your zip code",    desc: "We search shelters and rescues near you" },
        { icon: "paw-outline",        color: "#10b981", step: "2", title: "Browse real pets",        desc: "See photos, breeds, ages and personalities" },
        { icon: "heart-outline",      color: "#ef4444", step: "3", title: "Meet your match",         desc: "Contact the shelter directly to arrange a visit" },
      ].map((item) => (
        <View key={item.step} style={styles.adoptStep}>
          <View style={[styles.adoptStepIcon, { backgroundColor: item.color + "18" }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.adoptStepTitle}>{item.title}</Text>
            <Text style={styles.adoptStepDesc}>{item.desc}</Text>
          </View>
        </View>
      ))}
    </View>

    {/* Local shelter pets from Firestore (if any) */}
    {localShelterPets.length > 0 ? (
      <>
        <Text style={styles.resultsLabel}>Available at Local Shelters</Text>
        <View style={styles.petGrid}>
          {localShelterPets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              {pet.photo ? (
                <Image source={{ uri: pet.photo }} style={styles.petPhoto} resizeMode="cover" />
              ) : (
                <View style={styles.petPhotoPlaceholder}>
                  <Text style={{ fontSize: 32 }}>{petType === "Dog" ? "🐶" : "🐱"}</Text>
                </View>
              )}
              <View style={styles.petInfo}>
                <Text style={styles.petName} numberOfLines={1}>{pet.name}</Text>
                <Text style={styles.petBreed} numberOfLines={1}>{pet.breed}</Text>
                <Text style={styles.petMeta}>{[pet.age, pet.gender].filter(Boolean).join(" · ")}</Text>
                <Text style={styles.petCity} numberOfLines={1}>🏠 {pet.shelterName}</Text>
                {pet.contactPhone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${pet.contactPhone.replace(/\D/g, "")}`)}>
                    <Text style={styles.shelterPhone}>📞 {pet.contactPhone}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </>
    ) : null}

    {/* Attribution */}
    <View style={styles.poweredByRow}>
      <Text style={styles.poweredByText}>Powered by </Text>
      <Pressable onPress={() => Linking.openURL("https://www.adoptapet.com")}>
        <Text style={styles.poweredByLink}>Adopt-a-Pet.com</Text>
      </Pressable>
      <Text style={styles.poweredByText}> · 15,000+ shelters nationwide</Text>
    </View>

  </ScrollView>
)}
```

---

### Add these new styles to `StyleSheet.create({...})`

```ts
// Adopt hero
adoptHero: {
  backgroundColor: "#4486F4",
  borderRadius: 20,
  marginBottom: 12,
  overflow: "hidden",
},
adoptHeroInner: {
  padding: 24,
  alignItems: "center",
  gap: 6,
},
adoptHeroEmoji: { fontSize: 40 },
adoptHeroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "center" },
adoptHeroSub: { fontSize: 13, color: "#ffffff99", textAlign: "center", lineHeight: 19 },

// Stats
adoptStatsRow: {
  flexDirection: "row",
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  alignItems: "center",
  justifyContent: "space-around",
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
},
adoptStat: { alignItems: "center", flex: 1 },
adoptStatNum: { fontSize: 18, fontWeight: "800", color: "#4486F4" },
adoptStatLabel: { fontSize: 11, color: "#888", marginTop: 2 },
adoptStatDivider: { width: 1, height: 32, backgroundColor: "#eee" },

// Type toggle
typeBtnEmoji: { fontSize: 18 },

// Search card
adoptSearchCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  gap: 10,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
},
adoptSearchLabel: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
adoptZipWrapper: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#F8F9FF",
  borderRadius: 12,
  paddingHorizontal: 12,
  borderWidth: 1.5,
  borderColor: "#E2E8F0",
},
adoptSearchBtn: {
  backgroundColor: "#4486F4",
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 13,
  flexDirection: "row",
  alignItems: "center",
},
adoptSearchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

// Breed chips
adoptBreedsLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#888",
  marginBottom: 8,
},
breedChipsRow: { gap: 8, paddingBottom: 4 },
breedChip: {
  backgroundColor: "#EEF2FF",
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 7,
},
breedChipText: { fontSize: 12, color: "#4486F4", fontWeight: "600" },

// How it works
adoptSectionTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1a1a1a",
  marginTop: 16,
  marginBottom: 10,
},
adoptStepsCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  gap: 16,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
  marginBottom: 8,
},
adoptStep: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
adoptStepIcon: {
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
},
adoptStepTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
adoptStepDesc: { fontSize: 12, color: "#888", marginTop: 2, lineHeight: 17 },
```

---

## After applying

```bash
npx tsc --noEmit --skipLibCheck   # 0 errors
git add -A
git commit -m "Redesign adopt tab: hero, stats, breed chips, how-it-works steps"
eas update --channel production --message "Adopt tab redesign - richer UI"
```

## ⛔ DO NOT TOUCH
- Do not change `searchAdopt()` — the WebBrowser flow stays exactly as-is
- `auth.mypetdex.app` — never change
- Firebase Functions deploy: always N for rescueProxy, deleteAccount, getPublicStats
