# Fix Recipe Calorie Formula — Match Website Exactly

## Goal
The app calorie formula must match home.mypetdex.app/calorie-guide and the homepage calculator exactly.
Currently the app is missing: correct life stage multipliers, BCS adjustment, and the combined
life-stage+activity dropdown. This prompt brings the app into perfect alignment with the website.

**Correct formula (from home.mypetdex.app/calorie-guide):**
```
RER = 70 × weight_kg^0.75
MER = RER × lifeStageActivityFactor × bcsAdjustment
```

Where `lifeStageActivityFactor` is a single combined value (neutered vs intact),
and `bcsAdjustment` uses the exact 9-point scale from the website.

Do NOT rebuild any screens. Edit only what's described below.

---

## PART 1: `app/pet/add.tsx` — Replace activity level with Life Stage & Activity

### 1A. Replace constants

Remove:
```ts
const ACTIVITY_LEVELS = ["sedentary", "indoor", "active", "very active"];
```

Add:
```ts
const LIFE_STAGE_ACTIVITY = [
  "adult_low",
  "adult_moderate",
  "adult_high",
  "senior",
  "puppy",
  "pregnant",
  "nursing",
];

const LIFE_STAGE_LABELS: Record<string, string> = {
  adult_low:      "🏠 Adult — Low (indoor)",
  adult_moderate: "🚶 Adult — Moderate",
  adult_high:     "🏃 Adult — High (sport)",
  senior:         "🦴 Senior (7+ yrs)",
  puppy:          "🐾 Puppy / Kitten",
  pregnant:       "🤰 Pregnant",
  nursing:        "🍼 Nursing",
};
```

### 1B. Change activityLevel state default
```ts
const [activityLevel, setActivityLevel] = useState("adult_moderate");
```

### 1C. Add BCS state
```ts
const [bcs, setBcs] = useState(5);
```

### 1D. Replace the Activity Level UI section with Life Stage & Activity

Remove the existing activity chip grid and replace with:
```tsx
{/* Life Stage & Activity */}
<View style={styles.section}>
  <Text style={styles.label}>Life Stage & Activity *</Text>
  <View style={styles.activityGrid}>
    {LIFE_STAGE_ACTIVITY.map((key) => (
      <Pressable
        key={key}
        style={[styles.activityChip, activityLevel === key && styles.activityChipActive]}
        onPress={() => setActivityLevel(key)}
      >
        <Text style={[styles.activityText, activityLevel === key && styles.activityTextActive]}>
          {LIFE_STAGE_LABELS[key]}
        </Text>
      </Pressable>
    ))}
  </View>
</View>
```

### 1E. Add BCS picker — insert AFTER the Neutered switch, BEFORE Life Stage & Activity

```tsx
{/* Body Condition Score */}
<View style={styles.section}>
  <Text style={styles.label}>Body Condition Score (BCS) *</Text>
  <Text style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>
    1 = Very thin · 5 = Ideal · 9 = Obese
  </Text>
  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
    {[1,2,3,4,5,6,7,8,9].map((n) => (
      <Pressable
        key={n}
        onPress={() => setBcs(n)}
        style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: bcs === n ? BRAND
            : n <= 2 ? "#FEF9C3"
            : n <= 4 ? "#F0FDF4"
            : n === 5 ? "#DCFCE7"
            : n <= 7 ? "#FEF3C7"
            : "#FEE2E2",
          alignItems: "center", justifyContent: "center",
          borderWidth: bcs === n ? 0 : 1,
          borderColor: "#E2E8F0",
        }}
      >
        <Text style={{
          fontSize: 13, fontWeight: "700",
          color: bcs === n ? "#fff"
            : n <= 2 ? "#854D0E"
            : n === 5 ? "#166534"
            : n >= 8 ? "#991B1B"
            : "#64748B"
        }}>{n}</Text>
      </Pressable>
    ))}
  </View>
  <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>
    {bcs <= 2 ? "⚠️ Very thin — may need more calories"
      : bcs <= 4 ? "Below ideal weight"
      : bcs === 5 ? "✅ Ideal weight"
      : bcs <= 7 ? "Above ideal weight — reduce portions"
      : "⚠️ Obese — consult your vet"}
  </Text>
</View>
```

