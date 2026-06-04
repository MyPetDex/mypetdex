/**
 * AI helpers — all Claude calls go through the Firebase `aiProxy` function.
 * The API key lives in Google Secret Manager, never in the app.
 *
 * aiProxy URL: https://aiproxy-lnlfhdpryq-uc.a.run.app
 */

const AI_PROXY_URL = "https://aiproxy-lnlfhdpryq-uc.a.run.app";
const RECIPE_PROXY_URL = "https://getrecipe-lnlfhdpryq-uc.a.run.app";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Send messages to PetDex AI (pet-only questions enforced server-side).
 * Returns the assistant reply text.
 */
export async function askPetDexAI(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const res = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: systemPrompt || "You are PetDex AI, a friendly and knowledgeable pet health assistant for MyPetDex. Help pet owners with health, nutrition, behavior, and care questions. Always recommend seeing a real vet for serious concerns. Keep responses concise and friendly.",
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `AI error ${res.status}`);
  }

  const data = await res.json();
  return data?.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
}

/**
 * Generate a recipe for a pet using the WSAVA/AAFCO formula + vetted database.
 * Claude selects and presents — does NOT invent recipes.
 */
export async function generatePetRecipe(pet: {
  name: string;
  species: string;
  breed?: string;
  age?: string | number;
  weight?: string | number;
  weightUnit?: string;
  activityLevel?: string;
  neutered?: boolean;
  healthGoal?: string;
}): Promise<{
  recipe: string;
  daily_calories: number;
  rer: number;
  multiplier: number;
  weight_kg: number;
  source: string;
}> {
  const weight = parseFloat(String(pet.weight || 0));
  const weightKg = (pet.weightUnit === "lbs" || !pet.weightUnit)
    ? weight * 0.453592
    : weight;

  const ageYears = parseFloat(String(pet.age || 2));
  const ageMonths = Math.round(ageYears * 12);

  const res = await fetch(RECIPE_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pet: {
        name: pet.name,
        species: pet.species?.toLowerCase() || "dog",
        breed: pet.breed || "Mixed",
        age_months: ageMonths,
        weight_kg: weightKg,
        neutered: pet.neutered ?? true,
        activity_level: pet.activityLevel?.toLowerCase() || "moderate",
        health_goal: pet.healthGoal || "maintain",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Recipe error ${res.status}`);
  }

  return res.json();
}
