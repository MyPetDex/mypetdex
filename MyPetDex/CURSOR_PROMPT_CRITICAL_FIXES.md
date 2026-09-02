# Critical Fixes — Explore Permissions + Chat + Provider Name + Chat UI

## Context / What Broke and Why

### FIX 1 (CRITICAL): `app/(tabs)/explore.tsx` — Revert role query

The previous change to `where("role", "in", ["provider", "pending_provider"])` caused a
Firestore permissions error on the ENTIRE query because the security rules do not allow
regular users to read `pending_provider` documents. One forbidden doc type = whole query
rejected = zero providers/shelters shown to anyone.

The web admin Verify button now correctly sets `role: "provider"` + `approved: true` when
approving, so the original `role == "provider"` query is correct.

**Find:**
```ts
const usersQ = query(
  collection(webDb, "users"),
  where("role", "in", ["provider", "pending_provider"]),
  where("state", "==", stateFilter),
  limit(200),
);
```

**Replace with:**
```ts
const usersQ = query(
  collection(webDb, "users"),
  where("role", "==", "provider"),
  where("state", "==", stateFilter),
  limit(200),
);
```

Keep the existing filter line unchanged:
```ts
localResults = localResults.filter((p) => p.approved === true);
```

This is correct — it blocks any provider whose `approved` field isn't `true` yet.

---

## FIX 2 (CRITICAL): `hooks/useConversations.ts` — Fix missing Firestore index

The query:
```ts
where("participants", "array-contains", user.uid),
orderBy("lastMessageTime", "desc")
```
requires a composite index on `conversations`: `participants` (Array) + `lastMessageTime` (Desc).
If this index doesn't exist, `onSnapshot` fails silently → providers (and owners) see no conversations.

### Option A — Create the index (preferred):
In `firestore.indexes.json`, add:
```json
{
  "collectionGroup": "conversations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
    { "fieldPath": "lastMessageTime", "order": "DESCENDING" }
  ]
}
```
Then deploy: `firebase deploy --only firestore:indexes`

### Option B — Remove orderBy, sort in JS (fallback if index deploy fails):
```ts
const q = query(
  collection(db, "conversations"),
  where("participants", "array-contains", user.uid)
  // No orderBy — sort manually below
);
const unsub = onSnapshot(q, (snap) => {
  const convs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.lastMessageTime?.toMillis?.() || 0;
      const tb = b.lastMessageTime?.toMillis?.() || 0;
      return tb - ta;
    });
  setConversations(convs);
  setLoading(false);
}, (err) => {
  console.error("useConversations error:", err);
  setLoading(false);
});
```

Use Option A first. If Firestore index creation fails or is pending, use Option B as a fallback.

---

## FIX 3: `app/booking/new.tsx` — Pass provider's real name into booking doc

When the booking is created, `providerName` comes from route params. If it was missing when
the booking was made, the doc stores "Provider". For future bookings, fetch the provider's
actual name from Firestore if the param is empty.

Find in `loadProviderAndPets()`:
```ts
if (providerId) {
  const provSnap = await getDoc(doc(webDb, "users", providerId));
  if (provSnap.exists()) {
    setProviderAvailability(provSnap.data().availability || defaultAvailability());
  }
```

Update to also save the provider's name:
```ts
if (providerId) {
  const provSnap = await getDoc(doc(webDb, "users", providerId));
  if (provSnap.exists()) {
    const provData = provSnap.data();
    setProviderAvailability(provData.availability || defaultAvailability());
    // Store real provider name if param was empty
    if (!providerName || providerName === "Provider") {
      setResolvedProviderName(provData.businessName || provData.displayName || providerName || "Provider");
    }
  }
```

Add state: `const [resolvedProviderName, setResolvedProviderName] = useState(providerName || "Provider");`

Replace all uses of `providerName || "Provider"` in the booking addDoc with `resolvedProviderName`.

---

## FIX 4: `app/messages/[id].tsx` — Chat screen UI improvements

The chat screen needs a better look: app logo/branding at top, distinct message input styling.

