# Full App Audit — Read Only, Do NOT Fix Anything

Your job is to audit the entire MyPetDex app and produce a report. Do NOT make any code changes. Read every file listed below and report findings only.

---

## What to audit

### 1. TypeScript / Build errors
Run: `npx tsc --noEmit --skipLibCheck`
Report every error with file name, line number, and error message.

### 2. Navigation & Routing (`app/_layout.tsx`)
- List every registered screen/tab
- Identify any screen referenced in navigation that doesn't exist as a file
- Identify any file in `app/` that is NOT registered in the layout

### 3. Firebase / Firestore
- Check `lib/firebase.ts` — is config complete? Any missing fields?
- Check `firestore.rules` — list any rule that could silently deny reads/writes the app depends on
- Check `firestore.indexes.json` — list all indexes defined

### 4. Authentication (`contexts/AuthContext.tsx`)
- Does sign-in with Apple work end-to-end in code?
- Does sign-in with Google work end-to-end in code?
- Is the user role (`owner`, `provider`, `pending_provider`) being read and acted on correctly?

### 5. Explore tab (`app/(tabs)/explore.tsx`)
- What is the exact Firestore query used to load providers?
- Does the search button pass current input values or rely on stale state?
- Are providers filtered by `approved === true`?
- Is there any code that could cause providers to not show?

### 6. Provider flow
- `app/provider/[id].tsx` — does `openChat()` create a conversation correctly? Does it use real provider name?
- `app/booking/new.tsx` — does the date calendar show? Does `checkConflict()` have try/catch? Are blocked dates excluded?
- `app/(tabs)/provider-services.tsx` — does the 28-day calendar exist? Is `blockDate` implemented?
- `app/(tabs)/provider-home.tsx` — is verification status shown correctly?

### 7. Messaging
- `hooks/useConversations.ts` — what is the exact query? Is `orderBy` removed? Is error logged?
- `app/(tabs)/messages.tsx` — does `ConvRow` resolve real names from Firestore for generic names?
- `app/messages/[id].tsx` — is `animation: "slide_from_right"` set? Is the input bar styled correctly?

### 8. Bookings
- `app/booking/new.tsx` — does saving a booking succeed without conflict check crashing it?
- `app/bookings/index.tsx` — does this file exist? Does it show Upcoming vs Past? Is cancel implemented?
- Is there a link to bookings from the Me tab or Home screen?

### 9. Pet owner tabs
- `app/(tabs)/index.tsx` (Home) — list all Quick Access items and what they navigate to
- `app/(tabs)/me.tsx` — list all menu items and what they navigate to
- `app/(tabs)/shop.tsx` — does Amazon/Chewy product loading work? Any hardcoded API calls?

### 10. Cloud Functions
- List all deployed functions visible in `functions/index.ts`
- Are any functions called from the app that don't exist in the deployed functions?

### 11. Hooks
- List all hooks in `hooks/` and whether they have proper error handling (try/catch or onError)
- Any hook that uses `orderBy` without a matching composite index?

### 12. Missing screens / dead links
- List any `router.push()` or `navigation.navigate()` call that points to a screen that doesn't exist

### 13. Console errors / warnings likely at runtime
- Look for any `console.error` or `throw` in catch blocks that would surface errors to users

---

## Report format

Produce a structured report with these sections:

```
## CRITICAL (app crashes or feature completely broken)
- [file] [line] [description]

## BROKEN (feature doesn't work but app doesn't crash)
- [file] [line] [description]

## WARNING (works but fragile or wrong)
- [file] [line] [description]

## WORKING (confirmed correct)
- [feature] — [why it's correct]

## MISSING (expected feature/file that doesn't exist)
- [feature] — [what's missing]
```

Be specific. Include file names and line numbers where possible. Do not suggest fixes — just report what you find.