### 1F. Add bcs to petData in handleSave()
```ts
const petData: Record<string, any> = {
  // ...existing fields...
  bcs,
  activityLevel,  // now stores values like "adult_moderate", "senior", etc.
};
```

---

## PART 2: `app/pet/[id].tsx` — Fix DER formula + add BCS + update edit modal

### 2A. Add same constants at top of file (outside component)
```ts
const LIFE_STAGE_ACTIVITY = [
  "adult_low", "adult_moderate", "adult_high",
  "senior", "puppy", "pregnant", "nursing",
];

const LIFE_STAGE_LABELS: Record<string, string> = {
  adult_low:      "🏠 Adult — Low (indoor)",
  adult_moderate: "🚶 Adult — Moderate",
  adult_high:     "🏃 Adult — High (sport)",
  senior:         "🦴 Senior (7+ yrs)",
  puppy:          "🐾 Puppy / Kitten",
  pregnant:       "🤰 Pregnant",
  nursing:        "🍼 Nursing",
};
```

### 2B. Replace the DER formula (around line 1583–1587)

**Remove:**
```ts
const actMult: Record<string, number> = { sedentary: 1.2, indoor: 1.2, low: 1.2, moderate: 1.4, active: 1.4, "very active": 1.6, high: 1.6 };
const der = Math.round(rer * (actMult[pet.activityLevel?.toLowerCase()] || 1.4) * (pet.neutered ? 0.9 : 1.0));
```

**Replace with:**
```ts
// Life stage + activity combined factor — matches home.mypetdex.app/calorie-guide exactly
function getLifeStageFactor(activityLevel: string, neutered: boolean, weightKg: number): number {
  const key = activityLevel || "adult_moderate";
  if (key === "puppy") {
    return weightKg < 2 ? 3.0 : weightKg <= 10 ? 2.5 : 2.0;
  }
  if (key === "pregnant") return 2.0;
  if (key === "nursing") return 3.0;
  // [neutered factor, intact factor]
  const table: Record<string, [number, number]> = {
    adult_low:      [1.2, 1.4],
    adult_moderate: [1.4, 1.6],
    adult_high:     [1.6, 1.8],
    senior:         [1.2, 1.4],
    // Legacy values from old app versions — map to closest equivalent
    sedentary:      [1.2, 1.4],
    indoor:         [1.2, 1.4],
    moderate:       [1.4, 1.6],
    active:         [1.4, 1.6],
    "very active":  [1.6, 1.8],
  };
  const [nFactor, iFactor] = table[key] || [1.4, 1.6];
  return neutered ? nFactor : iFactor;
}

// BCS adjustment — matches home.mypetdex.app/calorie-guide exactly
const BCS_MULT: Record<number, number> = {
  1: 1.3, 2: 1.2, 3: 1.1, 4: 1.05,
  5: 1.0,
  6: 0.9, 7: 0.8, 8: 0.7, 9: 0.6,
};

const petBcs = pet.bcs ?? 5;
const lsFactor = getLifeStageFactor(pet.activityLevel, !!pet.neutered, weightKg);
const bcsFactor = BCS_MULT[petBcs] ?? 1.0;
const der = Math.round(rer * lsFactor * bcsFactor);
```

### 2C. Add BCS and editBcs state to edit modal
In the state declarations (find where `editNeutered`, `editActivity` are declared):
```ts
const [editBcs, setEditBcs] = useState(pet.bcs ?? 5);
```

In the openEdit function or wherever edit state is initialized:
```ts
setEditBcs(pet.bcs ?? 5);
```

