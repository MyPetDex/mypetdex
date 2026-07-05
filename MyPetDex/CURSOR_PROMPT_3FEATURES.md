# Cursor Prompt — 3 New Features in app/pet/[id].tsx

## Overview
We are adding 3 features to the pet profile screen (`app/pet/[id].tsx`):
1. **Medication Tracking Tab** — a new "Meds" tab with structured medication CRUD
2. **Weight History Chart** — inside the Calories tab, log weight over time + SVG line chart
3. **Vet Contact Card** — at the top of the Records tab, store/display the pet's vet info

**Do not change any existing functionality.** All existing tabs (Records, Reminders, Calories, Recipes) stay exactly as they are — we only add to them.

---

## Feature 1 — Medication Tracking Tab

### Tab bar change
Change the TABS constant from:
```ts
const TABS = ["Records", "Reminders", "Calories", "Recipes"];
```
to:
```ts
const TABS = ["Records", "Reminders", "Meds", "Calories", "Recipes"];
```

Because there are now 5 tabs, reduce the tab text font size in `styles.tabText` from `13` to `11` so all 5 fit without clipping.

### Tab render
In the `<ScrollView>` that renders tab content, add:
```tsx
{activeTab === "Meds" && <MedsTab pet={pet} user={user} />}
```
Place it between the Reminders and Calories lines.

### Data model
Medications are stored as an array on the pet Firestore document at `users/{uid}/pets/{petId}` under the key `medications`.

Each medication object:
```ts
{
  id: string,           // Date.now().toString()
  name: string,         // required, e.g. "Heartgard Plus"
  dosage: string,       // e.g. "1 tablet" or "5mg"
  frequency: string,    // one of FREQ options
  refillDate: string,   // "YYYY-MM-DD" or ""
  note: string,         // optional
  active: boolean,      // true = currently taking, false = stopped
}
```

### MedsTab component
Create a new `MedsTab` component (same pattern as `RecordsTab`).

**State:**
```ts
const [showModal, setShowModal] = useState(false);
const [saving, setSaving] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [form, setForm] = useState({
  name: "", dosage: "", frequency: "Daily", refillDate: "", note: ""
});
```

**Constants:**
```ts
const FREQ = ["Daily", "Twice Daily", "Weekly", "Monthly", "As Needed", "Other"];
```

**Derived data:**
```ts
const medications = pet.medications || [];
const active = medications.filter((m: any) => m.active !== false);
const inactive = medications.filter((m: any) => m.active === false);
```

**Helper — refill warning:**
Return `true` if `refillDate` is set and is within 7 days from today:
```ts
function isRefillSoon(refillDate: string): boolean {
  if (!refillDate) return false;
  const [y, m, d] = refillDate.split("-").map(Number);
  const refill = new Date(y, m - 1, d);
  const diff = (refill.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}
```

**openAdd:**
```ts
function openAdd() {
  setEditingId(null);
  setForm({ name: "", dosage: "", frequency: "Daily", refillDate: "", note: "" });
  setShowModal(true);
}
```

**openEdit:**
```ts
function openEdit(m: any) {
  setEditingId(m.id);
  setForm({ name: m.name, dosage: m.dosage || "", frequency: m.frequency || "Daily", refillDate: m.refillDate || "", note: m.note || "" });
  setShowModal(true);
}
```

**saveMed:**
```ts
async function saveMed() {
  if (!form.name.trim()) { Alert.alert("Missing info", "Please enter a medication name."); return; }
  setSaving(true);
  try {
    let updated;
    if (editingId) {
      updated = medications.map((m: any) =>
        m.id === editingId ? { ...m, ...form } : m
      );
    } else {
      updated = [...medications, { ...form, id: Date.now().toString(), active: true }];
    }
    await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { medications: updated });
    setShowModal(false);
  } catch { Alert.alert("Error", "Could not save medication."); }
  setSaving(false);
}
```

**toggleActive:**
```ts
async function toggleActive(medId: string) {
  const updated = medications.map((m: any) =>
    m.id === medId ? { ...m, active: !m.active } : m
  );
  await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { medications: updated });
}
```

**deleteMed:**
```ts
async function deleteMed(medId: string) {
  Alert.alert("Delete Medication", "This cannot be undone.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      const updated = medications.filter((m: any) => m.id !== medId);
      await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { medications: updated });
    }},
  ]);
}
```

**Render — MedsTab:**

