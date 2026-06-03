"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRescueGroups = exports.askHealthAssistant = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sdk_1 = require("@anthropic-ai/sdk");
admin.initializeApp();
// ─── Claude AI Health Assistant ───────────────────────────────────────────────
// API key is stored as a Firebase secret — never in code or git.
// To set it: firebase functions:secrets:set ANTHROPIC_API_KEY
// Then enter your key when prompted. It's encrypted by Google Secret Manager.
exports.askHealthAssistant = functions
    .runWith({
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 60,
    memory: "256MB",
})
    .https.onCall(async (data, context) => {
    var _a, _b;
    // Must be authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
    }
    // Check user has Plus or Family plan
    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
    const plan = (_b = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.plan) !== null && _b !== void 0 ? _b : "free";
    if (plan === "free") {
        throw new functions.https.HttpsError("permission-denied", "AI Health Assistant requires a Plus or Family plan.");
    }
    const { messages, petContext } = data;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "messages is required.");
    }
    // Limit message history to last 20 to control costs
    const trimmedMessages = messages.slice(-20);
    const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = [
        "You are a friendly, knowledgeable pet health assistant for MyPetDex.",
        "You help pet owners understand their pets' health, symptoms, medications, and general care.",
        "Always recommend consulting a licensed veterinarian for diagnosis or treatment.",
        "Be warm, concise, and reassuring. Use simple language.",
        petContext ? `\nPet context: ${petContext}` : "",
    ].join(" ");
    const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: trimmedMessages,
    });
    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    return { reply };
});
// ─── RescueGroups Search ──────────────────────────────────────────────────────
// To set key: firebase functions:secrets:set RESCUEGROUPS_API_KEY
exports.searchRescueGroups = functions
    .runWith({
    secrets: ["RESCUEGROUPS_API_KEY"],
    timeoutSeconds: 30,
    memory: "256MB",
})
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
    }
    const { query, species, location, limit = 20 } = data;
    const apiKey = process.env.RESCUEGROUPS_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError("internal", "RescueGroups not configured.");
    }
    const fetch = (await Promise.resolve().then(() => require("node-fetch"))).default;
    const searchBody = {
        apikey: apiKey,
        objectType: "animals",
        objectAction: "publicSearch",
        search: {
            resultStart: 0,
            resultLimit: Math.min(limit, 50),
            resultSort: "animalID",
            resultOrder: "desc",
            filters: [
                ...(species ? [{ fieldName: "animalSpecies", operation: "equals", criteria: species }] : []),
                ...(location ? [{ fieldName: "animalLocationDistance", operation: "radius", criteria: "50", subCriteria: location }] : []),
                ...(query ? [{ fieldName: "animalName", operation: "contains", criteria: query }] : []),
                { fieldName: "animalStatus", operation: "equals", criteria: "Available" },
            ],
            fields: [
                "animalID", "animalName", "animalSpecies", "animalBreed",
                "animalAge", "animalSex", "animalDescription",
                "animalPictures", "animalOrgID", "animalLocationCitystate",
            ],
        },
    };
    const res = await fetch("https://api.rescuegroups.org/http/v2.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchBody),
    });
    if (!res.ok) {
        throw new functions.https.HttpsError("internal", "RescueGroups API error.");
    }
    const json = await res.json();
    return { data: (_a = json.data) !== null && _a !== void 0 ? _a : {}, found: (_b = json.found) !== null && _b !== void 0 ? _b : 0 };
});
//# sourceMappingURL=index.js.map