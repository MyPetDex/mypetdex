# MyPetDex — Pet Assistant: Smart Actions + Quick Start Panel

Two changes across two files:
1. **`app/(tabs)/ai.tsx`** — fill empty space + smart action detection in chat
2. **`app/pet/[id].tsx`** — support `?tab=` deep-link param so AI can open the right tab

---

## FILE 1: `app/(tabs)/ai.tsx`

### Step 1 — Add types and constants near the top (after BRAND/AI_PROXY_URL)

```ts
type SmartAction = {
  icon: "shield-checkmark-outline" | "medical-outline" | "calendar-outline" | "notifications-outline";
  label: string;
  tab: string;
  color: string;
};

type Message = { role: "user" | "assistant"; text: string; action?: SmartAction };

const GENERAL_SUGGESTIONS = [
  "How often should I visit the vet?",
  "Signs my pet is in pain?",
  "Best foods to avoid giving pets?",
  "How do I know if my pet is overweight?",
  "How much exercise does my pet need?",
];

function detectSmartAction(text: string): SmartAction | null {
  const t = text.toLowerCase();
  if (/vaccin|booster|rabies|distemper|bordetella|parvo|shot/.test(t))
    return { icon: "shield-checkmark-outline", label: "Save vaccine record", tab: "Records", color: "#10b981" };
  if (/medic|medicine|dose|pill|tablet|prescription|flea|heartworm|deworm/.test(t))
    return { icon: "medical-outline", label: "Log medication", tab: "Meds", color: "#ef4444" };
  if (/vet visit|clinic|appointment|check.?up|annual exam|doctor visit/.test(t))
    return { icon: "calendar-outline", label: "Log vet visit", tab: "Records", color: "#4C6EF5" };
  if (/remind|schedule|don.?t forget|upcoming|next visit|next appointment/.test(t))
    return { icon: "notifications-outline", label: "Set reminder", tab: "Reminders", color: "#f59e0b" };
  return null;
}
```

> **Note:** The `type Message` line above replaces the existing `type Message = { role: "user" | "assistant"; text: string };` — update it in place.

---

### Step 2 — Attach smart action after AI response

Inside `sendMessage`, find where the reply is added to messages:

```ts
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
```

Replace with:

```ts
      const smartAction = detectSmartAction(reply);
      setMessages((prev) => [...prev, { role: "assistant", text: reply, action: smartAction ?? undefined }]);
```

---

### Step 3 — Render smart action cards in the chat

Inside the messages `ScrollView`, find where messages are rendered:

```tsx
        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}>
            {msg.role === "assistant" && (
              <View style={styles.aiLabelRow}>
                <Ionicons name="paw-outline" size={11} color={BRAND} />
                <Text style={styles.aiLabel}>MyPetDex Assistant</Text>
              </View>
            )}
            <Text style={[styles.bubbleText, msg.role === "user" && styles.userText]}>
              {msg.role === "assistant" ? cleanMarkdown(msg.text) : msg.text}
            </Text>
          </View>
        ))}
```

Replace with:

```tsx
        {messages.map((msg, i) => (
          <View key={i} style={{ gap: 8 }}>
            <View style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}>
              {msg.role === "assistant" && (
                <View style={styles.aiLabelRow}>
                  <Ionicons name="paw-outline" size={11} color={BRAND} />
                  <Text style={styles.aiLabel}>MyPetDex Assistant</Text>
                </View>
              )}
              <Text style={[styles.bubbleText, msg.role === "user" && styles.userText]}>
                {msg.role === "assistant" ? cleanMarkdown(msg.text) : msg.text}
              </Text>
            </View>

            {msg.role === "assistant" && msg.action && selectedPet && (
              <Pressable
                style={styles.smartCard}
                onPress={() =>
                  router.push({
                    pathname: `/pet/${selectedPet.id}` as any,
                    params: { tab: msg.action!.tab },
                  })
                }
              >
                <View style={[styles.smartIcon, { backgroundColor: msg.action.color + "18" }]}>
                  <Ionicons name={msg.action.icon} size={18} color={msg.action.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smartLabel}>Smart action detected</Text>
                  <Text style={styles.smartAction}>{msg.action.label} for {selectedPet.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#aaa" />
              </Pressable>
            )}
          </View>
        ))}
```

---

### Step 4 — Replace the showPicker block

**Find:**
```tsx
      {showPicker ? (
        <View style={styles.pickerSection}>
          {pets.map((pet) => (
            <Pressable key={pet.id} style={styles.petPickerBtn} onPress={() => selectPet(pet)}>
              <Ionicons name="paw-outline" size={28} color={BRAND} />
              <Text style={styles.petPickerName}>{pet.name || "Pet"}</Text>
              <Text style={styles.petPickerMeta}>{petBreedLabel(pet)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
```

