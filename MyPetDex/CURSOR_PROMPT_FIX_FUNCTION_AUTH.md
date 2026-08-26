# Fix: Add Auth to Unauthenticated Cloud Functions

## File to edit
`functions/index.js`

## Problem
Three `onRequest` Cloud Functions have no Firebase Auth verification, meaning any person on the internet can call them directly:

1. `sendVerifiedEmail` — no auth → anyone can spam emails via our Resend account
2. `createCheckoutSession` — no auth → anyone can create Stripe sessions attributed to any userId
3. `createPortalSession` — no auth + `userId` comes from req.body → anyone can get a Stripe billing portal URL for any user's account (lets them cancel other users' subscriptions)

The pattern to follow is already in the codebase — `aiProxy` and `getRecipe` both call `verifyToken(req)` correctly.

---

## Fix 1: `sendVerifiedEmail`

Find the function (search for `exports.sendVerifiedEmail`). Add token verification as the **first thing** inside the async handler, before any email is sent:

```js
exports.sendVerifiedEmail = onRequest(
  { cors: true, secrets: [resendKey] },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    // ADD THIS BLOCK:
    const uid = await verifyToken(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    // END ADD

    const { role, email, name, profile } = req.body;
    // ... rest of function unchanged
  }
);
```

---

## Fix 2: `createCheckoutSession`

Find the function (search for `exports.createCheckoutSession`). Add token verification and enforce that the authenticated user matches the `userId` in the body:

```js
exports.createCheckoutSession = onRequest({ secrets: [stripeSecretKey, resendKey], cors: true }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

  // ADD THIS BLOCK:
  const uid = await verifyToken(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  // END ADD

  const { priceId, userId, email, plan, billing } = req.body;
  if (!priceId || !userId || !email) { res.status(400).send("Missing required fields"); return; }

  // ADD THIS CHECK:
  if (userId !== uid) return res.status(403).json({ error: "Forbidden" });
  // END ADD

  // ... rest of function unchanged
});
```

---

## Fix 3: `createPortalSession`

Find the function (search for `exports.createPortalSession`). Add token verification and use the **token's uid** instead of the `userId` from the request body (never trust client-provided user IDs for privileged operations):

```js
exports.createPortalSession = onRequest({ secrets: [stripeSecretKey], cors: true }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

  // ADD THIS BLOCK:
  const uid = await verifyToken(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  // END ADD

  // REMOVE: const { userId } = req.body;
  // REPLACE with: use uid from the verified token
  try {
    const stripe = require("stripe")(stripeSecretKey.value());
    const userDoc = await db.collection("users").doc(uid).get();  // use uid, not userId from body
    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) { res.status(400).json({ error: "No subscription found" }); return; }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://app.mypetdex.app",
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: err.message });
  }
});
```

---

## After making the changes

Deploy only functions (not rules):
```bash
cd ~/mypetdex
firebase deploy --only functions
```

Then test in the app:
- Subscription upgrade flow (createCheckoutSession)
- Manage subscription / billing portal (createPortalSession)
- Sign up a new account and verify email (sendVerifiedEmail)

All three should still work normally for authenticated users.

## Do NOT touch
- `stripeWebhook` — already secured via Stripe signature verification
- `aiProxy` — already has verifyToken
- `getRecipe` — already has verifyToken
- `sendFeedback` — already has request.auth?.uid check
- Any `onCall` functions — Firebase SDK enforces auth automatically for those
