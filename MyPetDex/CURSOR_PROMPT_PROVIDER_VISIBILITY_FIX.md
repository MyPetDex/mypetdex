# Provider Visibility + Dashboard Badge Fix

## Root Cause

The explore.tsx query is:
```ts
where("role", "==", "provider")
```

The in-app admin approval (`admin-providers.tsx`) sets BOTH `role: "provider"` AND `approved: true`.
The **web admin** (home.mypetdex.app) "Verify" button may only set `approved: true` WITHOUT
changing the role from `pending_provider` to `provider`.

Result: a web-admin-approved provider has `role: "pending_provider"` + `approved: true`
→ the Firestore query never returns them → the `approved === true` filter never runs → invisible in Explore.

---

## FIX 1: `app/(tabs)/explore.tsx` — Broaden the provider query

### Find the users query (around line 280):
```ts
const usersQ = query(
  collection(webDb, "users"),
  where("role", "==", "provider"),
  where("state", "==", stateFilter),
  limit(200),
);
```

### Replace with:
```ts
const usersQ = query(
  collection(webDb, "users"),
  where("role", "in", ["provider", "pending_provider"]),
  where("state", "==", stateFilter),
  limit(200),
);
```

The existing `localResults.filter((p) => p.approved === true)` line stays as-is — it now correctly
filters out `pending_provider` users who haven't been approved yet.

---

## FIX 2: `app/(tabs)/provider-home.tsx` — Force-refresh on tab focus

The dashboard badge reads `profile?.approved` from state. If the provider opens the app for the
first time AFTER being approved, the `loadData()` getDoc should already return `approved: true`.
But if the tab was previously mounted with unapproved data and cached, the badge stays stale.

Add a focus listener to re-run `loadData()` when the provider navigates back to the Dashboard tab:

### Find the imports and add:
```ts
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
```

### Replace the existing loadData useEffect:
```ts
useEffect(() => {
  if (!user) { setLoading(false); return; }
  loadData();
}, [user]);
```

### With:
```ts
useEffect(() => {
  if (!user) { setLoading(false); return; }
  loadData();
}, [user]);

// Re-check approval status whenever this tab comes into focus
useFocusEffect(
  useCallback(() => {
    if (!user) return;
    // Silent refresh — don't show spinner, just update the badge
    getDoc(doc(webDb, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setProfile((prev: any) => ({ ...prev, ...snap.data() }));
      }
    }).catch(() => {});
  }, [user])
);
```

---

## FIX 3: Web admin (home.mypetdex.app) — Make Verify set role too

**IMPORTANT:** Open the website admin codebase and find the "Verify" button handler for providers.
It likely does something like:
```js
updateDoc(userRef, { approved: true });
```

Change it to match what `admin-providers.tsx` does:
```js
updateDoc(userRef, {
  role: "provider",
  approved: true,
  approvedAt: serverTimestamp(),
});
```

This ensures a provider approved via the web admin is visible in Explore immediately,
and the provider's app dashboard shows "Verified" correctly.

---

## Deploy after fixes

App changes are JS-only:
```bash
cd ~/mypetdex/MyPetDex
eas update --channel production --message "fix provider visibility and dashboard badge"
```

Web admin changes (if in a separate repo):
```bash
cd ~/mypetdex-website   # or wherever the website repo is
# deploy normally
```

## Test checklist
- [ ] Provider registers → NOT visible in Explore
- [ ] Admin approves via web admin Verify → provider IMMEDIATELY visible in Explore
- [ ] Admin approves via web admin Verify → provider dashboard badge changes to "Verified" without logging out
- [ ] Pet owner can find the provider and tap their card