**Replace with:**
```tsx
      {showPicker ? (
        <View style={styles.pickerWrapper}>

          <Text style={styles.pickerSectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <Pressable style={styles.quickCard}
              onPress={() => router.push({ pathname: `/pet/${pets[0]?.id}` as any, params: { tab: "Reminders" } })}>
              <View style={[styles.quickIcon, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="calendar-outline" size={22} color={BRAND} />
              </View>
              <Text style={styles.quickCardTitle}>Vet Reminder</Text>
              <Text style={styles.quickCardSub}>Schedule & track visits</Text>
            </Pressable>
            <Pressable style={styles.quickCard}
              onPress={() => router.push({ pathname: `/pet/${pets[0]?.id}` as any, params: { tab: "Meds" } })}>
              <View style={[styles.quickIcon, { backgroundColor: "#FFF0F6" }]}>
                <Ionicons name="medical-outline" size={22} color="#E91E8C" />
              </View>
              <Text style={styles.quickCardTitle}>Log Medication</Text>
              <Text style={styles.quickCardSub}>Track doses & refills</Text>
            </Pressable>
            <Pressable style={styles.quickCard}
              onPress={() => sendMessage("Give me 5 important general pet health tips every owner should know.")}>
              <View style={[styles.quickIcon, { backgroundColor: "#F0FFF4" }]}>
                <Ionicons name="heart-outline" size={22} color="#10b981" />
              </View>
              <Text style={styles.quickCardTitle}>Health Tips</Text>
              <Text style={styles.quickCardSub}>Expert care advice</Text>
            </Pressable>
            <Pressable style={styles.quickCard}
              onPress={() => sendMessage("What are the best and worst foods for dogs and cats?")}>
              <View style={[styles.quickIcon, { backgroundColor: "#FFF8E1" }]}>
                <Ionicons name="nutrition-outline" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.quickCardTitle}>Nutrition Guide</Text>
              <Text style={styles.quickCardSub}>Foods to give & avoid</Text>
            </Pressable>
          </View>

          <Text style={styles.pickerSectionTitle}>Suggested Questions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.generalChipsRow}>
            {GENERAL_SUGGESTIONS.map((q, i) => (
              <Pressable key={i} style={styles.generalChip} onPress={() => sendMessage(q)}>
                <Text style={styles.generalChipText}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.pickerSectionTitle}>Select your pet</Text>
          <View style={styles.pickerSection}>
            {pets.map((pet) => (
              <Pressable key={pet.id} style={styles.petPickerBtn} onPress={() => selectPet(pet)}>
                <Ionicons name="paw-outline" size={28} color={BRAND} />
                <Text style={styles.petPickerName}>{pet.name || "Pet"}</Text>
                <Text style={styles.petPickerMeta}>{petBreedLabel(pet)}</Text>
              </Pressable>
            ))}
          </View>

        </View>
      ) : null}
```

---

### Step 5 — Add new styles to StyleSheet

```ts
  // Smart action card
  smartCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#eee",
    alignSelf: "flex-start",
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  smartIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smartLabel: { fontSize: 11, color: "#aaa", fontWeight: "600", marginBottom: 2 },
  smartAction: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },

  // Quick start panel
  pickerWrapper: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  pickerSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  quickCardTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  quickCardSub: { fontSize: 12, color: "#888", lineHeight: 16 },
  generalChipsRow: { gap: 8, paddingVertical: 2 },
  generalChip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#eee",
  },
  generalChipText: { fontSize: 13, color: "#444", fontWeight: "500" },
```

---

## FILE 2: `app/pet/[id].tsx`

### Step 1 — Read the `tab` param and use it as the initial tab

**Find:**
```ts
  const { id } = useLocalSearchParams<{ id: string }>();
```

**Replace with:**
```ts
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
```

**Find:**
```ts
  const [activeTab, setActiveTab] = useState("Records");
```

**Replace with:**
```ts
  const validTabs = ["Records", "Reminders", "Meds", "Calories", "Recipes"];
  const [activeTab, setActiveTab] = useState(
    initialTab && validTabs.includes(initialTab) ? initialTab : "Records"
  );
```

---

## After Applying Both Files

```bash
npx tsc --noEmit --skipLibCheck   # must be 0 errors
git add -A
git commit -m "Pet Assistant: smart action detection + quick actions panel + tab deep-link"
eas update --channel production --message "Pet Assistant: smart records, vet reminders, quick actions"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
- Do not change `sendMessage()` fetch logic or the AI proxy URL
