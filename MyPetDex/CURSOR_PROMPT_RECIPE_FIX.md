# MyPetDex — Recipe: Clean Nutrition Breakdown

The Cloud Function returns `nutritionBreakdown` with inline math like:
`Protein 37% (104g × 4 ÷ 1126 × 100), Fat 34% (43g × 9 ÷ 1126 × 100), Carbs 28%`

We want to display it cleanly without the parenthetical math:
`Protein 37%, Fat 34%, Carbs 28% — meets AAFCO adult maintenance minimums`

---

## File: `app/pet/[id].tsx`

### Step 1 — Add a helper function

Near the top of the `RecipesTab` component (before `generateRecipe`), add:

```ts
function cleanNutrition(text: string): string {
  // Strip parenthetical math like "(104g × 4 ÷ 1126 × 100)"
  return text.replace(/\s*\([^)]*×[^)]*\)/g, "");
}
```

### Step 2 — Fix the in-app nutrition display

**Find (around line 1771):**
```tsx
<Text style={styles.recipeSectionText}>{recipe.nutritionBreakdown}</Text>
```

**Replace with:**
```tsx
<Text style={styles.recipeSectionText}>{cleanNutrition(recipe.nutritionBreakdown || "")}</Text>
```

### Step 3 — Fix the PDF nutrition output

**Find (inside `shareRecipe`, around line 1678):**
```ts
  <div class="nutrition">${(recipe.nutritionBreakdown || "").replace(/\n/g, "<br/>")}</div>
```

**Replace with:**
```ts
  <div class="nutrition">${cleanNutrition(recipe.nutritionBreakdown || "").replace(/\n/g, "<br/>")}</div>
```

---

## After Applying

```bash
npx tsc --noEmit --skipLibCheck
git add -A
git commit -m 'Recipe: strip inline math from nutrition breakdown'
eas update --channel production --message "Recipe PDF: clean nutrition breakdown"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
