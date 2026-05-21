# Branded OAuth pages on auth.mypetdex.app

Google/Apple sign-in opens `https://auth.mypetdex.app/__/auth/handler` in a popup. That page is **not** your React app — it is Firebase’s auth helper.

MyPetDex now ships a branded handler in `public/__/auth/` (copied into `build/__/auth/` on `npm run build`).

## Deploy (required once)

`auth.mypetdex.app` must be a **custom domain on the same Firebase Hosting site** as this project (`mypetdex-c4315`).

1. Firebase Console → Hosting → add custom domain `auth.mypetdex.app` (if not already linked).
2. From this repo:

```bash
npm run build
firebase deploy --only hosting
```

3. Hard-refresh and test Google/Apple sign-in. The popup should show the blue MyPetDex gradient instead of gray.

## Standalone auth hosting (optional)

If `auth.mypetdex.app` uses a separate Hosting site, deploy `auth-hosting/public` to that site:

```bash
firebase hosting:sites:create auth-mypetdex   # once
firebase target:apply hosting auth auth-mypetdex
firebase deploy --only hosting:auth
```

Use `firebase.auth.json` multi-site config if you split targets later.
