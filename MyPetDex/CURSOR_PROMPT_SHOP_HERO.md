# MyPetDex — Shop Tab Hero Banner

Replace the plain store toggle at the top of the Shop tab with a full-width
branded hero banner — blue brand color, floating pet decorations, "Shop 🐾"
title, and Amazon / Chewy tabs built into the bottom of the banner.

Only `app/(tabs)/shopping.tsx` changes.

---

## Step 1 — Replace the Store Toggle JSX

**Find this block** (the entire Store Toggle comment + View):
```tsx
      {/* Store Toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, shopTab === "amazon" && styles.toggleBtnAmazon]}
          onPress={() => setShopTab("amazon")}
        >
          <Ionicons name="cube-outline" size={16} color={shopTab === "amazon" ? "#fff" : "#666"} />
          <Text style={[styles.toggleText, shopTab === "amazon" && styles.toggleTextActive]}>Amazon</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, shopTab === "chewy" && styles.toggleBtnChewy]}
          onPress={() => setShopTab("chewy")}
        >
          <Ionicons name="cart-outline" size={16} color={shopTab === "chewy" ? "#fff" : "#666"} />
          <Text style={[styles.toggleText, shopTab === "chewy" && styles.toggleTextActive]}>Chewy</Text>
        </Pressable>
      </View>
```

**Replace with:**
```tsx
      {/* Shop Hero */}
      <View style={styles.shopHero}>
        {/* Decorative background circles */}
        <View style={[styles.heroBubble, { width: 160, height: 160, top: -50, left: -50 }]} />
        <View style={[styles.heroBubble, { width: 100, height: 100, top: -10, right: -30 }]} />
        <View style={[styles.heroBubble, { width: 70,  height: 70,  bottom: 20, left: 60 }]} />
        <View style={[styles.heroBubble, { width: 120, height: 120, bottom: -40, right: -20 }]} />

        {/* Floating pet emojis */}
        <Text style={[styles.heroEmoji, { top: 14, left: 18 }]}>🐶</Text>
        <Text style={[styles.heroEmoji, { top: 18, right: 20 }]}>🐱</Text>
        <Text style={[styles.heroEmoji, { bottom: 54, left: 14 }]}>🐾</Text>
        <Text style={[styles.heroEmoji, { bottom: 56, right: 16 }]}>🦴</Text>

        {/* Title */}
        <View style={styles.heroTitleRow}>
          <Text style={styles.heroTitle}>Shop</Text>
          <Text style={{ fontSize: 28, marginLeft: 6 }}>🐾</Text>
        </View>
        <Text style={styles.heroSub}>Amazon & Chewy, curated for your pet</Text>

        {/* Store tabs */}
        <View style={styles.heroTabRow}>
          <Pressable
            style={[styles.heroTab, shopTab === "amazon" && styles.heroTabActive]}
            onPress={() => setShopTab("amazon")}
          >
            <Ionicons
              name="cube-outline"
              size={15}
              color={shopTab === "amazon" ? BRAND : "rgba(255,255,255,0.85)"}
            />
            <Text style={[styles.heroTabText, shopTab === "amazon" && styles.heroTabTextActive]}>
              Amazon
            </Text>
          </Pressable>
          <Pressable
            style={[styles.heroTab, shopTab === "chewy" && styles.heroTabActive]}
            onPress={() => setShopTab("chewy")}
          >
            <Ionicons
              name="cart-outline"
              size={15}
              color={shopTab === "chewy" ? BRAND : "rgba(255,255,255,0.85)"}
            />
            <Text style={[styles.heroTabText, shopTab === "chewy" && styles.heroTabTextActive]}>
              Chewy
            </Text>
          </Pressable>
        </View>
      </View>
```

---

## Step 2 — Remove old toggle styles, add new hero styles

In `StyleSheet.create({...})`, **remove** these style keys entirely:
- `toggleRow`
- `toggleBtn`
- `toggleBtnAmazon`
- `toggleBtnChewy`
- `toggleText`
- `toggleTextActive`

**Add** these new styles in their place:

```ts
  // ── Shop hero ──────────────────────────────────────────────
  shopHero: {
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 0,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  heroBubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#fff",
    opacity: 0.1,
  },
  heroEmoji: {
    position: "absolute",
    fontSize: 20,
    opacity: 0.3,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    marginBottom: 18,
    textAlign: "center",
  },
  heroTabRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    padding: 4,
    gap: 4,
    width: "100%",
    marginBottom: 0,
  },
  heroTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 10,
    gap: 6,
  },
  heroTabActive: {
    backgroundColor: "#fff",
  },
  heroTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  heroTabTextActive: {
    color: BRAND,
    fontWeight: "700",
  },
```

---

## Step 3 — Remove top margin from species row

The species row currently has `marginHorizontal: 16` but no top margin — that's fine.
Just make sure `speciesRow` has `marginTop: 14` so there's breathing room below the hero:

```ts
  speciesRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
```

---

## After Applying

```bash
npx tsc --noEmit --skipLibCheck   # must be 0 errors
git add -A
git commit -m "Shop: branded blue hero banner with Amazon/Chewy tabs"
eas update --channel production --message "Shop hero: branded blue banner"
```

## ⛔ DO NOT TOUCH
- `auth.mypetdex.app` — never change
- `service-account.json` — never commit
- Firebase Functions: always N for rescueProxy, deleteAccount, getPublicStats
- Do not change any product catalog data or affiliate URLs