In saveEdit(), add to updateDoc:
```ts
bcs: editBcs,
activityLevel: editActivity,  // already saved, no change
```

### 2D. Replace Activity Level section in Edit Modal
Find the activity chip grid in the edit modal and replace with:
```tsx
<Text style={styles.modalLabel}>Life Stage & Activity</Text>
<View style={styles.activityGrid}>
  {LIFE_STAGE_ACTIVITY.map((key) => (
    <Pressable
      key={key}
      style={[styles.activityChip, editActivity === key && styles.activityChipActive]}
      onPress={() => setEditActivity(key)}
    >
      <Text style={[styles.activityText, editActivity === key && styles.activityTextActive]}>
        {LIFE_STAGE_LABELS[key]}
      </Text>
    </Pressable>
  ))}
</View>
```

### 2E. Add BCS picker to Edit Modal
Insert AFTER the Neutered/Spayed switch, BEFORE the Life Stage & Activity section:
```tsx
<Text style={styles.modalLabel}>Body Condition Score (BCS)</Text>
<Text style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>1 = Very thin · 5 = Ideal · 9 = Obese</Text>
<View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
  {[1,2,3,4,5,6,7,8,9].map((n) => (
    <Pressable
      key={n}
      onPress={() => setEditBcs(n)}
      style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: editBcs === n ? BRAND : "#F1F5F9",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: editBcs === n ? "#fff" : "#64748B" }}>{n}</Text>
    </Pressable>
  ))}
</View>
<Text style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginBottom: 12 }}>
  {editBcs === 5 ? "✅ Ideal weight" : editBcs < 5 ? "Below ideal" : "Above ideal"}
</Text>
```

### 2F. Pass bcs to getRecipe call
In the fetch body:
```ts
body: JSON.stringify({
  petName: pet.name,
  species: pet.species || pet.type || "dog",
  breed: pet.breed,
  age: pet.age,
  weight: pet.weight,
  weightUnit: pet.weightUnit || "lbs",
  activityLevel: pet.activityLevel || "adult_moderate",
  neutered: pet.neutered || false,
  bcs: pet.bcs ?? 5,
  dailyCalories: der,
  ingredients: allSelected,
}),
```

---

## PART 3: Calorie display on recipe screen

In `RecipesTab`, find the calorie count display (where `der` is shown). Update to show the full formula for transparency:
```tsx
<Text style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 4 }}>
  RER {rer} kcal × {(lsFactor * bcsFactor).toFixed(2)} factor = <Text style={{ fontWeight: "800", color: BRAND }}>{der} kcal/day</Text>
</Text>
```

Note: `lsFactor` and `bcsFactor` need to be accessible here — compute them outside the function or pass as props.

---

## What NOT to change
- Do not touch Cloud Functions — `dailyCalories` is pre-computed in the app and passed to the function
- Do not change Firestore rules, auth, subscription, or payment logic
- Do not change any provider/shelter screens
- Do not change `app.json`, `firestore.rules`, or `storage.rules`
- Do not change the website files

---

## Verification — Formula should match website exactly

After applying, test these cases:

| Pet | Weight | Activity | Neutered | BCS | Expected kcal |
|-----|--------|----------|----------|-----|---------------|
| Adult dog | 25 lb (11.3 kg) | adult_moderate | Yes | 5 | ~605 kcal |
| Puppy | 15 lb (6.8 kg) | puppy | — | 5 | ~738 kcal |
| Senior dog | 50 lb (22.7 kg) | senior | Yes | 6 | ~786 kcal |

These match the exact examples on home.mypetdex.app/calorie-guide.

---

## After applying

**No new build required** — all changes are JavaScript-only (OTA eligible).

Commit:
```bash
git add app/pet/add.tsx app/pet/\[id\].tsx
git commit -m "feat: align recipe calorie formula with website — BCS 9-point scale, life stage+activity combined, exact website multipliers"
```
