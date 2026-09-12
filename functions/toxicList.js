/**
 * Toxic ingredient blocklist — single source of truth.
 *
 * Scope: the ten substances named in the MyPetDex Terms of Service and on
 * home.mypetdex.app. Sourced from ASPCA Animal Poison Control published
 * guidance. Extend ONLY from the published ASPCA list, never from memory.
 *
 * Used by getRecipe (rejects submitted ingredients) and aiProxy (answers
 * toxicity questions deterministically instead of via the model).
 */

const TOXIC_INGREDIENTS = [
  { match: ["grape", "raisin", "sultana", "currant"], name: "Grapes and raisins",
    note: "Can cause acute kidney failure in dogs. No safe amount is established." },
  { match: ["onion", "shallot", "scallion", "chive", "leek"], name: "Onions and related allium vegetables",
    note: "Damage red blood cells and can cause anaemia in dogs and cats. Cooked, raw and powdered forms are all toxic." },
  { match: ["garlic"], name: "Garlic",
    note: "Same allium toxicity as onions, and more concentrated by weight." },
  { match: ["chocolate", "cocoa", "cacao"], name: "Chocolate",
    note: "Contains theobromine and caffeine. Darker chocolate is more dangerous." },
  { match: ["xylitol", "birch sugar"], name: "Xylitol",
    note: "Causes a rapid, dangerous drop in blood sugar in dogs, and can cause liver failure. Found in sugar-free gum, peanut butter and baked goods." },
  { match: ["macadamia"], name: "Macadamia nuts",
    note: "Cause weakness, tremors and hyperthermia in dogs." },
  { match: ["avocado"], name: "Avocado",
    note: "Contains persin. Also a choking and obstruction risk from the pit." },
  { match: ["alcohol", "ethanol", "beer", "wine", "liquor"], name: "Alcohol",
    note: "Dogs and cats are far more sensitive than people. Causes vomiting, incoordination and respiratory depression." },
  { match: ["caffeine", "coffee", "espresso", "energy drink"], name: "Caffeine",
    note: "Causes restlessness, rapid heart rate and tremors." },
];

const ASPCA_POISON_CONTROL = "ASPCA Animal Poison Control: (888) 426-4435";

function normalise(s) {
  return String(s || "").toLowerCase().replace(/[^a-z ]/g, " ");
}

/** Returns the matching toxic entry for a single ingredient, or null. */
function findToxic(text) {
  const t = normalise(text);
  return TOXIC_INGREDIENTS.find((e) => e.match.some((m) => t.includes(m))) || null;
}

/** Screens an array of ingredients. Returns array of matched entries. */
function screenIngredients(ingredients) {
  const hits = [];
  (ingredients || []).forEach((ing) => {
    const hit = findToxic(ing);
    if (hit && !hits.includes(hit)) hits.push(hit);
  });
  return hits;
}

module.exports = { TOXIC_INGREDIENTS, ASPCA_POISON_CONTROL, findToxic, screenIngredients };
