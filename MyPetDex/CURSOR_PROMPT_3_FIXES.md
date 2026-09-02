# 3 Critical Fixes — Apply All, Do Not Skip Any

## Fix 1 — Messages list shows empty even though conversation exists

**File:** `app/provider/[id].tsx`
**Function:** `openChat()`

The conversation document uses `hiddenBy.{uid}: true` as a soft-delete flag. When a user previously deleted a conversation and then opens the chat again via the provider profile, `openChat()` re-creates the conversation with `setDoc + merge:true` but does NOT clear `hiddenBy`. The Messages inbox filters by `!c.hiddenBy?.[user.uid]`, so the conversation stays invisible in the list even though it works when accessed directly.

**Fix:** In `openChat()`, inside the `setDoc` call, add a dynamic key to reset `hiddenBy` for the current user. Change the `setDoc` call to:

```ts
const convData: Record<string, any> = {
  participants,
  participantNames: {
    [user.uid]: profile?.displayName || user?.displayName || "Pet Owner",
    [providerUid]: chatName,
  },
  participantRoles: {
    [user.uid]: "owner",
    [providerUid]: "provider",
  },
  lastMessage: "",
  lastMessageTime: serverTimestamp(),
  lastMessageSenderId: "",
  unreadCount: { [user.uid]: 0, [providerUid]: 0 },
};
convData[`hiddenBy.${user.uid}`] = false;

await setDoc(convRef, convData, { merge: true });
```

**Also fix** `app/(tabs)/_layout.tsx` — the badge count must filter out hidden conversations, otherwise a hidden conversation still shows a red badge even though the list is empty:

Find:
```ts
const totalUnread = conversations.reduce(
  (sum, c) => sum + (c.unreadCount?.[user?.uid || ""] || 0),
  0
);
```

Replace with:
```ts
const totalUnread = conversations
  .filter((c: any) => !c.hiddenBy?.[user?.uid || ""])
  .reduce((sum, c) => sum + (c.unreadCount?.[user?.uid || ""] || 0), 0);
```

---

## Fix 2 — Back button shows "(tabs)" on My Appointments screen

**File:** `app/_layout.tsx`

Find the `bookings/index` Stack.Screen:
```ts
<Stack.Screen
  name="bookings/index"
  options={{
    headerShown: true,
    title: "My Appointments",
    headerBackTitle: " ",
  }}
/>
```

Replace with:
```ts
<Stack.Screen
  name="bookings/index"
  options={{
    headerShown: true,
    title: "My Appointments",
    headerBackTitle: " ",
    headerBackTitleVisible: false,
  }}
/>
```

Also find the `bookings/[id]` Stack.Screen and add `headerBackTitleVisible: false` there too:
```ts
<Stack.Screen
  name="bookings/[id]"
  options={{
    headerShown: true,
    title: "Appointment",
    headerBackTitle: " ",
    headerBackTitleVisible: false,
  }}
/>
```

---

## Fix 3 — Back button shows "provider/[id]" on chat screen

**File:** `app/_layout.tsx`

Find the `messages/[id]` Stack.Screen options. Make sure it has BOTH `headerBackTitle: " "` AND `headerBackTitleVisible: false`. It must look exactly like this:

```ts
<Stack.Screen
  name="messages/[id]"
  options={({ route }: any) => ({
    animation: "fade",
    headerShown: true,
    title: route.params?.otherName || "Messages",
    headerBackTitle: " ",
    headerBackTitleVisible: false,
    headerStyle: { backgroundColor: "#fff" },
    headerTintColor: "#4486F4",
    headerTitleStyle: { fontWeight: "700", fontSize: 17 },
  })}
/>
```

If `headerBackTitleVisible: false` is already there, do not remove it. If it is missing, add it.

---

## After applying all 3 fixes

Run:
```
npx tsc --noEmit --skipLibCheck
```

Fix any TypeScript errors. Do not add or change anything else. Do not touch `firestore.rules`, the shopping screen, or any other file not mentioned above.