### 4A. Header — show provider/owner name with avatar, not just "Provider"

In the screen header, the `otherName` param should already contain the name from the conversation.
Make sure the header title uses it:
```ts
navigation.setOptions({
  title: otherName || "Messages",
  headerStyle: { backgroundColor: "#fff" },
  headerTintColor: "#4486F4",
  headerTitleStyle: { fontWeight: "700", fontSize: 17 },
});
```

### 4B. Message input bar — distinct styling

Find the bottom input container and update:
```tsx
{/* Input bar */}
<View style={{
  flexDirection: "row",
  alignItems: "flex-end",
  paddingHorizontal: 16,
  paddingVertical: 10,
  paddingBottom: 24,
  backgroundColor: "#fff",
  borderTopWidth: 1,
  borderTopColor: "#F1F5F9",
  gap: 10,
}}>
  <TextInput
    style={{
      flex: 1,
      backgroundColor: "#F4F6FB",
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: "#0F172A",
      maxHeight: 120,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    }}
    placeholder="Type a message..."
    placeholderTextColor="#94A3B8"
    value={text}
    onChangeText={setText}
    multiline
    returnKeyType="default"
  />
  <TouchableOpacity
    onPress={sendMessage}
    disabled={!text.trim()}
    style={{
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: text.trim() ? "#4486F4" : "#E2E8F0",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Ionicons name="send" size={18} color={text.trim() ? "#fff" : "#94A3B8"} />
  </TouchableOpacity>
</View>
```

### 4C. Message bubbles — cleaner look

Sent messages (current user) → right-aligned, blue bubble:
```tsx
{
  backgroundColor: isMine ? "#4486F4" : "#F4F6FB",
  borderRadius: 18,
  borderBottomRightRadius: isMine ? 4 : 18,
  borderBottomLeftRadius: isMine ? 18 : 4,
  paddingHorizontal: 14,
  paddingVertical: 10,
  maxWidth: "78%",
}
```

Text color: `{ color: isMine ? "#fff" : "#0F172A" }`

### 4D. Empty state

When no messages exist, show:
```tsx
<View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
  <View style={{
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  }}>
    <Ionicons name="chatbubbles-outline" size={34} color="#4486F4" />
  </View>
  <Text style={{ fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 6 }}>
    Start the conversation
  </Text>
  <Text style={{ fontSize: 14, color: "#94A3B8", textAlign: "center" }}>
    Say hello — {otherName || "the other person"} will be notified.
  </Text>
</View>
```

---

## FIX 5: Firestore rules — conversations read for list queries

The current read rule requires `resource.data.participants` to exist. For collection-group
queries this sometimes causes issues. Update the conversations rule to be more explicit:

```
match /conversations/{convId} {
  allow read: if isSignedIn() && (
    resource == null ||
    request.auth.uid in resource.data.participants
  );
  allow create: if isSignedIn() &&
    request.auth.uid in request.resource.data.participants;
  allow update: if isSignedIn() &&
    request.auth.uid in resource.data.participants;
  allow delete: if false;
}

match /conversations/{convId}/messages/{msgId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() &&
    request.resource.data.senderId == request.auth.uid;
  allow update, delete: if false;
}
```

Deploy: `firebase deploy --only firestore:rules`

---

## What NOT to change
- Do not change any pet, recipe, health, or shopping screens
- Do not change auth or subscription logic
- Do not change `app.json`, `eas.json`, or Cloud Functions

---

## Deploy order
1. Firestore rules → `firebase deploy --only firestore:rules`
2. Firestore indexes → `firebase deploy --only firestore:indexes`
3. App (OTA) → `eas update --channel production --message "fix explore permissions, chat index, provider name, chat UI"`

## Test checklist
- [ ] Providers and shelters appear in Explore again
- [ ] Provider Messages tab shows incoming conversations from pet owners
- [ ] Pet owner Messages tab shows conversations
- [ ] Chat opens, messages send and receive on both sides
- [ ] Booking card shows actual provider name (not "Provider")
- [ ] Chat screen has clean UI with blue send button, styled bubbles
