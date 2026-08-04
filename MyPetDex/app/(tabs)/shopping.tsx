import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Linking, TextInput,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const BRAND = "#4486F4";

type ShopTab = "amazon" | "chewy";
type Species = "dog" | "cat";

const CATEGORIES = ["All", "Food", "Treats", "Toys", "Health", "Grooming", "Accessories", "Beds"];

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  Food:        { icon: "fast-food-outline",       color: "#f59e0b" },
  Treats:      { icon: "gift-outline",            color: "#ec4899" },
  Toys:        { icon: "basketball-outline",      color: "#8b5cf6" },
  Health:      { icon: "medical-outline",         color: "#ef4444" },
  Grooming:    { icon: "cut-outline",             color: "#10b981" },
  Accessories: { icon: "bag-handle-outline",      color: "#3b82f6" },
  Beds:        { icon: "bed-outline",             color: "#6366f1" },
};

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  species: "dog" | "cat" | "all";
  amazonSearch: string;
  chewySearch: string;
}

const PRODUCT_CATALOG: Product[] = [
  // ── DOG — Food ──────────────────────────────────────────────
  { id: "d-food-1", title: "Premium Dry Dog Food",      description: "Top-rated kibble for daily nutrition",         category: "Food",        species: "dog", amazonSearch: "best rated dry dog food",             chewySearch: "premium dry dog food" },
  { id: "d-food-2", title: "Wet Dog Food Variety Pack", description: "Picky-eater approved, no fillers",            category: "Food",        species: "dog", amazonSearch: "wet dog food variety pack",            chewySearch: "wet dog food variety pack" },
  { id: "d-food-3", title: "Grain-Free Dog Food",       description: "No corn, wheat, or soy",                      category: "Food",        species: "dog", amazonSearch: "grain free dog food",                 chewySearch: "grain free dog food" },
  { id: "d-food-4", title: "Senior Dog Food",           description: "Gentle formula for older dogs",               category: "Food",        species: "dog", amazonSearch: "senior dog food",                     chewySearch: "senior dog food" },
  // ── DOG — Treats ────────────────────────────────────────────
  { id: "d-trts-1", title: "Training Treats",           description: "Small, low-calorie reward bites",             category: "Treats",      species: "dog", amazonSearch: "dog training treats small",            chewySearch: "dog training treats" },
  { id: "d-trts-2", title: "Dental Chews",              description: "Reduces tartar and freshens breath",          category: "Treats",      species: "dog", amazonSearch: "dog dental chews tartar",              chewySearch: "dog dental chews" },
  { id: "d-trts-3", title: "Natural Jerky Treats",      description: "Single-ingredient, real meat",                category: "Treats",      species: "dog", amazonSearch: "natural dog jerky treats single ingredient", chewySearch: "dog jerky treats natural" },
  { id: "d-trts-4", title: "Freeze-Dried Treats",       description: "Raw nutrition, no preservatives",             category: "Treats",      species: "dog", amazonSearch: "freeze dried dog treats",              chewySearch: "freeze dried dog treats" },
  // ── DOG — Toys ──────────────────────────────────────────────
  { id: "d-toys-1", title: "Interactive Puzzle Toy",    description: "Keeps dogs mentally stimulated",              category: "Toys",        species: "dog", amazonSearch: "dog puzzle toy interactive",           chewySearch: "dog puzzle toy" },
  { id: "d-toys-2", title: "Rope Chew Toy",             description: "Durable braided rope for chewers",            category: "Toys",        species: "dog", amazonSearch: "dog rope chew toy durable",            chewySearch: "dog rope toy" },
  { id: "d-toys-3", title: "Squeaky Plush Toy",         description: "Soft and cuddly with a fun squeak",           category: "Toys",        species: "dog", amazonSearch: "dog squeaky plush toy",                chewySearch: "dog plush squeaky toy" },
  { id: "d-toys-4", title: "Automatic Ball Launcher",   description: "Endless fetch, hands-free",                   category: "Toys",        species: "dog", amazonSearch: "automatic dog ball launcher",          chewySearch: "dog ball launcher" },
  { id: "d-toys-5", title: "Tug-of-War Toy",            description: "Great for bonding and exercise",              category: "Toys",        species: "dog", amazonSearch: "dog tug of war toy",                   chewySearch: "dog tug toy" },
  // ── DOG — Health ────────────────────────────────────────────
  { id: "d-hlth-1", title: "Daily Multivitamin Chews",  description: "Complete vitamin & mineral support",          category: "Health",      species: "dog", amazonSearch: "dog multivitamin chews daily",         chewySearch: "dog vitamins chews" },
  { id: "d-hlth-2", title: "Joint Supplement",          description: "Glucosamine & chondroitin for mobility",      category: "Health",      species: "dog", amazonSearch: "dog joint supplement glucosamine chondroitin", chewySearch: "dog joint supplement" },
  { id: "d-hlth-3", title: "Omega-3 Fish Oil",          description: "Shiny coat and healthy skin",                 category: "Health",      species: "dog", amazonSearch: "dog fish oil omega 3 supplement",      chewySearch: "dog fish oil" },
  { id: "d-hlth-4", title: "Probiotic Supplement",      description: "Supports gut health and digestion",           category: "Health",      species: "dog", amazonSearch: "dog probiotic supplement digestion",   chewySearch: "dog probiotics" },
  { id: "d-hlth-5", title: "Flea & Tick Prevention",    description: "Veterinarian recommended",                    category: "Health",      species: "dog", amazonSearch: "dog flea tick prevention treatment",   chewySearch: "dog flea tick prevention" },
  // ── DOG — Grooming ──────────────────────────────────────────
  { id: "d-grm-1",  title: "Dog Shampoo",               description: "Gentle, vet-formulated formula",              category: "Grooming",    species: "dog", amazonSearch: "dog shampoo vet recommended",          chewySearch: "dog shampoo" },
  { id: "d-grm-2",  title: "Deshedding Brush",          description: "Reduces shedding up to 90%",                  category: "Grooming",    species: "dog", amazonSearch: "dog deshedding brush furminator",      chewySearch: "dog deshedding brush" },
  { id: "d-grm-3",  title: "Nail Clippers",             description: "Professional-grade, safety guard",            category: "Grooming",    species: "dog", amazonSearch: "dog nail clippers professional safety",chewySearch: "dog nail clippers" },
  { id: "d-grm-4",  title: "Waterless Dog Shampoo",     description: "Quick clean between baths",                   category: "Grooming",    species: "dog", amazonSearch: "waterless dog shampoo dry",            chewySearch: "waterless dog shampoo" },
  // ── DOG — Accessories ───────────────────────────────────────
  { id: "d-acc-1",  title: "No-Pull Dog Harness",       description: "Comfortable, escape-proof fit",               category: "Accessories", species: "dog", amazonSearch: "no pull dog harness adjustable",       chewySearch: "dog harness no pull" },
  { id: "d-acc-2",  title: "Retractable Leash",         description: "16ft range with one-button brake",            category: "Accessories", species: "dog", amazonSearch: "retractable dog leash 16ft",           chewySearch: "retractable dog leash" },
  { id: "d-acc-3",  title: "Slow Feeder Bowl",          description: "Prevents bloat and improves digestion",       category: "Accessories", species: "dog", amazonSearch: "slow feeder dog bowl",                 chewySearch: "slow feeder dog bowl" },
  { id: "d-acc-4",  title: "Travel Water Bottle",       description: "Built-in bowl, leak-proof",                   category: "Accessories", species: "dog", amazonSearch: "dog travel water bottle bowl",         chewySearch: "dog travel water bottle" },
  { id: "d-acc-5",  title: "Poop Bag Dispenser",        description: "Includes 300 extra-thick bags",               category: "Accessories", species: "dog", amazonSearch: "dog poop bag dispenser holder",        chewySearch: "dog poop bags dispenser" },
  // ── DOG — Beds ──────────────────────────────────────────────
  { id: "d-bed-1",  title: "Orthopedic Dog Bed",        description: "Memory foam for joint relief",                category: "Beds",        species: "dog", amazonSearch: "orthopedic dog bed memory foam",       chewySearch: "orthopedic dog bed" },
  { id: "d-bed-2",  title: "Calming Anxiety Bed",       description: "Donut shape reduces stress",                  category: "Beds",        species: "dog", amazonSearch: "calming dog bed anxiety donut",        chewySearch: "calming dog bed" },
  { id: "d-bed-3",  title: "Waterproof Dog Bed",        description: "Easy-clean, machine washable cover",          category: "Beds",        species: "dog", amazonSearch: "waterproof dog bed machine washable",  chewySearch: "waterproof dog bed" },
  { id: "d-bed-4",  title: "Elevated Cooling Cot",      description: "Breathable mesh keeps dogs cool",             category: "Beds",        species: "dog", amazonSearch: "elevated dog bed cooling cot",         chewySearch: "elevated dog cot" },

  // ── CAT — Food ──────────────────────────────────────────────
  { id: "c-food-1", title: "Premium Dry Cat Food",      description: "High-protein, vet-approved kibble",           category: "Food",        species: "cat", amazonSearch: "best dry cat food high protein",       chewySearch: "premium dry cat food" },
  { id: "c-food-2", title: "Wet Cat Food Variety Pack", description: "Irresistible flavors, no fillers",            category: "Food",        species: "cat", amazonSearch: "wet cat food variety pack",            chewySearch: "wet cat food variety pack" },
  { id: "c-food-3", title: "Grain-Free Cat Food",       description: "Supports digestive health",                   category: "Food",        species: "cat", amazonSearch: "grain free cat food",                  chewySearch: "grain free cat food" },
  { id: "c-food-4", title: "Senior Cat Food",           description: "Kidney-friendly formula for older cats",      category: "Food",        species: "cat", amazonSearch: "senior cat food kidney support",       chewySearch: "senior cat food" },
  // ── CAT — Treats ────────────────────────────────────────────
  { id: "c-trts-1", title: "Soft Cat Treats",           description: "Irresistible, bite-sized rewards",            category: "Treats",      species: "cat", amazonSearch: "soft cat treats",                      chewySearch: "soft cat treats" },
  { id: "c-trts-2", title: "Dental Cat Treats",         description: "Cleans teeth, freshens breath",               category: "Treats",      species: "cat", amazonSearch: "cat dental treats tartar control",     chewySearch: "cat dental treats" },
  { id: "c-trts-3", title: "Freeze-Dried Cat Treats",   description: "Single-ingredient, raw nutrition",            category: "Treats",      species: "cat", amazonSearch: "freeze dried cat treats single ingredient", chewySearch: "freeze dried cat treats" },
  // ── CAT — Toys ──────────────────────────────────────────────
  { id: "c-toys-1", title: "Interactive Feather Wand",  description: "Encourages natural hunting instinct",         category: "Toys",        species: "cat", amazonSearch: "cat feather wand interactive toy",     chewySearch: "cat feather wand toy" },
  { id: "c-toys-2", title: "Cat Tunnel",                description: "Crinkle sounds, peek-a-boo holes",            category: "Toys",        species: "cat", amazonSearch: "cat tunnel toy crinkle",               chewySearch: "cat tunnel toy" },
  { id: "c-toys-3", title: "Ball Track Toy",            description: "Endless spinning fun, no batteries",          category: "Toys",        species: "cat", amazonSearch: "cat ball track toy spinning",          chewySearch: "cat track toy" },
  { id: "c-toys-4", title: "Laser Pointer Toy",         description: "USB rechargeable, multiple patterns",         category: "Toys",        species: "cat", amazonSearch: "cat laser pointer toy rechargeable",   chewySearch: "cat laser toy" },
  // ── CAT — Health ────────────────────────────────────────────
  { id: "c-hlth-1", title: "Cat Multivitamin",          description: "Daily vitamins in a tasty chew",              category: "Health",      species: "cat", amazonSearch: "cat multivitamin daily supplement",    chewySearch: "cat vitamins supplement" },
  { id: "c-hlth-2", title: "Hairball Control Remedy",   description: "Reduces hairballs naturally",                 category: "Health",      species: "cat", amazonSearch: "cat hairball control supplement",      chewySearch: "cat hairball remedy" },
  { id: "c-hlth-3", title: "Cat Probiotic",             description: "Healthy gut, fewer tummy issues",             category: "Health",      species: "cat", amazonSearch: "cat probiotic supplement digestive",   chewySearch: "cat probiotics" },
  { id: "c-hlth-4", title: "Omega-3 for Cats",          description: "Healthy coat and skin from the inside",       category: "Health",      species: "cat", amazonSearch: "cat omega 3 fish oil supplement",      chewySearch: "cat fish oil omega 3" },
  // ── CAT — Grooming ──────────────────────────────────────────
  { id: "c-grm-1",  title: "Cat Shampoo",               description: "Gentle, pH-balanced, vet approved",           category: "Grooming",    species: "cat", amazonSearch: "cat shampoo gentle vet approved",      chewySearch: "cat shampoo" },
  { id: "c-grm-2",  title: "Deshedding Cat Brush",      description: "Cuts shedding, prevents mats",                category: "Grooming",    species: "cat", amazonSearch: "cat deshedding brush grooming",        chewySearch: "cat brush deshedding" },
  { id: "c-grm-3",  title: "Cat Nail Clippers",         description: "Precise cut, safe guard",                     category: "Grooming",    species: "cat", amazonSearch: "cat nail clippers safety guard",       chewySearch: "cat nail clippers" },
  // ── CAT — Accessories ───────────────────────────────────────
  { id: "c-acc-1",  title: "Breakaway Cat Collar",      description: "Safety release, reflective strip",            category: "Accessories", species: "cat", amazonSearch: "cat collar breakaway reflective safety",chewySearch: "cat collar breakaway" },
  { id: "c-acc-2",  title: "Soft-Sided Cat Carrier",    description: "Airline-approved, cozy interior",             category: "Accessories", species: "cat", amazonSearch: "cat carrier soft sided airline approved",chewySearch: "cat carrier soft sided" },
  { id: "c-acc-3",  title: "Self-Cleaning Litter Box",  description: "Automatic rake, odor control",                category: "Accessories", species: "cat", amazonSearch: "self cleaning cat litter box automatic", chewySearch: "self cleaning litter box" },
  { id: "c-acc-4",  title: "Cat Water Fountain",        description: "Encourages hydration with flowing water",     category: "Accessories", species: "cat", amazonSearch: "cat water fountain filter",             chewySearch: "cat water fountain" },
  { id: "c-acc-5",  title: "Slow Feeder Cat Bowl",      description: "Prevents gulping and vomiting",               category: "Accessories", species: "cat", amazonSearch: "slow feeder cat bowl puzzle",          chewySearch: "slow feeder cat bowl" },
  // ── CAT — Beds ──────────────────────────────────────────────
  { id: "c-bed-1",  title: "Cat Cave Bed",              description: "Cozy enclosed hideaway cats love",            category: "Beds",        species: "cat", amazonSearch: "cat cave bed enclosed cozy",           chewySearch: "cat cave bed" },
  { id: "c-bed-2",  title: "Cat Tree with Perch",       description: "Scratching post + elevated hideout",          category: "Beds",        species: "cat", amazonSearch: "cat tree scratching post perch",       chewySearch: "cat tree" },
  { id: "c-bed-3",  title: "Heated Cat Bed",            description: "Thermostatically controlled warmth",          category: "Beds",        species: "cat", amazonSearch: "heated cat bed self warming",          chewySearch: "heated cat bed" },
  { id: "c-bed-4",  title: "Window Perch",              description: "Bird-watching seat with suction cups",        category: "Beds",        species: "cat", amazonSearch: "cat window perch suction cup hammock",  chewySearch: "cat window perch" },
];

