# MyPetDex — Replace Broken Adoption System with Adopt-a-Pet

## Background

The current adoption tab in `app/(tabs)/explore.tsx` uses a `rescueProxy` Cloud Function that calls RescueGroups.org. It is broken for two reasons:
1. It filters by STATE only (not zip code) — so users get the same results regardless of zip
2. RescueGroups data is especially unreliable for cats (known upstream issue)

## Goal

Replace the broken RescueGroups integration with Adopt-a-Pet.com, which has real zip-code-accurate results for both dogs and cats.

---

## PHASE 1 — Immediate Fix (OTA deploy, no new build required)

This uses `expo-web-browser` which is already installed. It opens Adopt-a-Pet's search page in an in-app Safari sheet — full zip filtering, works for both dogs and cats.

### Step 1 — Update `searchAdopt()` in `app/(tabs)/explore.tsx`

Replace the entire `searchAdopt` function. Instead of calling the broken rescueProxy, open Adopt-a-Pet in-app:

```ts
import * as WebBrowser from "expo-web-browser";

const searchAdopt = async () => {
  if (!zipCode || zipCode.length < 5) return;
  const petTypeParam = petType === "Dog" ? "dog" : "cat";
  const url = `https://www.adoptapet.com/pet-adoption?zip=${zipCode}&petType=${petTypeParam}`;
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    toolbarColor: "#4486F4",
  });
};
```

### Step 2 — Replace the Adopt tab UI in `app/(tabs)/explore.tsx`

Replace the entire Adopt tab section (everything inside `{activeTab === "adopt" && (...)}`) with this cleaner UI:

```tsx
{activeTab === "adopt" && (
  <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
    <Text style={styles.heading}>Adopt a Pet ❤️</Text>
    <Text style={styles.subheading}>Find pets near you ready to adopt</Text>

    {/* Dog / Cat toggle */}
    <View style={styles.typeRow}>
      {(["Dog", "Cat"] as const).map((t) => (
        <Pressable
          key={t}
          style={[styles.typeBtn, petType === t && styles.typeBtnActive]}
          onPress={() => setPetType(t)}
        >
          <Text style={[styles.typeText, petType === t && styles.typeTextActive]}>
            {t === "Dog" ? "🐶 Dogs" : "🐱 Cats"}
          </Text>
        </Pressable>
      ))}
    </View>

    {/* Zip search */}
    <View style={styles.searchRow}>
      <TextInput
        style={styles.searchInput}
        placeholder="Enter your zip code"
        placeholderTextColor="#aaa"
        value={zipCode}
        onChangeText={setZipCode}
        keyboardType="numeric"
        maxLength={5}
        returnKeyType="search"
        onSubmitEditing={searchAdopt}
      />
      <Pressable
        style={[styles.searchBtn, zipCode.length < 5 && { opacity: 0.5 }]}
        onPress={searchAdopt}
        disabled={zipCode.length < 5}
      >
        <Text style={styles.searchBtnText}>Search</Text>
      </Pressable>
    </View>

    {/* Info card */}
    <View style={styles.adoptInfoCard}>
      <Text style={styles.adoptInfoEmoji}>🐾</Text>
      <Text style={styles.adoptInfoTitle}>Real pets near you, ready to adopt</Text>
      <Text style={styles.adoptInfoSub}>
        Enter your zip code and tap Search to browse adoptable {petType === "Dog" ? "dogs" : "cats"} from shelters and rescues in your area.
      </Text>
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

    {/* Powered-by attribution (required by Adopt-a-Pet terms) */}
    <View style={styles.poweredByRow}>
      <Text style={styles.poweredByText}>Adoption data powered by </Text>
      <Pressable onPress={() => Linking.openURL("https://www.adoptapet.com")}>
        <Text style={styles.poweredByLink}>Adopt-a-Pet.com</Text>
      </Pressable>
    </View>
  </ScrollView>
)}
```

### Step 3 — Add missing styles

Add these styles to the `StyleSheet.create({...})` block at the bottom of `explore.tsx`:

```ts
adoptInfoCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 20,
  alignItems: "center",
  gap: 8,
  marginTop: 8,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
},
adoptInfoEmoji: { fontSize: 40 },
adoptInfoTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
adoptInfoSub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
poweredByRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 24,
  marginBottom: 8,
},
poweredByText: { fontSize: 11, color: "#aaa" },
poweredByLink: { fontSize: 11, color: "#4486F4", fontWeight: "600" },
```

### Step 4 — Remove dead adoption state & imports

After the changes, the following are no longer needed. Remove them to keep the file clean:

- `adoptPets` state and `AdoptPet` interface (the RescueGroups result type)
- `adoptError` state (replace with just zip length guard on the button)
- `adoptLoading` state (the browser opens instantly)
- `getStateFromZip()` function (no longer needed)
- The entire `try/catch` block that called `rescueProxy`
- The RescueGroups pet grid rendering (`adoptPets.map(...)`)

Keep:
- `localShelterPets` state and `fetchLocalShelterPets()` — local Firestore shelter pets still show
- `zipCode` state
- `petType` state

### Step 5 — Verify and deploy

```bash
npx tsc --noEmit --skipLibCheck   # 0 errors
git add -A
git commit -m "Replace RescueGroups adoption with Adopt-a-Pet in-app browser"
eas update --channel production --message "Fix adoption: zip-accurate results via Adopt-a-Pet"
```

---

## PHASE 2 — Full API Integration (after getting partner API key)

> **Do this only after Adopt-a-Pet approves your partnership application.**
> Apply at: https://www.adoptapet.com/public/apis/pet_list.html or contact partnerships@adoptapet.com

Once you have an API key, store it as a Firebase remote config value or Cloud Function secret — **NEVER put it in app code**.

### Cloud Function: `adoptProxy`

Create `functions/src/adoptProxy.ts`:

```ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