Show an empty state if `medications.length === 0`:
- Emoji: 💊
- Title: "No medications yet"
- Sub: "Track your pet's medications, dosages & refills"

Otherwise show two sections:
- **"Active"** label above `active` meds
- **"Stopped"** label above `inactive` meds (only if `inactive.length > 0`)

Each medication card (`medCard` style):
- Left colored bar (`medBar`): green `#22C55E` if active, grey `#94A3B8` if inactive
- Middle section:
  - Top row: medication name (bold) + refill date right-aligned (small, grey, or orange `#F97316` with "⚠️ Refill soon" if `isRefillSoon`)
  - `dosage` if set: `"💊 {dosage}"`
  - `frequency`: `"🔁 {frequency}"`
  - `note` if set: italic grey text
- Right side: edit icon `✏️` button + delete icon `🗑️` button stacked vertically
- On long-press card body: call `deleteMed`

Below the cards: `"+ Add Medication"` button (same `addBtn` style as other tabs).

**Add/Edit Modal** (same presentationStyle="pageSheet" pattern as other modals):

Title: "Add Medication" or "Edit Medication"

Form fields:
1. **Medication Name *** — TextInput, placeholder "e.g. Heartgard Plus"
2. **Dosage** — TextInput, placeholder "e.g. 1 tablet, 5mg"
3. **Frequency** — horizontal ScrollView of `typeChip` buttons for each value in FREQ
4. **Refill Date** — Use the existing `<DatePicker>` component with `future={true}` and `showTime={false}`. Label: "Refill Date (optional)". Pass `value={form.refillDate}` and `onChange={(v) => setForm(f => ({...f, refillDate: v}))}`.
5. **Notes (optional)** — multiline TextInput, placeholder "Any instructions or notes..."

Save button: "Save Medication" or "Update Medication"

**New styles to add to StyleSheet:**
```ts
medCard: { backgroundColor: "#fff", borderRadius: 12, flexDirection: "row", overflow: "hidden", alignItems: "stretch" },
medBar: { width: 4 },
medContent: { flex: 1, padding: 14, gap: 3 },
medName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
medDosage: { fontSize: 13, color: "#555" },
medFreq: { fontSize: 13, color: "#888" },
medNote: { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 },
medRefill: { fontSize: 12, color: "#888" },
medRefillWarn: { fontSize: 12, color: "#F97316", fontWeight: "600" },
medTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
medActions: { flexDirection: "column", justifyContent: "center", gap: 4, paddingRight: 12, paddingVertical: 12 },
```

---

## Feature 2 — Weight History Chart (in Calories tab)

### Data storage
Weight log entries are stored in a **Firestore subcollection**: `users/{uid}/pets/{petId}/weightLog`

Each document:
```ts
{ weight: number, weightUnit: string, date: string, createdAt: serverTimestamp() }
```
`date` is a `"YYYY-MM-DD"` string (user picks it from DatePicker, default to today).

### Import
Add `Svg, Polyline, Circle, Line, Text as SvgText` from `"react-native-svg"` at the top of the file (already installed). Also import `collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot` — most of these are already imported, just verify `limit` is included.

### CaloriesTab signature change
Change from:
```tsx
function CaloriesTab({ pet }: { pet: any }) {
```
to:
```tsx
function CaloriesTab({ pet, user }: { pet: any; user: any }) {
```

Update the render call in the main component from:
```tsx
{activeTab === "Calories" && <CaloriesTab pet={pet} />}
```
to:
```tsx
{activeTab === "Calories" && <CaloriesTab pet={pet} user={user} />}
```

### CaloriesTab additions

Add this state inside CaloriesTab (before the existing `if (weightKg === 0)` early return):
```ts
const [weightLog, setWeightLog] = useState<any[]>([]);
const [showWeightModal, setShowWeightModal] = useState(false);
const [weightEntry, setWeightEntry] = useState({
  weight: pet.weight?.toString() || "",
  weightUnit: pet.weightUnit || "lbs",
  date: new Date().toISOString().slice(0, 10),
});
const [savingWeight, setSavingWeight] = useState(false);
```

Add a `useEffect` to subscribe to the weightLog subcollection:
```ts
useEffect(() => {
  if (!user) return;
  const q = query(
    collection(db, "users", user.uid, "pets", pet.id, "weightLog"),
    orderBy("date", "asc"),
    limit(20)
  );
  const unsub = onSnapshot(q, snap => {
    setWeightLog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}, [user, pet.id]);
```

