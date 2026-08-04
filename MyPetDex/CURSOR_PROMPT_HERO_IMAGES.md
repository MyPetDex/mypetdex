# MyPetDex — Hero Image Backgrounds

Replace the solid color hero banners in the Adopt and Services tabs with real photos.
Only `app/(tabs)/explore.tsx` needs to change.

---

## Step 1 — Add ImageBackground to imports

```tsx
// BEFORE:
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Image, Linking, Modal, FlatList,
} from "react-native";

// AFTER:
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Image, Linking, Modal, FlatList,
  ImageBackground,
} from "react-native";
```

---

## Step 2 — Replace the Adopt hero

**Find this JSX:**
```tsx
{/* Hero */}
<View style={styles.adoptHero}>
  <View style={styles.adoptHeroInner}>
    <Text style={styles.adoptHeroEmoji}>🐾</Text>
    <Text style={styles.adoptHeroTitle}>Every Rescue Deserves a Family</Text>
    <Text style={styles.adoptHeroSub}>
      Search real adoptable {petType === "Dog" ? "dogs" : "cats"} from shelters near you
    </Text>
  </View>
</View>
```

**Replace with:**
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

---

## Step 3 — Replace the Services hero

**Find this JSX:**
```tsx
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
```

**Replace with:**
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

---

## Step 4 — Update styles

**Replace these adopt hero styles:**
```ts
// BEFORE:
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

// AFTER:
adoptHero: {
  borderRadius: 20,
  marginBottom: 12,
  overflow: "hidden",
  height: 160,
},
adoptHeroOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.42)",
  padding: 20,
  justifyContent: "flex-end",
  gap: 5,
},
adoptHeroTitle: { fontSize: 21, fontWeight: "800", color: "#fff" },
adoptHeroSub: { fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 19 },
```

**Replace these services hero styles:**
```ts
// BEFORE:
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

// AFTER:
servicesHero: {
  borderRadius: 20,
  marginBottom: 12,
  overflow: "hidden",
  height: 160,
},
servicesHeroOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.42)",
  padding: 20,
  justifyContent: "flex-end",
  gap: 5,
},
servicesHeroTitle: { fontSize: 21, fontWeight: "800", color: "#fff" },
servicesHeroSub: { fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 19 },
```

---

## After Applying

```bash
npx tsc --noEmit --skipLibCheck   # 0 errors
git add -A
git commit -m 'Replace hero banners with real photos (dog+cat adopt, vet services)'
eas update --channel production --message "Hero photo backgrounds on Adopt and Services tabs"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
- Do not change `searchAdopt()` or any other logic — only the hero JSX and styles
