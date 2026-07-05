# How to See Code Changes on Your iPhone

Two options depending on the situation.

---

## Option 1 — Instant (laptop must be on same WiFi as phone)

```bash
cd ~/mypetdex/MyPetDex
npx expo start
```

1. Terminal shows a QR code
2. Open your iPhone **Camera app** and point it at the QR code
3. Tap the notification that appears → app opens in the dev client with the latest code

This is the fastest way. Every time you save a file, the app hot-reloads automatically.

---

## Option 2 — OTA Update (phone only, no laptop needed after push)

```bash
cd ~/mypetdex/MyPetDex
eas update --channel development --message "describe what changed"
```

1. Wait for the upload to finish (~1–2 min)
2. On your iPhone: **force-quit the app** (swipe up from app switcher) → reopen it
3. If changes don't appear: force-quit and reopen **one more time**

Use this when you want to test on your phone without keeping the laptop open.

---

## Which to use?

| Situation | Use |
|-----------|-----|
| Actively coding, laptop nearby | Option 1 (npx expo start) |
| Sharing a build with yourself later | Option 2 (eas update) |
| Changes not appearing after eas update | Force-quit app **twice** |
