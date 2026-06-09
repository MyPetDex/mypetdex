import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Linking, TextInput, ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { isWeb, webDb } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import _nativeFirestore from "@react-native-firebase/firestore";

const BRAND = "#4486F4";
const BLUE = "#4486F4";

type ShopTab = "amazon" | "chewy";

const CATEGORIES = ["All", "Food", "Toys", "Health", "Grooming", "Beds"];

const PRODUCTS = [
  { id: "1", category: "Food", name: "Royal Canin Adult Dog Food", price: "$54.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=royal+canin+adult+dog+food&tag=mypetdex20-20" },
  { id: "2", category: "Food", name: "Hill's Science Diet Cat Food", price: "$45.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=hills+science+diet+cat+food&tag=mypetdex20-20" },
  { id: "3", category: "Food", name: "Blue Buffalo Life Protection", price: "$38.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=blue+buffalo+life+protection+dog+food&tag=mypetdex20-20" },
  { id: "4", category: "Toys", name: "KONG Classic Dog Toy", price: "$12.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=kong+classic+dog+toy&tag=mypetdex20-20" },
  { id: "5", category: "Toys", name: "Feather Wand Cat Toy", price: "$8.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=feather+wand+cat+toy&tag=mypetdex20-20" },
  { id: "6", category: "Health", name: "Frontline Plus Flea Treatment", price: "$44.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=frontline+plus+flea+treatment&tag=mypetdex20-20" },
  { id: "7", category: "Health", name: "Zesty Paws Multivitamin", price: "$25.97", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=zesty+paws+multivitamin+dogs&tag=mypetdex20-20" },
  { id: "8", category: "Grooming", name: "Hertzko Self Cleaning Brush", price: "$19.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=hertzko+self+cleaning+slicker+brush&tag=mypetdex20-20" },
  { id: "9", category: "Grooming", name: "Burt's Bees Dog Shampoo", price: "$9.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=burts+bees+dog+shampoo&tag=mypetdex20-20" },
  { id: "10", category: "Beds", name: "Furhaven Orthopedic Dog Bed", price: "$39.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=furhaven+orthopedic+dog+bed&tag=mypetdex20-20" },
  { id: "11", category: "Beds", name: "K&H Heated Cat Bed", price: "$49.99", store: "Amazon", emoji: "📦", url: "https://www.amazon.com/s?k=kh+heated+cat+bed&tag=mypetdex20-20" },
];

const CHEWY_COMING_SOON = [
  { id: "c1", category: "Food", name: "Royal Canin Adult Dog Food", price: "$54.99", emoji: "🛒" },
  { id: "c2", category: "Food", name: "Hill's Science Diet Cat Food", price: "$45.99", emoji: "🛒" },
  { id: "c3", category: "Health", name: "Frontline Plus Flea Treatment", price: "$44.99", emoji: "🛒" },
  { id: "c4", category: "Grooming", name: "Burt's Bees Dog Shampoo", price: "$9.99", emoji: "🛒" },
  { id: "c5", category: "Toys", name: "Feather Wand Cat Toy", price: "$8.99", emoji: "🛒" },
  { id: "c6", category: "Beds", name: "K&H Heated Cat Bed", price: "$49.99", emoji: "🛒" },
];

export default function ShoppingScreen() {
  const [shopTab, setShopTab] = useState<ShopTab>("amazon");
  const [selected, setSelected] = useState("All");
  const [search, setSearch] = useState("");
  const [dbProducts, setDbProducts] = useState<any[] | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        let items: any[] = [];
        if (isWeb) {
          const snap = await getDocs(query(collection(webDb, "shopProducts"), where("active", "==", true)));
          items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          const snap = await _nativeFirestore().collection("shopProducts").where("active", "==", true).get();
          items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        }
        setDbProducts(items.length > 0 ? items : null);
      } catch {
        setDbProducts(null);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  const amazonSource = dbProducts ? dbProducts.filter(p => p.store === "amazon") : PRODUCTS;
  const chewySource  = dbProducts ? dbProducts.filter(p => p.store === "chewy")  : CHEWY_COMING_SOON;

  const filtered = amazonSource.filter(
    (p) =>
      (selected === "All" || p.category === selected) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const chewyFiltered = chewySource.filter(
    (p) =>
      (selected === "All" || p.category === selected) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Tab Toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, shopTab === "amazon" && styles.toggleBtnAmazon]}
          onPress={() => setShopTab("amazon")}
        >
          <Text style={styles.toggleEmoji}>📦</Text>
          <Text style={[styles.toggleText, shopTab === "amazon" && styles.toggleTextActive]}>
            Amazon
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, shopTab === "chewy" && styles.toggleBtnChewy]}
          onPress={() => setShopTab("chewy")}
        >
          <Text style={styles.toggleEmoji}>🛒</Text>
          <Text style={[styles.toggleText, shopTab === "chewy" && styles.toggleTextActive]}>
            Chewy
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
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

      {/* ── Amazon Tab ── */}
      {shopTab === "amazon" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛍️ Amazon Products</Text>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerEmoji}>💚</Text>
            <View style={styles.disclaimerTextWrap}>
              <Text style={styles.disclaimerBold}>You pay the exact same price!</Text>
              <Text style={styles.disclaimerText}>
                MyPetDex may earn a small commission on purchases at no extra cost to you.
              </Text>
            </View>
          </View>
          {filtered.map((product) => (
            <Pressable
              key={product.id}
              style={styles.productCard}
              onPress={() => Linking.openURL(product.url)}
            >
              <View style={styles.storeTag}>
                <Text style={styles.storeEmoji}>{product.emoji}</Text>
                <Text style={styles.storeName}>{product.store}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.price}</Text>
              </View>
              <Text style={styles.shopBtn}>Shop →</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Chewy Tab ── */}
      {shopTab === "chewy" && (
        <View style={styles.section}>
          {/* Coming soon banner */}
          <View style={styles.chewyBanner}>
            <Text style={styles.chewyBannerEmoji}>🐾</Text>
            <Text style={styles.chewyBannerTitle}>Chewy Integration Coming Soon!</Text>
            <Text style={styles.chewyBannerSub}>
              We're partnering with Chewy to bring you the best pet products
              directly in the app. Here's a sneak peek of what's coming!
            </Text>
          </View>

          <Text style={styles.sectionTitle}>🛒 Chewy Products Preview</Text>

          {chewyFiltered.map((product) => (
            <View key={product.id} style={[styles.productCard, styles.productCardDisabled]}>
              <View style={styles.storeTag}>
                <Text style={styles.storeEmoji}>{product.emoji}</Text>
                <Text style={[styles.storeName, { color: "#1B75BC" }]}>Chewy</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={[styles.productPrice, { color: "#1B75BC" }]}>
                  {product.price}
                </Text>
              </View>
              <View style={styles.comingSoonTag}>
                <Text style={styles.comingSoonTagText}>Soon</Text>
              </View>
            </View>
          ))}

          {/* Notify me card */}
          <View style={styles.notifyCard}>
            <Text style={styles.notifyTitle}>🔔 Want to be notified?</Text>
            <Text style={styles.notifySub}>
              We'll let you know as soon as Chewy integration goes live!
            </Text>
            <Pressable
              style={styles.notifyBtn}
              onPress={() => Linking.openURL("https://www.chewy.com")}
            >
              <Text style={styles.notifyBtnText}>Visit Chewy.com →</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  soonBadge: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  soonBadgeText: { fontSize: 10, fontWeight: "800", color: "#1B75BC" },

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
  productCardDisabled: { opacity: 0.7 },
  storeTag: { alignItems: "center", width: 44 },
  storeEmoji: { fontSize: 24 },
  storeName: { fontSize: 10, color: "#888", fontWeight: "500" },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  productPrice: { fontSize: 15, color: BRAND, fontWeight: "700", marginTop: 2 },
  shopBtn: { fontSize: 13, color: BRAND, fontWeight: "600" },
  comingSoonTag: {
    backgroundColor: "#1B75BC22",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B75BC",
  },

  // Chewy banner
  chewyBanner: {
    backgroundColor: "#EBF4FF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1B75BC33",
    marginBottom: 4,
  },
  chewyBannerEmoji: { fontSize: 36 },
  chewyBannerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B75BC",
    textAlign: "center",
  },
  chewyBannerSub: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
  },

  // Notify card
  notifyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  notifyTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  notifySub: { fontSize: 13, color: "#888", textAlign: "center" },
  notifyBtn: {
    backgroundColor: "#1B75BC",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  notifyBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});