Add save function:
```ts
async function saveWeightEntry() {
  const w = parseFloat(weightEntry.weight);
  if (!w || w <= 0) { Alert.alert("Invalid", "Please enter a valid weight."); return; }
  setSavingWeight(true);
  try {
    await addDoc(collection(db, "users", user.uid, "pets", pet.id, "weightLog"), {
      weight: w,
      weightUnit: weightEntry.weightUnit,
      date: weightEntry.date,
      createdAt: serverTimestamp(),
    });
    setShowWeightModal(false);
  } catch { Alert.alert("Error", "Could not save weight entry."); }
  setSavingWeight(false);
}
```

### Weight Chart SVG component

Create a helper component inside the file (not exported) called `WeightChart`:

```tsx
function WeightChart({ data }: { data: any[] }) {
  if (data.length < 2) return null;

  const W = 320, H = 120, PAD = { top: 12, bottom: 28, left: 36, right: 12 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const weights = data.map((d: any) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const xStep = chartW / (data.length - 1);
  const points = data.map((d: any, i: number) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + chartH - ((d.weight - minW) / range) * chartH;
    return { x, y, d };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");

  // Show every Nth date label so they don't overlap (max 5 labels)
  const labelStep = Math.ceil(data.length / 5);

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Baseline */}
      <Line
        x1={PAD.left} y1={PAD.top + chartH}
        x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="#E5E7EB" strokeWidth={1}
      />
      {/* Line */}
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke="#4486F4"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#4486F4" />
      ))}
      {/* X labels */}
      {points.map((p, i) =>
        i % labelStep === 0 ? (
          <SvgText
            key={i}
            x={p.x}
            y={H - 4}
            fontSize={9}
            fill="#94A3B8"
            textAnchor="middle"
          >
            {p.d.date.slice(5)} {/* MM-DD */}
          </SvgText>
        ) : null
      )}
      {/* Y labels: min and max */}
      <SvgText x={PAD.left - 4} y={PAD.top + chartH} fontSize={9} fill="#94A3B8" textAnchor="end">
        {minW}
      </SvgText>
      <SvgText x={PAD.left - 4} y={PAD.top + 8} fontSize={9} fill="#94A3B8" textAnchor="end">
        {maxW}
      </SvgText>
    </Svg>
  );
}
```

### Weight history section in CaloriesTab render

After the closing of the existing content (after the `infoCard` View), add a new section **before** the closing `</View>` of the tab:

```tsx
{/* Weight History */}
<View style={styles.infoCard}>
  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
    <Text style={styles.infoTitle}>⚖️ Weight History</Text>
    <Pressable
      style={{ backgroundColor: BRAND, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
      onPress={() => setShowWeightModal(true)}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>+ Log</Text>
    </Pressable>
  </View>

  {weightLog.length === 0 ? (
    <Text style={{ color: "#aaa", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
      No weight entries yet. Tap + Log to start tracking.
    </Text>
  ) : weightLog.length === 1 ? (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: "#1a1a1a" }}>
        {weightLog[0].weight} {weightLog[0].weightUnit}
      </Text>
      <Text style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{weightLog[0].date}</Text>
      <Text style={{ color: "#aaa", fontSize: 12, marginTop: 8 }}>Log one more entry to see the chart.</Text>
    </View>
  ) : (
    <>
      {/* Trend indicator */}
      {(() => {
        const last = weightLog[weightLog.length - 1].weight;
        const prev = weightLog[weightLog.length - 2].weight;
        const diff = (last - prev).toFixed(1);
        const unit = weightLog[weightLog.length - 1].weightUnit;
        const up = last > prev;
        const same = last === prev;
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 20 }}>{same ? "➡️" : up ? "📈" : "📉"}</Text>
            <Text style={{ fontSize: 14, color: "#555" }}>
              {same ? "No change" : `${up ? "+" : ""}${diff} ${unit} since last entry`}
            </Text>
          </View>
        );
      })()}
      <View style={{ alignItems: "center" }}>
        <WeightChart data={weightLog} />
      </View>
      {/* Last 5 entries list */}
      <View style={{ marginTop: 12, gap: 6 }}>
        {[...weightLog].reverse().slice(0, 5).map((entry: any) => (
          <View key={entry.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: "#888" }}>{entry.date}</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>
              {entry.weight} {entry.weightUnit}
            </Text>
          </View>
        ))}
      </View>
    </>
  )}
</View>

{/* Log Weight Modal */}
<Modal
  visible={showWeightModal}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setShowWeightModal(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>Log Weight</Text>
      <Pressable onPress={() => setShowWeightModal(false)}>
        <Text style={styles.modalClose}>Cancel</Text>
      </Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.modalScroll}>
      <Text style={styles.modalLabel}>Weight *</Text>
      <View style={styles.weightRow}>
        <TextInput
          style={[styles.modalInput, { flex: 1 }]}
          value={weightEntry.weight}
          onChangeText={(t) => setWeightEntry(e => ({ ...e, weight: t.replace(/[^0-9.]/g, "") }))}
          keyboardType="decimal-pad"
          placeholder="e.g. 65"
          placeholderTextColor="#aaa"
        />
        <Pressable
          style={styles.unitToggle}
          onPress={() => setWeightEntry(e => ({ ...e, weightUnit: e.weightUnit === "lbs" ? "kg" : "lbs" }))}
        >
          <Text style={styles.unitText}>{weightEntry.weightUnit}</Text>
        </Pressable>
      </View>
      <DatePicker
        label="Date *"
        value={weightEntry.date}
        onChange={(v) => setWeightEntry(e => ({ ...e, date: v }))}
        future={false}
      />
      <Pressable
        style={[styles.saveBtn, savingWeight && { opacity: 0.6 }]}
        onPress={saveWeightEntry}
        disabled={savingWeight}
      >
        {savingWeight
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Entry</Text>
        }
      </Pressable>
    </ScrollView>
  </View>
</Modal>
```

