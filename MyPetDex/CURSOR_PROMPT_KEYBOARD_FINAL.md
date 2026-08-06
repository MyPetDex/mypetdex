# MyPetDex — Final Keyboard Fix (All Remaining Screens)

Three files have keyboard issues. Apply all three fixes.

---

## FILE 1 — `app/onboarding.tsx`

**Problem:** KAV `behavior="padding"` AND `automaticallyAdjustKeyboardInsets={true}` on the
ScrollView are both active at the same time. They fight each other — the scroll jumps to the
bottom of the form showing only the submit button, hiding all the text fields.

**Fix:** Remove `automaticallyAdjustKeyboardInsets={true}` from the ScrollView.
The KAV with `behavior="padding"` already handles the inset — do not use both.

**Find:**
```tsx
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        bounces={false}
      >
```

**Replace with:**
```tsx
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
```

---

## FILE 2 — `app/(auth)/sign-in.tsx`

**Problem:** Same as onboarding — both KAV `behavior="padding"` and
`automaticallyAdjustKeyboardInsets={true}` are active, causing double adjustment.
This file has two ScrollViews with the same problem (sign-in form and sign-up form).

**Fix:** Remove `automaticallyAdjustKeyboardInsets={true}` from BOTH ScrollViews.

There are two occurrences — find and remove both:

**Find (appears twice):**
```tsx
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true} bounces={false}>
```

**Replace both with:**
```tsx
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
```

---

## FILE 3 — `app/(tabs)/shelter-add-pet.tsx`

**Problem:** The form has multiple TextInputs inside a plain `ScrollView` with no
`KeyboardAvoidingView` at all. Keyboard slides up and covers the inputs.

**Fix:** Wrap the root `ScrollView` in a `KeyboardAvoidingView`.

### Step 1 — Add imports

Add `KeyboardAvoidingView` and `Platform` to the existing React Native import:

```tsx
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Platform,
  KeyboardAvoidingView,
} from "react-native";
```

### Step 2 — Wrap the ScrollView

**Find the opening tag:**
```tsx
    <ScrollView style={s.container} contentContainerStyle={s.content}>
```

**Replace with:**
```tsx
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
```

**Find the closing tag** (last `</ScrollView>` in the return):
```tsx
    </ScrollView>
```

**Replace with:**
```tsx
    </ScrollView>
    </KeyboardAvoidingView>
```

> Make sure you're replacing the OUTER closing `</ScrollView>` at the end of the return,
> not the inner ones (chip row, horizontal scrolls).

---

## FILE 4 — `app/(tabs)/provider-services.tsx`

**Problem:** The edit modal contains a `ScrollView` with many `TextInput` fields but no
`KeyboardAvoidingView`. When the keyboard opens inside the modal, it covers the inputs.

### Step 1 — Add imports

Add `KeyboardAvoidingView` and `Platform` to the existing React Native import:

```tsx
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
```

### Step 2 — Wrap the modal's ScrollView

**Find:**
```tsx
      <Modal visible={editMode} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} contentContainerStyle={s.modalContent}>
```

**Replace with:**
```tsx
      <Modal visible={editMode} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flexShrink: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ScrollView style={s.modal} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
```

**Find the closing tags of the modal:**
```tsx
        </ScrollView>
      </Modal>
```

**Replace with:**
```tsx
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
```

---

## After Applying All Four Files

```bash
npx tsc --noEmit --skipLibCheck   # must be 0 errors
git add -A
git commit -m "Keyboard fix: remove double-adjustment in onboarding+signin, add KAV to shelter-add-pet and provider-services modal"
eas update --channel production --message "Keyboard: final fix across all remaining screens"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