const ADOPT_A_PET_KEY = functions.config().adoptapet.key; // set via: firebase functions:config:set adoptapet.key=YOUR_KEY

export const adoptProxy = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");

  const { zip, petType, start = 0 } = data;
  if (!zip || zip.length !== 5) throw new functions.https.HttpsError("invalid-argument", "Valid zip required");

  const typeNum = petType === "Dog" ? 1 : 2; // 1=dog, 2=cat per Adopt-a-Pet API
  const url = `https://api.adoptapet.com/search/pet_search?key=${ADOPT_A_PET_KEY}&v=2&output=json&zip=${zip}&pet_type_id=${typeNum}&start_number=${start}&end_number=${start + 12}`;

  const res = await fetch(url);
  const json = await res.json() as any;

  if (json.status === "fail") {
    throw new functions.https.HttpsError("internal", json.error?.msg || "API error");
  }

  return json;
});
```

### Update `searchAdopt()` in explore.tsx to use the Cloud Function

```ts
import { getFunctions, httpsCallable } from "firebase/functions";

const searchAdopt = async () => {
  if (!zipCode || zipCode.length < 5) return;
  setAdoptLoading(true);
  setAdoptError("");
  setAdoptPets([]);

  try {
    const fn = httpsCallable(getFunctions(), "adoptProxy");
    const result = await fn({ zip: zipCode, petType });
    const pets = (result.data as any).pets || [];
    setAdoptPets(pets.map((p: any) => ({
      id: String(p.pet_id),
      name: p.pet_name,
      breed: p.breed,
      age: p.age,
      sex: p.sex,
      photo: p.large_results_photo_url || p.photo_url || "",
      url: p.pet_details_url || `https://www.adoptapet.com/pet/${p.pet_id}`,
      city: p.city || "",
    })));
  } catch (e: any) {
    setAdoptError("Could not load pets. Please try again.");
  } finally {
    setAdoptLoading(false);
  }
};
```

### Deploy the Cloud Function

```bash
# Set your API key as a secret (never in code):
firebase functions:config:set adoptapet.key=YOUR_KEY_HERE

# Deploy ONLY adoptProxy — say N to rescueProxy, deleteAccount, getPublicStats:
firebase deploy --only functions
# When prompted: type Y for adoptProxy, N for everything else
```

---

## ⛔ DO NOT TOUCH

- `auth.mypetdex.app` — never change auth domain
- `service-account.json` — never commit
- Admin account: `mypetdexapp@gmail.com`
- **NEVER put the Adopt-a-Pet API key in app code or git** — Cloud Function secret only
- Firebase Functions deploy: always type N for `rescueProxy`, `deleteAccount`, `getPublicStats`