---

## Feature 3 — Vet Contact Card (in Records tab)

### Data model
Vet info is stored as an object on the pet Firestore document under the key `vet`:
```ts
{
  name: string,     // vet or clinic name, e.g. "Dr. Sarah Lee"
  clinic: string,   // clinic name, e.g. "Happy Paws Veterinary"
  phone: string,    // e.g. "555-123-4567"
  address: string,  // optional
  email: string,    // optional
  notes: string,    // optional
}
```

### RecordsTab signature change
Change from:
```tsx
function RecordsTab({ pet, user }: { pet: any; user: any }) {
```
No change needed — it already takes `user`. Just add new state for vet editing.

### RecordsTab additions

Add state at the top of RecordsTab (alongside the existing `showModal` state):
```ts
const [showVetModal, setShowVetModal] = useState(false);
const [savingVet, setSavingVet] = useState(false);
const [vetForm, setVetForm] = useState({
  name: "", clinic: "", phone: "", address: "", email: "", notes: ""
});
```

Add openVetEdit function:
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

Add saveVet function:
```ts
async function saveVet() {
  setSavingVet(true);
  try {
    await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { vet: vetForm });
    setShowVetModal(false);
  } catch { Alert.alert("Error", "Could not save vet info."); }
  setSavingVet(false);
}
```

### Vet card render

**At the very top of the RecordsTab return, before the existing empty state / records list**, add:

```tsx
{/* Vet Contact Card */}
<View style={styles.vetCard}>
  <View style={styles.vetCardHeader}>
    <Text style={styles.vetCardTitle}>🏥 My Vet</Text>
    <Pressable onPress={openVetEdit}>
      <Text style={styles.vetCardEdit}>{pet.vet?.name ? "Edit" : "+ Add Vet"}</Text>
    </Pressable>
  </View>
  {pet.vet?.name ? (
    <View style={styles.vetCardBody}>
      <Text style={styles.vetName}>{pet.vet.name}</Text>
      {pet.vet.clinic ? <Text style={styles.vetDetail}>🏥 {pet.vet.clinic}</Text> : null}
      {pet.vet.phone ? (
        <Pressable onPress={() => Linking.openURL(`tel:${pet.vet.phone.replace(/\D/g, "")}`)}>
          <Text style={[styles.vetDetail, styles.vetPhone]}>📞 {pet.vet.phone}</Text>
        </Pressable>
      ) : null}
      {pet.vet.address ? <Text style={styles.vetDetail}>📍 {pet.vet.address}</Text> : null}
      {pet.vet.email ? (
        <Pressable onPress={() => Linking.openURL(`mailto:${pet.vet.email}`)}>
          <Text style={[styles.vetDetail, styles.vetPhone]}>✉️ {pet.vet.email}</Text>
        </Pressable>
      ) : null}
      {pet.vet.notes ? <Text style={styles.vetNotes}>{pet.vet.notes}</Text> : null}
    </View>
  ) : (
    <Text style={styles.vetEmptyText}>Tap "+ Add Vet" to save your vet's contact info</Text>
  )}
</View>
```

