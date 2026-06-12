# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# iOS Build Rules — NEVER SKIP THESE

## Native module issues (e.g. expo-image-picker returning null)
The root cause is always a stale native binary. The ONLY reliable fix is:
```
npx expo run:ios --device
```
Do NOT use Xcode ⌘R as the first build after any native change. It will silently skip relinking native modules.

## expo-image-picker
- Always import at top level: `import * as ImagePicker from "expo-image-picker"`
- NEVER use lazy `require("expo-image-picker")` — it returns null on device
- NEVER call `requestCameraPermissionsAsync` or `requestMediaLibraryPermissionsAsync` — removed in v16+, permissions are automatic
- Use `mediaTypes: "images"` not `MediaTypeOptions.Images` (deprecated in v56)

## Expo CLI device install bug
`expo run:ios --device` fails with "TypeError: Cannot convert object to primitive value" due to a bug in LockdowndClient.js. The fix is already applied at:
`node_modules/expo/node_modules/@expo/cli/build/src/run/ios/appleDevice/client/LockdowndClient.js` line 115
Changed: `debug(\`startSession: ${pairRecord}\`)` → `debug(\`startSession: ${JSON.stringify(pairRecord)}\`)`
If node_modules is ever deleted and reinstalled, reapply this patch.

## Golden rules
1. `npx expo run:ios --device` for device testing (first build or after any native change)
2. `npx expo prebuild --platform ios --clean` if Xcode builds keep missing native modules
3. Never run `pod install` manually — let `expo run:ios` handle it
4. For TestFlight: after a working device build, use Xcode → Product → Archive

## Metro bundler
- Always run `npx expo start` from the project ROOT, not the `ios/` folder
- Device connects via local IP (192.168.1.x:8081) — phone and Mac must be on same WiFi
- If device shows old tunnel URL, tap ⚙️ gear icon in dev launcher and enter `http://192.168.1.7:8081`

## Admin dashboard
- URL: app.mypetdex.app/mypetdex-admin
- Requires TWO passwords: dashboard password + Firebase account password (mypetdexapp@gmail.com)
- Products added here appear live in the shopping tab (Firestore `shopProducts` collection)

## Website deploys
- Website repo: MyPetDex/mypetdex-website (separate from app repo)
- To update website: copy from `website/index.html` in main repo → push to mypetdex-website repo
- App repo: MyPetDex/mypetdex → deploys to app.mypetdex.app via Vercel
