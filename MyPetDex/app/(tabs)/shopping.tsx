import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Linking, TextInput, ActivityIndicator, Image,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const BRAND = "#4486F4";
const BLUE = "#4486F4";

type ShopTab = "amazon" | "chewy";

const CATEGORIES = ["All", "Food", "Treats", "Toys", "Health", "Grooming", "Accessories", "Beds"];

export default function ShoppingScreen() {
  const [shopTab, setShopTab] = useState<ShopTab>("amazon");
  const [selected, setSelected] = useState("All");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "featured_products"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProducts(list);
    } catch (e) {
      console.error("Failed to load products:", e);
    }
    setLoading(false);
  }

  const amazonProducts = products.filter(
    p =>
      p.store === "Amazon" &&
      (selected === "All" || p.category === selected) &&
      (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const chewyProducts = products.filter(
    p =>
      p.store === "Chewy" &&
      (selected === "All" || p.category === selected) &&
      (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const visibleProducts = shopTab === "amazon" ? amazonProducts : chewyProducts;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Tab Toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, shopTab === "amazon" && styles.toggleBtnAmazon]}
          onPress={() => setShopTab("amazon")}
        >
          <Ionicons name="cube-outline" size={16} color={shopTab === "amazon" ? "#fff" : "#666"} />
          <Text style={[styles.toggleText, shopTab === "amazon" && styles.toggleTextActive]}>
            Amazon
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, shopTab === "chewy" && styles.toggleBtnChewy]}
          onPress={() => setShopTab("chewy")}
        >
          <Ionicons name="cart-outline" size={16} color={shopTab === "chewy" ? "#fff" : "#666"} />
          <Text style={[styles.toggleText, shopTab === "chewy" && styles.toggleTextActive]}>
            Chewy
          </Text>
        </Pressable>
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
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, selected === cat && styles.chipActive]}
            onPress={() => setSelected(cat)}
          >
            <Text style={[styles.chipText, selected === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {shopTab === "amazon" ? "Amazon Products" : "Chewy Products"}
        </Text>

        {shopTab === "amazon" && (
          <View style={styles.disclaimer}>
            <Ionicons name="heart-circle-outline" size={24} color="#2d7a52" />
            <View style={styles.disclaimerTextWrap}>
              <Text style={styles.disclaimerBold}>You pay the exact same price!</Text>
              <Text style={styles.disclaimerText}>
                MyPetDex may earn a small commission on purchases at no extra cost to you.
              </Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 32 }} />
        ) : visibleProducts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name={shopTab === "amazon" ? "cube-outline" : "cart-outline"} size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySub}>
              {search || selected !== "All"
                ? "Try a different search or category."
                : shopTab === "chewy"
                ? "Chewy products will appear here once added from the admin dashboard."
                : "Products will appear here once added from the admin dashboard."}
            </Text>
          </View>
        ) : (
          visibleProducts.map((product) => (
            <Pressable
              key={product.id}
              style={styles.productCard}
              onPress={() => product.url && Linking.openURL(product.url)}
            >
              {product.imageUrl && !imgError[product.id] ? (
                <Image
                  source={{
                    uri: product.imageUrl,
                    headers: { Referer: "https://www.chewy.com/" },
                  }}
                  style={styles.productImage}
                  onError={() => setImgError(prev => ({ ...prev, [product.id]: true }))}
                />
              ) : (
                <View style={styles.productImageFallback}>
                  <Ionicons name={product.store === "Chewy" ? "cart-outline" : "cube-outline"} size={28} color="#aaa" />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.title}</Text>
                {product.description ? (
                  <Text style={styles.productDesc} numberOfLines={1}>{product.description}</Text>
                ) : null}
              </View>
              <Text style={[styles.shopBtn, product.store === "Chewy" && { color: "#1B75BC" }]}>
                Shop →
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { paddingBottom: 40 },

  // Toggle
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
  toggleBtnChewy: { backgroundColor: "#1B75BC" },
  toggleEmoji: { fontSize: 16 },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#fff", fontWeight: "700" },

  // Search
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
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#1a1a1a" },

  // Categories
  categories: { maxHeight: 50 },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
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

  // Section
  section: { padding: 16, gap: 10 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },

  // Disclaimer
  disclaimer: {
    backgroundColor: "#f0f8f4",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#d0eedf",
  },
  disclaimerEmoji: { fontSize: 22 },
  disclaimerTextWrap: { flex: 1 },
  disclaimerBold: { fontSize: 13, fontWeight: "700", color: "#2d7a52" },
  disclaimerText: { fontSize: 12, color: "#555", marginTop: 1 },

  // Product cards
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productImage: { width: 64, height: 64, borderRadius: 10, resizeMode: "cover", backgroundColor: "#f0f0f0" },
  productImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  productDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  shopBtn: { fontSize: 13, color: BRAND, fontWeight: "600" },

  // Empty state
  emptyBox: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  emptySub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
});
