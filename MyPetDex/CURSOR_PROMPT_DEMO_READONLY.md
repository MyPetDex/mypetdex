# MyPetDex — Demo Account Read-Only Mode

The demo account (`demo@mypetdex.app`) has `isDemo: true` in its Firestore user document.
The `useUserProfile()` hook already returns `profile?.isDemo`.

Make the demo account fully read-only: no adding, editing, or deleting anything.
The AI Pet Assistant shows a subscribe prompt instead of the chat interface.

---

## PATTERN (use this everywhere below)

At the top of every component that needs it, get the demo flag:
```tsx
const { profile } = useUserProfile();
const isDemo = !!profile?.isDemo;
```

---

## FILE 1 — `app/pet/[id].tsx`

### 1a — Hide "Add Record" button for demo users

**Find:**
```tsx
<Pressable style={styles.addBtn} onPress={() => setShowRecordForm(true)}>
```
**Replace with:**
```tsx
{!isDemo && (
  <Pressable style={styles.addBtn} onPress={() => setShowRecordForm(true)}>
```
Close the conditional after the closing `</Pressable>` of that button:
```tsx
  </Pressable>
)}
```

### 1b — Hide delete icon on each record row for demo users

**Find the trash/delete Pressable inside the records map — it looks like:**
```tsx
<Pressable onPress={() => deleteRecord(r.id)} style={styles.deleteBtn}>
```
Wrap it:
```tsx
{!isDemo && (
  <Pressable onPress={() => deleteRecord(r.id)} style={styles.deleteBtn}>
    ...
  </Pressable>
)}
```

### 1c — Hide "Add Medication" button for demo users

**Find:**
```tsx
<Pressable style={styles.addBtn} onPress={() => setShowMedForm(true)}>
```
Wrap it:
```tsx
{!isDemo && (
  <Pressable style={styles.addBtn} onPress={() => setShowMedForm(true)}>
    ...
  </Pressable>
)}
```

### 1d — Hide med edit/delete icons for demo users

Find the edit and delete Pressables inside the medications map and wrap each:
```tsx
{!isDemo && (<Pressable onPress={() => startEditMed(m)}> ... </Pressable>)}
{!isDemo && (<Pressable onPress={() => deleteMed(m.id)}> ... </Pressable>)}
```

### 1e — Hide "Add Reminder" button for demo users

**Find the Pressable that opens the reminder form (look for `setShowReminderForm(true)`):**
```tsx
{!isDemo && (
  <Pressable ... onPress={() => setShowReminderForm(true)}>
    ...
  </Pressable>
)}
```

### 1f — Hide reminder delete icons for demo users

Inside the reminders map, wrap the delete Pressable:
```tsx
{!isDemo && (<Pressable onPress={() => deleteReminder(r.id)}> ... </Pressable>)}
```

### 1g — Disable pet photo + name edit for demo users

Find the camera/edit icon that opens the pet edit modal (look for `setEditMode(true)` or `setShowEditPet(true)`).
Wrap that Pressable:
```tsx
{!isDemo && (
  <Pressable onPress={() => setEditMode(true)}>
    ...
  </Pressable>
)}
```

### 1h — Add "Demo Mode" notice at top of Records tab

Inside the Records tab content, add at the very top before the first card:
```tsx
{isDemo && (
  <View style={styles.demoBanner}>
    <Ionicons name="eye-outline" size={15} color="#6366f1" />
    <Text style={styles.demoBannerText}>Demo mode — records are view only</Text>
  </View>
)}
```

Add style:
```ts
demoBanner: {
  flexDirection: "row", alignItems: "center", gap: 6,
  backgroundColor: "#eef2ff", borderRadius: 10,
  paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
},
demoBannerText: { fontSize: 13, color: "#6366f1", fontWeight: "600" },
```

---

## FILE 2 — `app/(tabs)/me.tsx`

### 2a — Hide "Delete Account" for demo users

Find the delete account button/row and wrap it:
```tsx
{!isDemo && (
  // delete account pressable
)}
```

### 2b — Hide "Edit Profile" / personal info edit for demo users

Find the edit profile button and wrap it:
```tsx
{!isDemo && (
  // edit profile pressable
)}
```

### 2c — Show a demo mode card at the top of the Me tab

Find the first `<ScrollView>` content in the Me tab return and add at the top:
```tsx
{isDemo && (
  <View style={styles.demoCard}>
    <Ionicons name="sparkles-outline" size={20} color="#6366f1" />
    <View style={{ flex: 1 }}>
      <Text style={styles.demoCardTitle}>You're in Demo Mode</Text>
      <Text style={styles.demoCardSub}>Sign up to unlock all features and create your own account.</Text>
    </View>
  </View>
)}
```

Add styles:
```ts
demoCard: {
  flexDirection: "row", alignItems: "center", gap: 12,
  backgroundColor: "#eef2ff", borderRadius: 16,
  padding: 16, marginHorizontal: 16, marginBottom: 16,
  borderWidth: 1, borderColor: "#c7d2fe",
},
demoCardTitle: { fontSize: 14, fontWeight: "700", color: "#4f46e5" },
demoCardSub: { fontSize: 12, color: "#6366f1", marginTop: 2, lineHeight: 16 },
```

---

## FILE 3 — `app/(tabs)/ai.tsx`

### 3a — Show subscribe prompt instead of chat for demo users

Find the main return of the AI screen. After the header/title area, before the chat ScrollView, add:

```tsx
{isDemo ? (
  <View style={styles.demoLock}>
    <View style={styles.demoLockIcon}>
      <Ionicons name="sparkles" size={36} color={BRAND} />
    </View>
    <Text style={styles.demoLockTitle}>AI Pet Assistant</Text>
    <Text style={styles.demoLockSub}>
      Get instant answers about your pet's health, nutrition, and behavior — personalized to their breed, age, and weight.
    </Text>
    <Pressable
      style={styles.demoLockBtn}
      onPress={() => router.push("/settings/subscription")}
    >
      <Ionicons name="star" size={16} color="#fff" />
      <Text style={styles.demoLockBtnText}>Subscribe to Unlock</Text>
    </Pressable>
    <Text style={styles.demoLockFeatures}>
      ✦ Personalized health advice{"\n"}
      ✦ Vaccine & medication guidance{"\n"}
      ✦ Smart record saving{"\n"}
      ✦ Nutrition & recipe help
    </Text>
  </View>
) : (
  // existing chat UI here — wrap the ENTIRE existing chat section in this else branch
)}
```

Add styles:
```ts
demoLock: {
  flex: 1, alignItems: "center", justifyContent: "center",
  paddingHorizontal: 32, gap: 16,
},
demoLockIcon: {
  width: 80, height: 80, borderRadius: 24,
  backgroundColor: "#EEF2FF",
  alignItems: "center", justifyContent: "center",
  marginBottom: 8,
},
demoLockTitle: {
  fontSize: 24, fontWeight: "800", color: "#1a1a1a", textAlign: "center",
},
demoLockSub: {
  fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22,
},
demoLockBtn: {
  flexDirection: "row", alignItems: "center", gap: 8,
  backgroundColor: BRAND, borderRadius: 16,
  paddingHorizontal: 28, paddingVertical: 14,
  marginTop: 4,
},
demoLockBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
demoLockFeatures: {
  fontSize: 14, color: "#888", lineHeight: 26, textAlign: "center",
},
```

---

## After Applying All Three Files

```bash
npx tsc --noEmit --skipLibCheck   # must be 0 errors
git add -A
git commit -m "Demo account: full read-only mode + AI subscribe prompt"
eas update --channel production --message "Demo: read-only mode for all editing + AI locked"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
