# Switch AI Pet Assistant from Current API → Google Gemini Flash (Free)

## Why
Google Gemini Flash has a generous free tier (1,500 requests/day free, then $0.075/1M tokens).
This replaces the current paid AI API with a near-zero-cost alternative.

## File to edit
`functions/index.js` — find the `aiProxy` export

## Step 1: Install the Gemini SDK

In the `functions/` directory:
```bash
cd functions
npm install @google/generative-ai
```

## Step 2: Add the Gemini secret

At the top of `functions/index.js`, where other secrets are defined (look for `defineSecret`), add:
```js
const geminiKey = defineSecret("GEMINI_API_KEY");
```

## Step 3: Replace the aiProxy function

Find the existing `exports.aiProxy` function and replace it entirely with:

```js
exports.aiProxy = onRequest(
  { cors: true, secrets: [geminiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Auth check
    const uid = await verifyToken(req);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { message, petContext } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const systemPrompt = `You are MyPetDex AI, a helpful and friendly pet care assistant. 
You provide expert advice on pet health, nutrition, behavior, training, and general care.
Always be warm, encouraging, and practical. Keep responses concise (2-4 paragraphs max).
If asked about serious medical issues, always recommend consulting a veterinarian.
${petContext ? `\nThe user's pet context: ${JSON.stringify(petContext)}` : ""}`;

      const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
      const response = result.response.text();

      return res.status(200).json({ reply: response });
    } catch (err) {
      console.error("Gemini error:", err);
      return res.status(500).json({ error: "AI service error. Please try again." });
    }
  }
);
```

## Step 4: Set the secret in Firebase

After editing, run in terminal:
```bash
cd ~/mypetdex
firebase functions:secrets:set GEMINI_API_KEY
# Paste your key from aistudio.google.com when prompted
```

## Step 5: Deploy

```bash
firebase deploy --only functions:aiProxy
```

## Step 6: Test in the app

Open the Pet Assistant tab, ask a question, and verify it responds correctly.
The response style should be similar — Gemini Flash is very capable for pet Q&A.

## What NOT to change
- Do not change the `aiProxy` URL in `app/(tabs)/ai.tsx` — it stays the same
- Do not change any other Cloud Functions
- Do not touch Firestore rules, storage rules, or any app UI code
- Do not remove the old AI package yet (keep it in package.json in case of rollback)

## After deploying
The switch is live immediately — no new app build needed.
Delete the old AI API key from its dashboard to stop any accidental charges.