function getAmazonUrl(search: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(search)}&tag=mypetdex20-20`;
}

function getChewyUrl(search: string): string {
  const dest = encodeURIComponent(`https://www.chewy.com/s?query=${encodeURIComponent(search)}`);
  return `https://chewy.sjv.io/c/7270969/2846786/32975?u=${dest}`;
}

export default function ShoppingScreen() {
  const [shopTab, setShopTab]       = useState<ShopTab>("amazon");
  const [species, setSpecies]       = useState<Species>("dog");
  const [selected, setSelected]     = useState("All");
  const [search, setSearch]         = useState("");

  const visible = PRODUCT_CATALOG.filter(p => {
    if (p.species !== "all" && p.species !== species) return false;
    if (selected !== "All" && p.category !== selected) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openProduct(product: Product) {
    const url = shopTab === "amazon"
      ? getAmazonUrl(product.amazonSearch)
      : getChewyUrl(product.chewySearch);
    Linking.openURL(url);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>

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

      {/* Species Toggle */}
      <View style={styles.speciesRow}>
        {(["dog", "cat"] as Species[]).map(s => (
          <Pressable
            key={s}
            style={[styles.speciesBtn, species === s && styles.speciesBtnActive]}
            onPress={() => { setSpecies(s); setSelected("All"); }}
          >
            <Text style={[styles.speciesText, species === s && styles.speciesTextActive]}>
              {s === "dog" ? "🐶 Dog" : "🐱 Cat"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </Pressable>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            style={[styles.chip, selected === cat && styles.chipActive]}
            onPress={() => setSelected(cat)}
          >
            <Text style={[styles.chipText, selected === cat && styles.chipTextActive]}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Disclaimer */}
      <View style={styles.section}>
        {shopTab === "amazon" && (
          <View style={styles.disclaimer}>
            <Ionicons name="heart-circle-outline" size={24} color="#2d7a52" />
            <View style={styles.disclaimerTextWrap}>
              <Text style={styles.disclaimerBold}>You pay the exact same price!</Text>
              <Text style={styles.disclaimerText}>MyPetDex may earn a small commission on purchases at no extra cost to you.</Text>
            </View>
          </View>
        )}

        {/* Product List */}
        {visible.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySub}>Try a different search or category.</Text>
          </View>
        ) : (
          visible.map(product => {
            const meta = CATEGORY_ICONS[product.category];
            return (
              <Pressable key={product.id} style={styles.productCard} onPress={() => openProduct(product)}>
                <View style={[styles.productIcon, { backgroundColor: (meta?.color || "#888") + "20" }]}>
                  <Ionicons
                    name={(meta?.icon as any) || "pricetag-outline"}
                    size={26}
                    color={meta?.color || "#888"}
                  />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.title}</Text>
                  <Text style={styles.productDesc} numberOfLines={1}>{product.description}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                </View>
                <Text style={[styles.shopBtn, shopTab === "chewy" && { color: "#1B75BC" }]}>
                  Shop →
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { paddingBottom: 40 },

  toggleRow: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnAmazon: { backgroundColor: "#FF9900" },
  toggleBtnChewy:  { backgroundColor: "#1B75BC" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#fff", fontWeight: "700" },

  speciesRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  speciesBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  speciesBtnActive: { borderColor: BRAND, backgroundColor: BRAND + "15" },
  speciesText: { fontSize: 14, fontWeight: "600", color: "#666" },
  speciesTextActive: { color: BRAND, fontWeight: "700" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1a1a1a" },

  categories: { maxHeight: 50 },
  categoriesContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: "#666", fontWeight: "500" },
  chipTextActive: { color: "#fff" },

  section: { padding: 16, gap: 10 },

  disclaimer: {
    backgroundColor: "#f0f8f4",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#d0eedf",
    marginBottom: 4,
  },
  disclaimerTextWrap: { flex: 1 },
  disclaimerBold: { fontSize: 13, fontWeight: "700", color: "#2d7a52" },
  disclaimerText: { fontSize: 12, color: "#555", marginTop: 1 },

  productCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  productIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  productDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  productCategory: { fontSize: 11, color: BRAND, fontWeight: "600", marginTop: 3 },
  shopBtn: { fontSize: 13, color: BRAND, fontWeight: "700" },

  emptyBox: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  emptySub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
});
