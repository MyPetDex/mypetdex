# Cursor Prompt — 3 Fixes

Files to edit:
- `~/mypetdex/MyPetDex/app/pet/[id].tsx`
- `~/mypetdex/MyPetDex/app/(tabs)/index.tsx`

---

## Fix 1 — Vet Address: Split into Structured Fields

**File:** `app/pet/[id].tsx`

### 1a — Update vetForm state

Find:
```ts
const [vetForm, setVetForm] = useState({
  name: "", clinic: "", phone: "", address: "", email: "", notes: ""
});
```

Replace with:
```ts
const [vetForm, setVetForm] = useState({
  name: "", clinic: "", phone: "",
  street: "", city: "", state: "", zip: "", country: "USA",
  email: "", notes: ""
});
```

### 1b — Update openVetEdit to populate new fields

Find:
```ts
  function openVetEdit() {
    setVetForm({
      name: pet.vet?.name || "",
      clinic: pet.vet?.clinic || "",
      phone: pet.vet?.phone || "",
      address: pet.vet?.address || "",
      email: pet.vet?.email || "",
      notes: pet.vet?.notes || "",
    });
    setShowVetModal(true);
  }
```

Replace with:
```ts
  function openVetEdit() {
    setVetForm({
      name: pet.vet?.name || "",
      clinic: pet.vet?.clinic || "",
      phone: pet.vet?.phone || "",
      street: pet.vet?.street || "",
      city: pet.vet?.city || "",
      state: pet.vet?.state || "",
      zip: pet.vet?.zip || "",
      country: pet.vet?.country || "USA",
      email: pet.vet?.email || "",
      notes: pet.vet?.notes || "",
    });
    setShowVetModal(true);
  }
```

### 1c — Update vet card display

Find:
```tsx
            {pet.vet.address ? <Text style={styles.vetDetail}>📍 {pet.vet.address}</Text> : null}
```

Replace with:
```tsx
            {(pet.vet.street || pet.vet.address) ? (
              <Text style={styles.vetDetail}>
                📍 {pet.vet.street
                  ? `${pet.vet.street}${pet.vet.city ? `, ${pet.vet.city}` : ""}${pet.vet.state ? `, ${pet.vet.state}` : ""}${pet.vet.zip ? ` ${pet.vet.zip}` : ""}${pet.vet.country && pet.vet.country !== "USA" ? `, ${pet.vet.country}` : ""}`
                  : pet.vet.address}
              </Text>
            ) : null}
```

### 1d — Replace address field in the vet edit modal with 4 structured fields

Find this block in the vet edit modal:
```tsx
      <Text style={styles.modalLabel}>Address (optional)</Text>
      <TextInput
        style={styles.modalInput}
        value={vetForm.address}
        onChangeText={(v) => setVetForm(f => ({ ...f, address: v }))}
        placeholder="e.g. 123 Main St, Austin TX"
        placeholderTextColor="#aaa"
      />
```

Replace with:
```tsx
      <Text style={styles.modalLabel}>Street Address (optional)</Text>
      <TextInput
        style={styles.modalInput}
        value={vetForm.street}
        onChangeText={(v) => setVetForm(f => ({ ...f, street: v }))}
        placeholder="e.g. 123 Main St"
        placeholderTextColor="#aaa"
      />
      <View style={styles.editRow}>
        <View style={{ flex: 2 }}>
          <Text style={styles.modalLabel}>City</Text>
          <TextInput
            style={styles.modalInput}
            value={vetForm.city}
            onChangeText={(v) => setVetForm(f => ({ ...f, city: v }))}
            placeholder="City"
            placeholderTextColor="#aaa"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalLabel}>State</Text>
          <TextInput
            style={styles.modalInput}
            value={vetForm.state}
            onChangeText={(v) => setVetForm(f => ({ ...f, state: v.toUpperCase() }))}
            placeholder="NJ"
            placeholderTextColor="#aaa"
            maxLength={2}
            autoCapitalize="characters"
          />
        </View>
      </View>
      <View style={styles.editRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalLabel}>Zip Code</Text>
          <TextInput
            style={styles.modalInput}
            value={vetForm.zip}
            onChangeText={(v) => setVetForm(f => ({ ...f, zip: v }))}
            placeholder="08816"
            placeholderTextColor="#aaa"
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalLabel}>Country</Text>
          <TextInput
            style={styles.modalInput}
            value={vetForm.country}
            onChangeText={(v) => setVetForm(f => ({ ...f, country: v }))}
            placeholder="USA"
            placeholderTextColor="#aaa"
          />
        </View>
      </View>
```

---

## Fix 2 — Pet Photo Flicker: Use expo-image for Caching

**CRITICAL:** Only change how photos are DISPLAYED. Do NOT touch any of these — leave them 100% unchanged:
- `uploadPetPhoto()` function call
- `ImagePicker` code
- `editPhotoUri` state
- The edit modal's photo preview (`<Image source={{ uri: editPhotoUri || pet.photoURL }}`)
- The `photoPreview` style Image inside the edit modal

Only change the two READ-ONLY display Images listed below.

### 2a — File: `app/(tabs)/index.tsx`

Add this import at the top of the file (alongside existing imports):
```ts
import { Image as ExpoImage } from "expo-image";
```

Find the pet dashboard card photo (the one showing `selectedPet.photoURL`):
```tsx
                  {selectedPet.photoURL ? (
                    <Image source={{ uri: selectedPet.photoURL }} style={styles.petDashAvatarImage} />
```

Replace with:
```tsx
                  {selectedPet.photoURL ? (
                    <ExpoImage
                      source={{ uri: selectedPet.photoURL }}
                      style={styles.petDashAvatarImage}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      transition={0}
                    />
```

### 2b — File: `app/pet/[id].tsx`

Add this import at the top of the file (alongside existing imports):
```ts
import { Image as ExpoImage } from "expo-image";
```

Find the pet profile header avatar (the read-only display, NOT the edit modal preview):
```tsx
          {pet.photoURL ? (
            <Image source={{ uri: pet.photoURL }} style={styles.avatarImage} />
```

Replace with:
```tsx
          {pet.photoURL ? (
            <ExpoImage
              source={{ uri: pet.photoURL }}
              style={styles.avatarImage}
              cachePolicy="memory-disk"
              contentFit="cover"
              transition={0}
            />
```

Do NOT change the Image components inside the edit modal (the `editPhotoUri || pet.photoURL` one). Leave those as React Native `Image`.

---

## Fix 3 — Keyboard Covering Inputs: Wrap All Modals in KeyboardAvoidingView

**File:** `app/pet/[id].tsx`

The edit pet modal already has KeyboardAvoidingView — leave it alone.

For every OTHER modal that has a `<ScrollView contentContainerStyle={styles.modalScroll}>` directly inside `<View style={styles.modalContainer}>`, wrap the content like this:

The pattern to apply to each modal is:
```tsx
<Modal ...>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>...</View>
      <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
        ...
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>
```

Apply this pattern to ALL of these modals (find each by its title):
1. **"Add Record"** modal
2. **"Add Reminder" / "Edit Reminder"** modal
3. **"Add Medication" / "Edit Medication"** modal
4. **"Vet Contact"** modal
5. **"Log Weight"** modal

For each one: wrap the existing `<View style={styles.modalContainer}>` with the `<KeyboardAvoidingView>` shown above, and add `keyboardShouldPersistTaps="handled"` to the ScrollView if it's not already there.

---

## Deploy

After Cursor finishes:
```bash
cd ~/mypetdex/MyPetDex && eas update --channel development --message "Vet address fields, photo caching, keyboard fix"
```
