/**
 * MyPetDex - Verified Calorie Calculator
 * Based on: WSAVA Global Nutrition Guidelines + AAFCO 2023
 * Formula: RER = 70 × (body weight in kg) ^ 0.75
 */

/**
 * Calculate daily calorie needs for a pet
 * @param {Object} pet - Pet profile from Firestore
 * @returns {Object} - Calorie calculation with breakdown
 */
export function calculateDailyCalories(pet) {
  const {
    species,       // "dog" | "cat"
    weight_kg,     // number
    weight_lbs,    // number (if kg not provided)
    life_stage,    // "puppy"|"kitten"|"adult"|"senior"
    age_months,    // number
    neutered,      // boolean
    activity_level, // "low"|"moderate"|"high"|"very_high"
    health_goal,   // "maintain"|"lose"|"gain"
    pregnant,      // boolean
    lactating,     // boolean
  } = pet;

  // Convert lbs to kg if needed
  const weightKg = weight_kg || (weight_lbs / 2.205);

  if (!weightKg || weightKg <= 0) {
    throw new Error("Valid weight is required for calorie calculation");
  }

  // Step 1: Resting Energy Requirement (RER)
  // Source: WSAVA Global Nutrition Guidelines
  const rer = Math.round(70 * Math.pow(weightKg, 0.75));

  // Step 2: Determine life stage multiplier
  let multiplier;
  let multiplier_label;

  if (species === "dog") {
    if (life_stage === "puppy" || age_months < 12) {
      if (age_months < 4) {
        multiplier = 3.0;
        multiplier_label = "Puppy under 4 months";
      } else {
        multiplier = 2.0;
        multiplier_label = "Puppy 4+ months";
      }
    } else if (life_stage === "senior" || age_months >= 84) {
      multiplier = 1.4;
      multiplier_label = "Senior dog";
    } else if (pregnant) {
      multiplier = 1.8;
      multiplier_label = "Pregnant";
    } else if (lactating) {
      multiplier = 2.5;
      multiplier_label = "Lactating";
    } else if (health_goal === "lose") {
      multiplier = 1.0;
      multiplier_label = "Weight loss";
    } else if (health_goal === "gain") {
      multiplier = 1.7;
      multiplier_label = "Weight gain";
    } else if (neutered) {
      multiplier = 1.6;
      multiplier_label = "Neutered adult";
    } else {
      multiplier = 1.8;
      multiplier_label = "Intact adult";
    }

    // Activity level adjustment for adults
    if (!["puppy", "senior"].includes(life_stage)) {
      if (activity_level === "high") multiplier += 0.2;
      if (activity_level === "very_high") multiplier += 0.5;
      if (activity_level === "low") multiplier -= 0.2;
    }

  } else if (species === "cat") {
    if (life_stage === "kitten" || age_months < 12) {
      multiplier = 2.5;
      multiplier_label = "Kitten";
    } else if (life_stage === "senior" || age_months >= 120) {
      multiplier = 1.1;
      multiplier_label = "Senior cat";
    } else if (pregnant) {
      multiplier = 1.6;
      multiplier_label = "Pregnant";
    } else if (lactating) {
      multiplier = 2.0;
      multiplier_label = "Lactating";
    } else if (health_goal === "lose") {
      multiplier = 0.8;
      multiplier_label = "Weight loss";
    } else if (neutered) {
      multiplier = 1.2;
      multiplier_label = "Neutered adult";
    } else {
      multiplier = 1.4;
      multiplier_label = "Intact adult";
    }
  }

  const daily_calories = Math.round(rer * multiplier);

  // Step 3: Meals per day recommendation
  let meals_per_day;
  if (life_stage === "puppy" || life_stage === "kitten" || age_months < 6) {
    meals_per_day = 4;
  } else if (age_months < 12) {
    meals_per_day = 3;
  } else {
    meals_per_day = 2;
  }

  const calories_per_meal = Math.round(daily_calories / meals_per_day);

  return {
    daily_calories,
    rer,
    multiplier: Math.round(multiplier * 100) / 100,
    multiplier_label,
    meals_per_day,
    calories_per_meal,
    weight_kg: Math.round(weightKg * 100) / 100,
    formula: `RER = 70 × ${Math.round(weightKg * 100) / 100}kg^0.75 = ${rer} kcal`,
    sources: ["WSAVA Global Nutrition Guidelines", "AAFCO 2023"],
    disclaimer: "These are guidelines. Always consult your veterinarian, especially for pets with health conditions.",
  };
}

/**
 * Get the best matching recipe from Firestore based on pet profile + calorie target
 * Call this from your Cloud Function
 */
export function buildRecipePrompt(pet, calorieResult, recipes) {
  const matchingRecipes = recipes.filter(
    (r) => r.species === pet.species && r.life_stage === calorieResult.life_stage
  );

  return `
You are PetDex AI, a pet nutrition assistant for MyPetDex.

Pet Profile:
- Name: ${pet.name}
- Species: ${pet.species}
- Breed: ${pet.breed}
- Age: ${pet.age_months} months
- Weight: ${calorieResult.weight_kg} kg
- Life Stage: ${calorieResult.multiplier_label}
- Daily Calorie Target: ${calorieResult.daily_calories} kcal (${calorieResult.meals_per_day} meals/day)
- Calorie Formula: ${calorieResult.formula}

Available Verified Recipes (AAFCO/USDA sourced):
${JSON.stringify(matchingRecipes, null, 2)}

Instructions:
1. Select the most appropriate recipe from the list above based on the pet's profile
2. Adjust portion sizes to match the daily calorie target of ${calorieResult.daily_calories} kcal
3. Present the recipe in a friendly, clear format
4. Include a portion size guide scaled to this specific pet's weight
5. Note any breed-specific considerations if relevant
6. Always end with: "Recipes are based on AAFCO nutritional standards and USDA ingredient data. Consult your veterinarian before making significant diet changes."

Do NOT invent new ingredients or create recipes not in the provided list.
`;
}
