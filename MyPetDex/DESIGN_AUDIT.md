# MyPetDex Design Audit
_July 4, 2026 — All screens reviewed_

## TL;DR
The app works well and has good bones — consistent brand blue, clean white cards, proper iOS tab navigation, solid card layouts. The gap between "working" and "professional" comes down to 5 recurring issues. Fix them and the app looks dramatically better with minimal risk to existing code.

---

## The 5 Core Problems

### 1. Emoji icons used as UI elements (every screen)
This is the single biggest thing making the app look like a student project. Every screen uses emoji as icons:
- Records tab: 🏥 📞 📍 ✉️ 📋
- Home stats: 💉 ⏰
- Quick Access: pastel squares with emoji inside
- Shop: 🛍️ 🛒
- Explore services: ✂️ 🐕 🏥 🏨 🎓 ☀️
- Settings: ⭐ ❤️ ⚙️ 🐾
- Tab bar: 🐾 for home, ⚙️ for settings

Top apps (Apple Health, Headspace, Rover, Wag) use SF Symbols or a consistent vector icon library — never emoji. The fix: install `@expo/vector-icons` (already included in Expo) and use `Ionicons` for everything. The icon names are well-documented. This one change transforms the professionalism of every screen.

### 2. The floating gray gear icon
A gray circular gear button floats in the bottom-left corner of almost every screen. It looks like a developer debug tool. It should not be visible in the production build. Remove it or hide it behind a settings route.

### 3. Inconsistent color system
- Pet pills on the Me screen are lavender/purple — not brand blue
- The Daycare category card has a hot pink border
- Share buttons use green (WhatsApp), blue (Facebook), dark (SMS) — three different brand colors fighting each other
- The MyPetDex logo orb floating above the home header is dark green
- Several elements use a purple tint (`#EEF0FF` background with blue-purple text) instead of brand blue `#4486F4`

Everything should resolve to: `#4486F4` (blue), `#F4F6FB` (background), `#0F172A` (text), `#64748B` (secondary). No other accent colors.

### 4. No visual depth on the home hero
The blue header rectangle has a perfectly flat bottom edge with a hard horizontal line. It looks like a rectangle dropped onto the page. Top apps add one of:
- A gentle curved/rounded bottom edge (border-radius on bottom of the hero view)
- The white dashboard card visually "overlapping" the blue hero (negative margin top)
- A subtle wave SVG at the bottom of the hero

The web profile page (`app.mypetdex.app`) actually looks more polished than the iOS app in this regard — the iOS hero should match that quality.

### 5. Typography has no section-level hierarchy
"Your Pet", "Quick Access", and "Discover" on the home screen are just plain bold black text — same visual weight as card content. The Explore screen already does this correctly: "BROWSE BY SERVICE" in uppercase gray with letter spacing is the best typography treatment in the entire app. That pattern should be used everywhere.

---

## Screen-by-Screen Specifics

### Home Screen
- The green MyPetDex logo orb floating above the blue hero looks detached and random — remove it or integrate it into the header design properly
- "Plus Plan" pill in the hero is too small and gets lost against the blue
- The "Dexi ▼" pet selector pill should show a tiny 24px circular pet photo alongside the name — like how Spotify shows the account avatar
- Stats row emojis (💉 ⏰) → replace with Ionicons: `medkit-outline`, `alarm-outline`
- Quick Access 2x2 grid: the pastel squares with emoji look like a first draft. Each card should have a clean Ionicon (no colored square background) aligned left, with label below

### Pet Details (Records tab)
- Modal title "Pet Details" is generic — could just be the pet's name ("Dexi")
- The close "✗" is a text character, not a proper icon — use `Ionicons close`
- Tab bar font at 11pt is barely readable — 12pt minimum
- Section tabs could benefit from the selected tab having a more visible underline (the current 2px blue line is correct but thin)
- Vet card emoji icons → Ionicons: `business-outline`, `call-outline`, `location-outline`, `mail-outline`

### Me Screen (Pet list)
- "Me" as the page title is appropriate but could have slightly more visual weight (larger, or slightly colored)
- The pet list pills are purple/lavender — switch to brand blue background and text
- The "My Pets | Settings" toggle uses 🐾 and ⚙️ emojis — replace with `paw-outline` and `settings-outline` Ionicons

### Shop Screen
- Filter category pills truncate ("Groo...") — add `numberOfLines={1}` with proper ellipsis or shorten to "Groom"
- Product titles are full Amazon SKU titles — truncate to 2 lines max
- The affiliation disclaimer banner (green background) looks fine in concept but should use brand colors, not green
- "Amazon Products" / "Chewy Products" section headers use emoji — replace with clean icon

### Explore Screen
- Service category grid with emoji icons → proper Ionicons (scissors, walk, medical, bed, school, sunny-outline)
- Daycare card has a pink/magenta selected border — should be brand blue
- Provider rating uses ⭐ emoji — use a star Ionicon with yellow color
- "Find Pet Services Near You" title font could be slightly larger/bolder (24pt semibold)
- "BROWSE BY SERVICE" uppercase tracking label is excellent — use this pattern everywhere

### MyPetDex Assistant
- The pet selector cards show a generic 🐶 emoji instead of actual pet photos — use `ExpoImage` with the pet's `photoURL`
- Large empty gray space in the middle while waiting — add a subtle placeholder/tip
- The assistant chat bubble is functional but very plain

### Settings Screen
- Share buttons (WhatsApp green, Facebook blue, SMS dark gray) clash with the brand — make all three the same dark charcoal style or brand blue, and just use text + icon
- "Love MyPetDex? ❤️" is fine conceptually, but the ❤️ emoji in the section title weakens it
- "Plus Plan" card uses ⭐ — use a proper icon

---

## Priority Action Order

**Do these first (high impact, quick):**
1. Remove the floating gear icon overlay from all screens
2. Rename the "MyPetDex A..." tab to "AI" (fixes truncation immediately)
3. Fix pill color inconsistency — all pills use brand blue `#4486F4` background with white text, or light blue `#EBF2FE` background with `#4486F4` text

**Do these second (visual transformation):**
4. Replace all emoji icons with Ionicons across all screens
5. Add curved bottom edge to the home hero (add `borderBottomLeftRadius: 24, borderBottomEndRadius: 24` to the hero View, or add negative margin on the card below to create overlap)
6. Apply the "UPPERCASE GRAY TRACKING" section header style everywhere — consistent with what Explore already does

**Do these third (refinement):**
7. Add the pet photo to the "Dexi ▼" switcher pill
8. Add pet photos to the Assistant screen's pet selector cards
9. Fix Shop product title truncation
10. Unify the Settings share buttons to same color/style
11. Replace empty states with something warmer than just emoji + text

---

## What's Already Working Well
- The web profile (`app.mypetdex.app`) looks clean and professional — best looking surface in the product
- White cards on the light gray `#F4F6FB` background is correct — proper visual layering
- The tab bar pattern is standard iOS and works
- The pet list cards (photo + name + breed + pills + chevron) is a good pattern
- The blue `#4486F4` brand color is distinctive and well-chosen
- Circular pet photos throughout the app create a consistent, warm feel
- The vet card structure (in Records tab) has good information hierarchy

---

## Reference Apps to Study
- **Apple Health** — how to make data-dense content feel calm and organized
- **Rover** — pet-specific, professional, warm — direct competitor worth studying
- **Headspace** — how to make a utility app feel warm and premium
- **Airbnb** — card design, section header typography, empty states with illustration
