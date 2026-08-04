# MyPetDex — Hero Image Fix (Text Below Photo)

Move the text from overlaid on the photo to below it — photo on top, white card text below.
Only `app/(tabs)/explore.tsx` needs to change.

---

## Change 1 — Adopt hero JSX

**Find:**
```tsx
{/* Hero */}
<ImageBackground
  source={{ uri: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=400&fit=crop&auto=format" }}
  style={styles.adoptHero}
  imageStyle={{ borderRadius: 20 }}
>
  <View style={styles.adoptHeroOverlay}>
    <Text style={styles.adoptHeroTitle}>Every Rescue Deserves a Family</Text>
    <Text style={styles.adoptHeroSub}>
      Search real adoptable {petType === "Dog" ? "dogs" : "cats"} from shelters near you
    </Text>
  </View>
</ImageBackground>
```

**Replace with:**
```tsx
{/* Hero */}
<View style={styles.adoptHeroCard}>
  <Image
    source={{ uri: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=400&fit=crop&auto=format" }}
    style={styles.adoptHeroImage}
    resizeMode="cover"
  />
  <View style={styles.adoptHeroText}>
    <Text style={styles.adoptHeroTitle}>Every Rescue Deserves a Family</Text>
    <Text style={styles.adoptHeroSub}>
      Search real adoptable {petType === "Dog" ? "dogs" : "cats"} from shelters near you
    </Text>
  </View>
</View>
```

---

## Change 2 — Services hero JSX

**Find:**
```tsx
{/* Hero */}
<ImageBackground
  source={{ uri: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&h=400&fit=crop&auto=format" }}
  style={styles.servicesHero}
  imageStyle={{ borderRadius: 20 }}
>
  <View style={styles.servicesHeroOverlay}>
    <Text style={styles.servicesHeroTitle}>Trusted Pet Care, Near You</Text>
    <Text style={styles.servicesHeroSub}>
      Find groomers, vets, trainers &amp; more in your area
    </Text>
  </View>
</ImageBackground>
```

**Replace with:**
```tsx
{/* Hero */}
<View style={styles.servicesHeroCard}>
  <Image
    source={{ uri: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&h=400&fit=crop&auto=format" }}
    style={styles.servicesHeroImage}
    resizeMode="cover"
  />
  <View style={styles.servicesHeroText}>
    <Text style={styles.servicesHeroTitle}>Trusted Pet Care, Near You</Text>
    <Text style={styles.servicesHeroSub}>
      Find groomers, vets, trainers &amp; more in your area
    </Text>
  </View>
</View>
```

---

## Change 3 — Update styles

Remove the old overlay styles and replace with card+image+text styles.

**Remove these styles entirely:**
- `adoptHero`
- `adoptHeroOverlay`
- `adoptHeroTitle`
- `adoptHeroSub`
- `servicesHero`
- `servicesHeroOverlay`
- `servicesHeroTitle`
- `servicesHeroSub`

**Add these new styles:**
```ts
// Adopt hero
adoptHeroCard: {
  backgroundColor: "#fff",
  borderRadius: 20,
  marginBottom: 12,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
},
adoptHeroImage: {
  width: "100%",
  height: 155,
},
adoptHeroText: {
  padding: 16,
  paddingBottom: 18,
  gap: 4,
},
adoptHeroTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#1a1a1a",
},
adoptHeroSub: {
  fontSize: 13,
  color: "#888",
  lineHeight: 19,
},

// Services hero
servicesHeroCard: {
  backgroundColor: "#fff",
  borderRadius: 20,
  marginBottom: 12,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
},
servicesHeroImage: {
  width: "100%",
  height: 155,
},
servicesHeroText: {
  padding: 16,
  paddingBottom: 18,
  gap: 4,
},
servicesHeroTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#1a1a1a",
},
servicesHeroSub: {
  fontSize: 13,
  color: "#888",
  lineHeight: 19,
},
```

Also remove `ImageBackground` from the React Native import since it is no longer used — replace it back with just `Image` (which is already imported).

---

## After Applying

```bash
npx tsc --noEmit --skipLibCheck
git add -A
git commit -m 'Hero photos: move text below image for clean readability'
eas update --channel production --message "Hero photo layout: text below image"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit  
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
- Do not change `searchAdopt()` or any other logic
