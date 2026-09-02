# Switch getRecipe Cloud Function from Anthropic → Gemini Flash

## File to edit
`functions/index.js` — find the `getRecipe` export

## Context
`aiProxy` was already switched to Gemini Flash. `GEMINI_API_KEY` secret is already defined at the top of the file. `@google/generative-ai` is already installed. This prompt just switches `getRecipe` to use the same pattern.

## What to do

Find `exports.getRecipe` in `functions/index.js`.

Inside the function, find where it calls Anthropic (look for `Anthropic`, `anthropic.messages.create`, or `client.messages.create`) and replace that entire AI call block with Gemini Flash.

### Replace the Anthropic call with:

```js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(geminiKey.value());
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const result = await model.generateContent(prompt); // use whatever prompt variable is already built
const text = result.response.text();
```

Then use `text` wherever the function was using the Anthropic response text.

## Return format
Do NOT change the return format of `getRecipe` — whatever JSON structure it currently returns to the app must stay identical. Only the AI call changes.

## After editing, update the function signature to include geminiKey secret
Find the `onRequest` or `onCall` call for `getRecipe` and make sure `geminiKey` is in the secrets array:
```js
exports.getRecipe = onRequest(
  { cors: true, secrets: [geminiKey] }, // add geminiKey if not already there, remove anthropicKey if present
  async (req, res) => {
```

## Remove Anthropic dependency
After switching both `aiProxy` and `getRecipe`, check if any other function still uses the Anthropic secret. If nothing else uses it:
- Remove `const anthropicKey = defineSecret("ANTHROPIC_API_KEY")` from the top (or comment it out)
- Remove it from any function's secrets array

If other functions still use it, leave it alone.

## Deploy
```bash
cd ~/mypetdex
firebase deploy --only functions:getRecipe
```

## Test
In the app, go to Pet Assistant → generate a recipe for one of your pets. Confirm it returns a valid recipe with ingredients and instructions.

## What NOT to change
- Do not change `aiProxy` — already switched
- Do not change any other Cloud Functions
- Do not touch any app code, Firestore rules, or storage rules
- Do not change the recipe response format the app expects
