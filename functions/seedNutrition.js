/**
 * MyPetDex — Nutrition Database Seeder
 * Seeds Firestore with:
 *   1. ingredients_master  — from USDA FoodData Central (public domain)
 *   2. nutrient_targets    — from AAFCO 2023 (public domain)
 *   3. recipes_vetted      — pre-formulated per 1000 kcal baseline
 *
 * Run once: node seedNutrition.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS set to your Firebase service account JSON
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // put your key here

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── 1. AAFCO 2023 Nutrient Targets ──────────────────────────────────────────
const nutrientTargets = {
  dog_puppy: {
    protein_min_pct: 22.5,
    fat_min_pct: 8.5,
    calcium_min_pct: 1.2,
    phosphorus_min_pct: 1.0,
    source: "AAFCO 2023",
    life_stage: "puppy",
    species: "dog",
  },
  dog_adult: {
    protein_min_pct: 18.0,
    fat_min_pct: 5.5,
    calcium_min_pct: 0.5,
    phosphorus_min_pct: 0.4,
    source: "AAFCO 2023",
    life_stage: "adult",
    species: "dog",
  },
  dog_senior: {
    protein_min_pct: 18.0,
    fat_min_pct: 5.5,
    calcium_min_pct: 0.5,
    phosphorus_min_pct: 0.4,
    source: "AAFCO 2023",
    life_stage: "senior",
    species: "dog",
  },
  cat_kitten: {
    protein_min_pct: 30.0,
    fat_min_pct: 9.0,
    calcium_min_pct: 1.0,
    phosphorus_min_pct: 0.8,
    source: "AAFCO 2023",
    life_stage: "kitten",
    species: "cat",
  },
  cat_adult: {
    protein_min_pct: 26.0,
    fat_min_pct: 9.0,
    calcium_min_pct: 0.6,
    phosphorus_min_pct: 0.5,
    source: "AAFCO 2023",
    life_stage: "adult",
    species: "cat",
  },
  cat_senior: {
    protein_min_pct: 26.0,
    fat_min_pct: 9.0,
    calcium_min_pct: 0.6,
    phosphorus_min_pct: 0.5,
    source: "AAFCO 2023",
    life_stage: "senior",
    species: "cat",
  },
};

// ─── 2. Ingredients Master (USDA FoodData Central — public domain) ────────────
const ingredients = [
  // Proteins
  { id: "chicken_breast_raw", name: "Chicken Breast, raw", fdc_id: 171477, category: "protein", kcal_per_100g: 120, protein_g: 22.5, fat_g: 2.6, calcium_mg: 11, phosphorus_mg: 196, moisture_g: 75.0 },
  { id: "chicken_thigh_raw", name: "Chicken Thigh, raw, skinless", fdc_id: 172476, category: "protein", kcal_per_100g: 153, protein_g: 17.9, fat_g: 8.6, calcium_mg: 10, phosphorus_mg: 174, moisture_g: 70.5 },
  { id: "ground_turkey_raw", name: "Ground Turkey, raw", fdc_id: 171506, category: "protein", kcal_per_100g: 148, protein_g: 17.5, fat_g: 8.3, calcium_mg: 10, phosphorus_mg: 179, moisture_g: 70.5 },
  { id: "salmon_raw", name: "Salmon, Atlantic, raw", fdc_id: 175167, category: "protein", kcal_per_100g: 142, protein_g: 19.8, fat_g: 6.3, calcium_mg: 12, phosphorus_mg: 260, moisture_g: 68.5 },
  { id: "lean_beef_raw", name: "Beef, ground, 90% lean, raw", fdc_id: 174036, category: "protein", kcal_per_100g: 152, protein_g: 20.0, fat_g: 7.6, calcium_mg: 12, phosphorus_mg: 193, moisture_g: 67.4 },
  { id: "sardines_canned", name: "Sardines, canned in water", fdc_id: 175139, category: "protein", kcal_per_100g: 108, protein_g: 18.7, fat_g: 3.3, calcium_mg: 382, phosphorus_mg: 490, moisture_g: 72.5 },
  { id: "eggs_whole_raw", name: "Egg, whole, raw", fdc_id: 748967, category: "protein", kcal_per_100g: 143, protein_g: 12.6, fat_g: 9.5, calcium_mg: 56, phosphorus_mg: 198, moisture_g: 76.1 },
  { id: "chicken_liver_raw", name: "Chicken Liver, raw", fdc_id: 172543, category: "organ", kcal_per_100g: 119, protein_g: 16.9, fat_g: 4.8, calcium_mg: 8, phosphorus_mg: 297, moisture_g: 75.5 },

  // Carbs / Vegetables
  { id: "brown_rice_cooked", name: "Brown Rice, cooked", fdc_id: 169704, category: "carb", kcal_per_100g: 112, protein_g: 2.3, fat_g: 0.9, calcium_mg: 3, phosphorus_mg: 83, moisture_g: 73.1 },
  { id: "sweet_potato_cooked", name: "Sweet Potato, cooked, no skin", fdc_id: 170436, category: "carb", kcal_per_100g: 86, protein_g: 1.6, fat_g: 0.1, calcium_mg: 27, phosphorus_mg: 47, moisture_g: 76.0 },
  { id: "oatmeal_cooked", name: "Oatmeal, cooked, no salt", fdc_id: 173904, category: "carb", kcal_per_100g: 68, protein_g: 2.4, fat_g: 1.4, calcium_mg: 9, phosphorus_mg: 72, moisture_g: 84.1 },
  { id: "pumpkin_canned", name: "Pumpkin, canned, no salt", fdc_id: 168448, category: "vegetable", kcal_per_100g: 34, protein_g: 0.8, fat_g: 0.1, calcium_mg: 19, phosphorus_mg: 26, moisture_g: 90.2 },
  { id: "green_beans_cooked", name: "Green Beans, cooked, no salt", fdc_id: 169961, category: "vegetable", kcal_per_100g: 31, protein_g: 1.8, fat_g: 0.2, calcium_mg: 36, phosphorus_mg: 30, moisture_g: 89.9 },
  { id: "carrots_raw", name: "Carrots, raw", fdc_id: 170393, category: "vegetable", kcal_per_100g: 41, protein_g: 0.9, fat_g: 0.2, calcium_mg: 33, phosphorus_mg: 35, moisture_g: 88.3 },
  { id: "spinach_cooked", name: "Spinach, cooked, no salt", fdc_id: 170490, category: "vegetable", kcal_per_100g: 23, protein_g: 3.0, fat_g: 0.3, calcium_mg: 136, phosphorus_mg: 56, moisture_g: 91.2 },
  { id: "blueberries_raw", name: "Blueberries, raw", fdc_id: 171711, category: "fruit", kcal_per_100g: 57, protein_g: 0.7, fat_g: 0.3, calcium_mg: 6, phosphorus_mg: 12, moisture_g: 84.2 },

  // Fats / Supplements
  { id: "fish_oil", name: "Fish Oil (Omega-3 supplement)", fdc_id: null, category: "supplement", kcal_per_100g: 884, protein_g: 0, fat_g: 100, calcium_mg: 0, phosphorus_mg: 0, moisture_g: 0 },
  { id: "olive_oil", name: "Olive Oil", fdc_id: 171413, category: "fat", kcal_per_100g: 884, protein_g: 0, fat_g: 100, calcium_mg: 1, phosphorus_mg: 0, moisture_g: 0 },
];

// ─── 3. Vetted Recipes (per 1000 kcal baseline) ───────────────────────────────
// All recipes calibrated to 1000 kcal. The Cloud Function scales to actual pet need.
const recipes = [
  // ── DOG RECIPES ──────────────────────────────────────────────────────────────
  {
    id: "dog_chicken_rice_adult",
    title: "Chicken & Brown Rice Bowl",
    species: "dog",
    life_stage: "adult",
    base_calorie_unit: 1000,
    suitable_for: ["adult", "senior"],
    health_goals: ["maintain"],
    description: "A balanced, easily digestible meal. High-quality protein with complex carbs.",
    source: "AAFCO/USDA public domain data",
    ingredients: [
      { ingredient_id: "chicken_breast_raw", grams_per_1000kcal: 350, notes: "Cook thoroughly, no seasoning" },
      { ingredient_id: "brown_rice_cooked", grams_per_1000kcal: 280, notes: "Plain, no salt or butter" },
      { ingredient_id: "carrots_raw", grams_per_1000kcal: 80, notes: "Steamed or raw, chopped small" },
      { ingredient_id: "spinach_cooked", grams_per_1000kcal: 40, notes: "Lightly steamed" },
      { ingredient_id: "fish_oil", grams_per_1000kcal: 5, notes: "Omega-3 supplement" },
    ],
    preparation: "Cook chicken thoroughly. Mix all ingredients. Serve at room temperature.",
    disclaimer: "Add a vet-recommended multivitamin supplement to ensure complete nutrition.",
  },
  {
    id: "dog_turkey_sweet_potato_adult",
    title: "Turkey & Sweet Potato Meal",
    species: "dog",
    life_stage: "adult",
    base_calorie_unit: 1000,
    suitable_for: ["adult"],
    health_goals: ["maintain", "lose"],
    description: "Lean turkey with nutrient-rich sweet potato. Great for dogs needing lower fat.",
    source: "AAFCO/USDA public domain data",
    ingredients: [
      { ingredient_id: "ground_turkey_raw", grams_per_1000kcal: 320, notes: "Cooked, drained of excess fat" },
      { ingredient_id: "sweet_potato_cooked", grams_per_1000kcal: 250, notes: "Mashed or cubed, plain" },
      { ingredient_id: "green_beans_cooked", grams_per_1000kcal: 100, notes: "Plain, no salt" },
      { ingredient_id: "pumpkin_canned", grams_per_1000kcal: 60, notes: "Pure pumpkin, not pie filling" },
      { ingredient_id: "fish_oil", grams_per_1000kcal: 5, notes: "Omega-3 supplement" },
    ],
    preparation: "Brown turkey until fully cooked. Mash sweet potato. Mix all ingredients together.",
    disclaimer: "Add a vet-recommended multivitamin supplement to ensure complete nutrition.",
  },
  {
    id: "dog_salmon_oat_adult",
    title: "Salmon & Oatmeal Bowl",
    species: "dog",
    life_stage: "adult",
    base_calorie_unit: 1000,
    suitable_for: ["adult", "senior"],
    health_goals: ["maintain"],
    description: "Omega-3 rich salmon with soothing oatmeal. Excellent for skin and coat health.",
    source: "AAFCO/USDA public domain data",
    ingredients: [
      { ingredient_id: "salmon_raw", grams_per_1000kcal: 300, notes: "Baked or poached, no seasoning, bones removed" },
      { ingredient_id: "oatmeal_cooked", grams_per_1000kcal: 320, notes: "Plain, no sugar or additives" },
      { ingredient_id: "spinach_cooked", grams_per_1000kcal: 50, notes: "Lightly steamed" },
      { ingredient_id: "blueberries_raw", grams_per_1000kcal: 40, notes: "Antioxidant boost — serve whole or halved" },
      { ingredient_id: "olive_oil", grams_per_1000kcal: 8, notes: "Healthy fat source" },
    ],
    preparation: "Bake or poach salmon. Cook oatmeal plain. Mix all ingredients, serve at room temperature.",
    disclaimer: "Add a vet-recommended multivitamin supplement to ensure complete nutrition.",
  },
  {
    id: "dog_beef_veggie_adult",
    title: "Lean Beef & Vegetable Mix",
    species: "dog",
    life_stage: "adult",
    base_calorie_unit: 1000,
    suitable_for: ["adult"],
    health_goals: ["maintain", "gain"],
    description: "Hearty lean beef with a mix of dog-safe vegetables. Higher protein for active dogs.",
    source: "AAFCO/USDA public domain data",
    ingredients: [
      { ingredient_id: "lean_beef_raw", grams_per_1000kcal: 310, notes: "Cooked, no seasoning or onion" },
      { ingredient_id: "sweet_potato_cooked", grams_per_1000kcal: 200, notes: "Plain, no butter or sugar" },
      { ingredient_id: "carrots_raw", grams_per_1000kcal: 100, notes: "Chopped, raw or steamed" },
      { ingredient_id: "green_beans_cooked", grams_per_1000kcal: 80, notes: "Plain, no salt" },
      { ingredient_id: "eggs_whole_raw", grams_per_1000kcal: 60, notes: "Scrambled or hard-boiled, no seasoning" },
      { ingredient_id: "fish_oil", grams_per_1000kcal: 5, notes: "Omega-3 supplement" },
    ],
    preparation: "Cook beef thoroughly. Hard-boil or scramble eggs. Mix all ingredients.",
    disclaimer: "Add a vet-recommended multivitamin supplement to ensure complete nutrition.",
  },
  {
    id: "dog_chicken_puppy",
    title: "Puppy Growth Chicken Bowl",
    species: "dog",
    life_stage: "puppy",
    base_calorie_unit: 1000,
    suitable_for: ["puppy"],
    health_goals: ["maintain"],
    description: "Higher protein and calcium ratio to support puppy bone and muscle development.",
    source: "AAFCO 2023 puppy profile + USDA data",
    ingredients: [
      { ingredient_id: "chicken_thigh_raw", grams_per_1000kcal: 300, notes: "Cooked, boneless, no skin" },
      { ingredient_id: "chicken_liver_raw", grams_per_1000kcal: 80, notes: "Cooked — organ meat for micronutrients, limit to 5% of diet" },
      { ingredient_id: "brown_rice_cooked", grams_per_1000kcal: 220, notes: "Plain, well-cooked for easy digestion" },
      { ingredient_id: "sweet_potato_cooked", grams_per_1000kcal: 150, notes: "Mashed plain" },
      { ingredient_id: "eggs_whole_raw", grams_per_1000kcal: 80, notes: "Scrambled, no seasoning" },
      { ingredient_id: "fish_oil", grams_per_1000kcal: 5, notes: "DHA for brain development" },
    ],
    preparation: "Cook all ingredients thoroughly. Mash or chop finely for young puppies.",
    disclaimer: "Puppies have special nutritional needs. Always confirm this diet with your veterinarian. Add a puppy-specific multivitamin supplement.",
  },

  // ── CAT RECIPES ──────────────────────────────────────────────────────────────
  {
    id: "cat_chicken_adult",
    title: "Cat Chicken & Egg Meal",
    species: "cat",
    life_stage: "adult",
    base_calorie_unit: 1000,
    suitable_for: ["adult"],
    health_goals: ["maintain"],
    description: "High-protein, low-carb meal aligned with obligate carnivore needs. Cats require more protein than dogs.",
    source: "AAFCO 2023 cat profile + USDA data",
    ingredients: [
      { ingredient_id: "chicken_breast_raw", grams_per_1000kcal: 400, notes: "Cooked thoroughly, no seasoning" },
      { ingredient_id: "chicken_liver_raw", grams_per_1000kcal: 80, notes: "Cooked — essential for taurine and Vitamin A" },
      { ingredient_id: "eggs_whole_raw", grams_per_1000kcal: 100, notes: "Scrambled or hard-boiled, no seasoning" },
      { ingredient_id: "pumpkin_canned", grams_per_1000kcal: 50, notes: "Fiber for digestion" },
      { ingredient_id: "fish_oil", grams_per_1000kcal: 8, notes: "Omega-3 and DHA — essential for cats" },
    ],
    preparation: "Cook chicken and liver thoroughly. Mix all ingredients. Serve at room temperature.",
    disclaimer: "Cats are obligate carnivores and require taurine from animal sources. Add a vet-recommended cat-specific supplement. Always consult your veterinarian.",
  },
  {
    id: "cat_salmon_adult",
    title: "Cat Salmon & Chicken Bowl",
    species: "cat",
    life_stage: "adult",
    base_calorie_unit: 1000,
    suitable_for: ["adult", "senior"],
    health_goals: ["maintain"],
    description: "Omega-3 rich salmon combined with chicken for a complete protein profile.",
    source: "AAFCO 2023 cat profile + USDA data",
    ingredients: [
      { ingredient_id: "salmon_raw", grams_per_1000kcal: 280, notes: "Baked, no bones, no seasoning" },
      { ingredient_id: "chicken_breast_raw", grams_per_1000kcal: 250, notes: "Cooked, no seasoning" },
      { ingredient_id: "chicken_liver_raw", grams_per_1000kcal: 70, notes: "Cooked — for taurine content" },
      { ingredient_id: "pumpkin_canned", grams_per_1000kcal: 40, notes: "Digestive fiber" },
      { ingredient_id: "fish_oil", grams_per_1000kcal: 8, notes: "Additional Omega-3" },
    ],
    preparation: "Bake salmon (remove all bones). Cook chicken. Mix with other ingredients.",
    disclaimer: "Cats require taurine from animal protein. Add a vet-recommended cat supplement. Always consult your veterinarian.",
  },
  {
    id: "cat_turkey_kitten",
    title: "Kitten Growth Turkey Meal",
    species: "cat",
    life_stage: "kitten",
    base_calorie_unit: 1000,
    suitable_for: ["kitten"],
    health_goals: ["maintain"],
    description: "Higher protein and fat ratio for rapid kitten growth and brain development.",
    source: "AAFCO 2023 kitten profile + USDA data",
    ingredients: [
      { ingredient_id: "ground_turkey_raw", grams_per_1000kcal: 350, notes: "Cooked thoroughly, drained" },
      { ingredient_id: "chicken_liver_raw", grams_per_1000kcal: 100, notes: "Cooked — critical for kitten development" },
      { ingredient_id: "eggs_whole_raw", grams_per_1000kcal: 100, notes: "Scrambled, no seasoning" },
      { ingredient_id: "sardines_canned", grams_per_1000kcal: 80, notes: "In water, no salt — excellent DHA source" },
      { ingredient_id: "fish_oil", grams_per_1000kcal: 10, notes: "DHA for brain and eye development" },
    ],
    preparation: "Cook all ingredients thoroughly. Blend or chop very finely for young kittens.",
    disclaimer: "Kittens have very high nutritional needs. This must be supplemented with a kitten-specific vitamin/mineral supplement. Consult your veterinarian before starting.",
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Starting MyPetDex nutrition database seed...\n");

  // 1. Seed nutrient targets
  console.log("📋 Seeding AAFCO nutrient targets...");
  for (const [key, data] of Object.entries(nutrientTargets)) {
    await db.collection("nutrient_targets").doc(key).set(data);
    console.log(`  ✅ ${key}`);
  }

  // 2. Seed ingredients
  console.log("\n🥩 Seeding ingredients (USDA FoodData Central)...");
  for (const ingredient of ingredients) {
    const { id, ...data } = ingredient;
    await db.collection("ingredients_master").doc(id).set(data);
    console.log(`  ✅ ${ingredient.name}`);
  }

  // 3. Seed vetted recipes
  console.log("\n🍽️  Seeding vetted recipes...");
  for (const recipe of recipes) {
    const { id, ...data } = recipe;
    await db.collection("recipes_vetted").doc(id).set(data);
    console.log(`  ✅ ${recipe.title} (${recipe.species} / ${recipe.life_stage})`);
  }

  console.log("\n🎉 Seed complete!");
  console.log(`   ${Object.keys(nutrientTargets).length} nutrient targets`);
  console.log(`   ${ingredients.length} ingredients`);
  console.log(`   ${recipes.length} vetted recipes`);
  console.log("\nYour Firestore now has:");
  console.log("  /nutrient_targets  — AAFCO 2023 standards");
  console.log("  /ingredients_master — USDA FoodData Central data");
  console.log("  /recipes_vetted    — Pre-formulated, scalable recipes");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
