import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Linking, TextInput,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/hooks/useResponsive";
import { webDb } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

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
  amazonSearch?: string;
  chewySearch?: string;
  url?: string;
  store?: string;
}


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
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const { isTablet, contentWidth, numColumns } = useResponsive();

  useEffect(() => {
    getDocs(collection(webDb, "featured_products"))
      .then((snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || "",
            description: data.description || "",
            category: data.category || "Other",
            species: "all" as const,
            url: data.url,
            store: data.store,
          };
        });
        setFeaturedProducts(list);
      })
      .catch(() => {});
  }, []);

  const storeName = shopTab === "amazon" ? "Amazon" : "Chewy";
  const catalog = featuredProducts.filter((p) =>
    !p.store || p.store.toLowerCase() === storeName.toLowerCase()
  );

  const visible = catalog.filter(p => {
    if (p.species !== "all" && p.species !== species) return false;
    if (selected !== "All" && p.category !== selected) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openProduct(product: Product) {
    if (product.url) {
      Linking.openURL(product.url);
      return;
    }
    const url = shopTab === "amazon"
      ? getAmazonUrl(product.amazonSearch || product.title)
      : getChewyUrl(product.chewySearch || product.title);
    Linking.openURL(url);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f8f8", alignItems: isTablet ? "center" : "stretch" }}>
    <ScrollView
      style={[styles.container, isTablet && { width: contentWidth }]}
      contentContainerStyle={styles.content}
      bounces={false}
    >

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
        <View style={styles.disclaimer}>
          <Ionicons name="heart-circle-outline" size={24} color="#2d7a52" />
          <View style={styles.disclaimerTextWrap}>
            <Text style={styles.disclaimerBold}>You pay the exact same price!</Text>
            <Text style={styles.disclaimerText}>MyPetDex may earn a small commission on purchases at no extra cost to you.</Text>
          </View>
        </View>

        {/* Product List */}
        {visible.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySub}>Try a different search or category.</Text>
          </View>
        ) : (
          <View
            key={numColumns}
            style={numColumns > 1 ? styles.productGrid : undefined}
          >
          {visible.map(product => {
            const meta = CATEGORY_ICONS[product.category];
            return (
              <Pressable
                key={product.id}
                style={[styles.productCard, numColumns > 1 && styles.productCardHalf]}
                onPress={() => openProduct(product)}
              >
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
          })}
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { paddingBottom: 40 },

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

  speciesRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
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
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  productCardHalf: {
    width: "48%",
    flexGrow: 1,
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