**Vet Edit Modal** — add at the bottom of RecordsTab return (inside `<View style={styles.tabContent}>`), before the closing `</View>`:

```tsx
<Modal
  visible={showVetModal}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setShowVetModal(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>Vet Contact</Text>
      <Pressable onPress={() => setShowVetModal(false)}>
        <Text style={styles.modalClose}>Cancel</Text>
      </Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.modalScroll}>
      <Text style={styles.modalLabel}>Vet / Doctor Name</Text>
      <TextInput
        style={styles.modalInput}
        value={vetForm.name}
        onChangeText={(v) => setVetForm(f => ({ ...f, name: v }))}
        placeholder="e.g. Dr. Sarah Lee"
        placeholderTextColor="#aaa"
      />
      <Text style={styles.modalLabel}>Clinic Name</Text>
      <TextInput
        style={styles.modalInput}
        value={vetForm.clinic}
        onChangeText={(v) => setVetForm(f => ({ ...f, clinic: v }))}
        placeholder="e.g. Happy Paws Veterinary"
        placeholderTextColor="#aaa"
      />
      <Text style={styles.modalLabel}>Phone Number</Text>
      <TextInput
        style={styles.modalInput}
        value={vetForm.phone}
        onChangeText={(v) => setVetForm(f => ({ ...f, phone: v }))}
        placeholder="e.g. 555-123-4567"
        placeholderTextColor="#aaa"
        keyboardType="phone-pad"
      />
      <Text style={styles.modalLabel}>Address (optional)</Text>
      <TextInput
        style={styles.modalInput}
        value={vetForm.address}
        onChangeText={(v) => setVetForm(f => ({ ...f, address: v }))}
        placeholder="e.g. 123 Main St, Austin TX"
        placeholderTextColor="#aaa"
      />
      <Text style={styles.modalLabel}>Email (optional)</Text>
      <TextInput
        style={styles.modalInput}
        value={vetForm.email}
        onChangeText={(v) => setVetForm(f => ({ ...f, email: v }))}
        placeholder="e.g. clinic@happypaws.com"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.modalLabel}>Notes (optional)</Text>
      <TextInput
        style={[styles.modalInput, styles.modalTextarea]}
        value={vetForm.notes}
        onChangeText={(v) => setVetForm(f => ({ ...f, notes: v }))}
        placeholder="Emergency hours, parking notes, etc."
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      <Pressable
        style={[styles.saveBtn, savingVet && { opacity: 0.6 }]}
        onPress={saveVet}
        disabled={savingVet}
      >
        {savingVet
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Vet Info</Text>
        }
      </Pressable>
    </ScrollView>
  </View>
</Modal>
```

**New styles to add to StyleSheet:**
```ts
// Vet card
vetCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 4 },
vetCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
vetCardTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
vetCardEdit: { fontSize: 14, color: "#4486F4", fontWeight: "600" },
vetCardBody: { gap: 5 },
vetName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
vetDetail: { fontSize: 13, color: "#555" },
vetPhone: { color: "#4486F4", fontWeight: "600" },
vetNotes: { fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4 },
vetEmptyText: { fontSize: 13, color: "#aaa", textAlign: "center", paddingVertical: 8 },
```

---

## Deploy command
After Cursor finishes, run this to push the update:
```
cd ~/mypetdex/MyPetDex && eas update --channel development
```

**Do not run `eas build`.** OTA update is enough.

---

## Summary checklist for Cursor
- [ ] TABS array updated to 5 items (add "Meds" between "Reminders" and "Calories")
- [ ] `styles.tabText` font size reduced to 11
- [ ] `MedsTab` component created with full CRUD (add/edit/delete/toggle-active)
- [ ] `MedsTab` rendered in the ScrollView tab switcher
- [ ] `WeightChart` SVG component created using `react-native-svg`
- [ ] `CaloriesTab` accepts `user` prop and renders weight history section + log modal
- [ ] Firestore writes for weightLog go to subcollection `weightLog` under the pet doc
- [ ] Vet contact card appears at top of `RecordsTab`
- [ ] Vet card shows phone as tappable (opens phone dialer) and email as tappable (opens mail)
- [ ] All new styles added to the StyleSheet at the bottom of the file
- [ ] Existing functionality untouched
