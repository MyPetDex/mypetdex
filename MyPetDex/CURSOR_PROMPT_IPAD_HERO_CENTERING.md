# iPad: Center Hero Images on Explore Screen

## File to edit
`app/(tabs)/explore.tsx`

## Problem
On iPad, the hero images on the Services tab and Adopt tab appear too flat and the photo subject looks off-center. The image style uses a fixed height of 155px — on an iPhone that's a reasonable 2.4:1 aspect ratio, but on iPad the `contentWidth` is ~675px, making it an extreme 4.3:1 cinematic crop that cuts off the subject.

## The `isTablet` variable is already available
The component already calls `useResponsive()` at the top:
```tsx
const { isTablet, contentWidth } = useResponsive();
```
Use `isTablet` for the fixes below.

---

## Fix 1: Services hero image — make it taller and centered on iPad

Find this block (around line 397–409):
```tsx
{/* Hero */}
<View style={styles.servicesHeroCard}>
  <Image
    source={require("../../assets/images/hero-services.jpg")}
    style={styles.servicesHeroImage}
    resizeMode="cover"
  />
  <View style={styles.servicesHeroText}>
```

Change to:
```tsx
{/* Hero */}
<View style={styles.servicesHeroCard}>
  <Image
    source={require("../../assets/images/hero-services.jpg")}
    style={[styles.servicesHeroImage, isTablet && { height: 220 }]}
    resizeMode="cover"
  />
  <View style={styles.servicesHeroText}>
```

---

## Fix 2: Adopt hero image — make it taller and centered on iPad

Find this block (around line 529–541):
```tsx
{/* Hero */}
<View style={styles.adoptHeroCard}>
  <Image
    source={require("../../assets/images/hero-adopt.jpg")}
    style={styles.adoptHeroImage}
    resizeMode="cover"
  />
  <View style={styles.adoptHeroText}>
```

Change to:
```tsx
{/* Hero */}
<View style={styles.adoptHeroCard}>
  <Image
    source={require("../../assets/images/hero-adopt.jpg")}
    style={[styles.adoptHeroImage, isTablet && { height: 220 }]}
    resizeMode="cover"
  />
  <View style={styles.adoptHeroText}>
```

---

## Fix 3: Service type grid — 3 columns on iPad

The service type grid currently always shows 3 columns. On iPad it can look better with uniform spacing. Find the `serviceGrid` style in the StyleSheet and make sure the cards expand properly. No change needed to the JSX — just verify that `styles.serviceGrid` uses `flexWrap: "wrap"` and `flexDirection: "row"`.

If it does, no changes needed for the grid.

---

## What NOT to change
- Do not change any iPhone styling — only apply changes guarded by `isTablet`
- Do not change tab structure, navigation, search logic, Firebase queries, or any backend code
- Do not change `app.json`, `firestore.rules`, `storage.rules`, or Cloud Functions

---

## After applying
These are JS-only changes — no new build required.
Commit with:
```bash
git add app/(tabs)/explore.tsx
git commit -m "fix: taller hero images on iPad for better centering"
```

Then also commit the app.json orientation changes if not yet committed:
```bash
git add app.json
git commit -m "feat: enable iPad rotation - support all orientations"
eas build --platform ios --profile production
```
