# MyPetDex — 3 Bug Fixes

## Fix 1 — Add "Change Password" screen with confirm field

The app currently only sends a Firebase reset email with no in-app new password screen. Add a proper Change Password screen inside the app.

### Where to add it
In `app/(tabs)/me.tsx` or `app/(tabs)/settings.tsx`, add a "Change Password" row in the settings menu that opens a modal or screen with three fields:
1. Current Password
2. New Password
3. Confirm New Password

### Logic
```ts
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

async function handleChangePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  if (newPassword.length < 8) {
    Alert.alert("Error", "Password must be at least 8 characters.");
    return;
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    Alert.alert("Error", 'Password must include at least one special character (e.g. @, #, !)');
    return;
  }
  if (newPassword !== confirmPassword) {
    Alert.alert("Error", "Passwords do not match.");
    return;
  }
  try {
    const user = auth.currentUser!;
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    Alert.alert("Success", "Your password has been updated.");
    // close modal
  } catch (e: any) {
    if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
      Alert.alert("Error", "Current password is incorrect.");
    } else {
      Alert.alert("Error", "Could not update password. Please try again.");
    }
  }
}
```

### Notes
- Only show this option for email/password users (not Google sign-in users). Check with `auth.currentUser?.providerData.some(p => p.providerId === "password")`.
- Hide it for Google sign-in users since they don't have a password.
- All three fields must use `secureTextEntry`.

---

## Fix 2 — Send Feedback: bypass failing Cloud Function, write to Firestore directly

### Problem
`callFunction("sendFeedback")` is failing with an unhandled error. The `sendFeedback` Cloud Function is either not deployed or broken.

### Fix in `app/(tabs)/settings.tsx` and `app/(tabs)/me.tsx`
Replace the Cloud Function call with a direct Firestore write:

```ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

async function handleSendFeedback() {
  if (!feedbackText.trim() || feedbackText.trim().length < 10) {
    Alert.alert("Too short", "Please write at least 10 characters.");
    return;
  }
  setFeedbackSending(true);
  try {
    await addDoc(collection(db, "feedback"), {
      message: feedbackText.trim(),
      subject: "General Feedback",
      uid: auth.currentUser?.uid ?? "anonymous",
      email: auth.currentUser?.email ?? "",
      createdAt: serverTimestamp(),
    });
    setFeedbackText("");
    setFeedbackVisible(false);
    Alert.alert("Thank you!", "Your feedback has been sent.");
  } catch (e) {
    Alert.alert("Error", "Could not send feedback. Please email help@mypetdex.app");
  } finally {
    setFeedbackSending(false);
  }
}
```

Apply this same fix to BOTH files that have `sendFeedback`:
- `app/(tabs)/settings.tsx`
- `app/(tabs)/me.tsx`

Remove the `callFunction` import if it's no longer used after this change.

---

## Fix 3 — Provider profile modal scrolls infinitely into white space

### Problem
In `app/(tabs)/provider-profile.tsx`, modals use:
```tsx
<KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
  <ScrollView style={s.modalContainer} contentContainerStyle={{ paddingBottom: 40 }}>
```

`flex: 1` inside a `Modal` makes the `KeyboardAvoidingView` try to fill the entire screen height. The inner `ScrollView` with `style={s.modalContainer}` also has `flex: 1` in its style. This combination causes unbounded scroll height — the user can scroll endlessly past the content into white space.

### Fix
1. Remove `flex: 1` from the `KeyboardAvoidingView` style and replace with `flexShrink: 1`:
```tsx
<KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
```

2. Update `s.modalContainer` style to remove `flex: 1` and instead use:
```ts
modalContainer: { flexGrow: 1, padding: 20, paddingTop: 24, backgroundColor: "#F5F8FF" },
```

3. Wrap the Modal content in a `<View style={{ flex: 1 }}>` at the top level inside the Modal so it properly constrains height.

Apply this fix to BOTH modals inside `provider-profile.tsx` (there are two `KeyboardAvoidingView` blocks at lines ~224 and ~274).

---

## After all fixes

1. `npx tsc --noEmit --skipLibCheck` → 0 errors
2. Test on device:
   - Change Password: wrong current password shows error, mismatched new passwords show error, success updates and closes modal
   - Send Feedback: submitting text writes to Firestore `feedback` collection, success alert shows
   - Provider profile: edit modal does not scroll past content
3. `git add -A && git commit -m "Fix change password, feedback Firestore, provider modal scroll"`
4. `eas update --channel production --message "Fix change password, feedback, provider scroll"`
