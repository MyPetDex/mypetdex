# Fix: Missing Indexes + Google Sign-In Deadlock + Messages Security Rule

Do NOT change any booking, calendar, chat UI, explore, or provider screens.
Only touch the three files described below. Run `npx tsc --noEmit --skipLibCheck` after changes.

---

## FIX 1: `firestore.indexes.json` — Add two missing composite indexes

Open `firestore.indexes.json`. Add these two entries to the `indexes` array:

```json
{
  "collectionGroup": "reviews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "published", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "savedRecipes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "uid", "order": "ASCENDING" },
    { "fieldPath": "petId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

Do not remove any existing indexes.

---

## FIX 2: `app/(auth)/sign-in.tsx` — Fix Google sign-in blank screen deadlock

### Problem
`signInWithGoogle()` in AuthContext is called when `request` from `useAuthRequest` may still be null.
When that happens, `loading` is set to `true` inside `handleGoogle` but never reset to `false`,
leaving the screen blank with no way for the user to retry.

### Fix
Find the `handleGoogle` function (or wherever `signInWithGoogle()` is called on button press).
Before calling it, check if the Google auth request is ready:

```ts
async function handleGoogle() {
  if (!request) {
    // Request not ready yet — don't set loading, just try promptAsync
    try {
      await promptAsync();
    } catch {
      Alert.alert("Not ready", "Google sign-in is loading. Please try again in a moment.");
    }
    return;
  }
  setLoading(true);
  try {
    await promptAsync();
  } catch (e: any) {
    setLoading(false);
    Alert.alert("Error", "Google sign-in failed. Please try again.");
  }
}
```

Also: in the `useEffect` that handles `response` from `promptAsync`, make sure `setLoading(false)` is called in ALL branches — success, error, and dismiss:

```ts
useEffect(() => {
  if (response?.type === "success") {
    const { id_token } = response.params;
    signInWithGoogle(id_token)
      .catch((e) => {
        console.error("Google sign-in error:", e);
        Alert.alert("Sign-in failed", "Please try again.");
      })
      .finally(() => setLoading(false));
  } else if (response?.type === "error" || response?.type === "dismiss") {
    setLoading(false);
  }
}, [response]);
```

Remove any `setLoading(false)` calls that are missing from error/dismiss paths.

---

## FIX 3: `firestore.rules` — Restrict messages subcollection to conversation participants

### Problem
Current rule:
```
match /conversations/{convId}/messages/{msgId} {
  allow read: if isSignedIn();
```
This allows ANY signed-in user to read messages from any conversation if they know the `convId`.

### Fix
Replace the messages subcollection read rule with a participant check:

```
match /conversations/{convId}/messages/{msgId} {
  allow read: if isSignedIn() &&
    request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
  allow create: if isSignedIn() &&
    request.resource.data.senderId == request.auth.uid;
  allow update, delete: if false;
}
```

This uses `get()` to check that the current user is a participant in the parent conversation before allowing message reads.

---

## What NOT to change
- Do not touch booking/new.tsx, explore.tsx, messages.tsx, provider-services.tsx
- Do not change any other Firestore rules
- Do not change any other indexes

---

## Deploy order (after Cursor applies fixes)
```bash
# 1. Deploy rules and indexes (no OTA needed — server-side only)
cd ~/mypetdex/MyPetDex
firebase deploy --only firestore:rules,firestore:indexes

# When prompted "Would you like to delete these indexes?" → type N
```

No OTA update needed — these are server-side changes only.
The indexes will take 5–10 minutes to build after deploy.

## Test checklist
- [ ] Google sign-in: if tapped before request is ready, shows message instead of blank screen
- [ ] Google sign-in: tapping again after the message works normally
- [ ] Provider profile: reviews load and display (may take up to 10 min for index to build)
- [ ] Pet profile: saved recipes load correctly
- [ ] Messages: users can still read their own conversation messages
- [ ] Messages security: a user cannot read a conversation they are not part of
