import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from "react-native";
import { webDb } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4CAF82";
const ADMIN_EMAIL = "mypetdexapp@gmail.com";
const STORES = ["Amazon", "Chewy", "Other"];
const CATEGORIES = ["Food", "Treats", "Toys", "Health", "Grooming", "Accessories", "Other"];

export default function AdminProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", store: "Amazon", category: "Food", price: "", description: "" });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (user.email !== ADMIN_EMAIL) { setLoading(false); return; }
    loadProducts();
  }, [user]);

  async function loadProducts() {
    try {
      const snap = await getDocs(collection(webDb, "featured_products"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProducts(list);
    } finally { setLoading(false); }
  }

  async function addProduct() {
    if (!form.title.trim() || !form.url.trim()) { Alert.alert("Required", "Title and URL are required."); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(webDb, "featured_products"), { ...form, createdAt: serverTimestamp() });
      setProducts(p => [{ id: ref.id, ...form }, ...p]);
      setForm({ title: "", url: "", store: "Amazon", category: "Food", price: "", description: "" });
      setShowAdd(false);
    } finally { setSaving(false); }
  }

  async function deleteProduct(id: string, title: string) {
    Alert.alert("Remove Product", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        await deleteDoc(doc(webDb, "featured_products", id));
        setProducts(p => p.filter(x => x.id !== id));
      }},
    ]);
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  if (!user || user.email !== ADMIN_EMAIL) return <View style={s.center}><Text style={s.noAccess}>Access Restricted</Text></View>;

  const STORE_COLORS: Record<string, string> = { Amazon: "#FF9900", Chewy: "#0073CF", Other: "#64748B" };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <Text style={s.title}>Product Links</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.subtitle}>Featured Amazon & Chewy products shown in the app</Text>

      {products.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="pricetag-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyText}>No products yet</Text>
          <Text style={s.emptySubtext}>Tap Add to feature your first product</Text>
        </View>
      ) : (
        products.map(p => (
          <View key={p.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={[s.storeBadge, { backgroundColor: STORE_COLORS[p.store] || "#64748B" }]}>
                <Text style={s.storeBadgeText}>{p.store}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.productTitle}>{p.title}</Text>
                <Text style={s.productMeta}>{p.category}{p.price ? ` · ${p.price}` : ""}</Text>
              </View>
              <TouchableOpacity style={s.deleteBtn} onPress={() => deleteProduct(p.id, p.title)}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text style={s.url} numberOfLines={1}>{p.url}</Text>
            {p.description ? <Text style={s.desc}>{p.description}</Text> : null}
          </View>
        ))
      )}

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} contentContainerStyle={s.modalContent}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add Product Link</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Product Title *</Text>
          <TextInput style={s.input} value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Blue Buffalo Adult Dry Dog Food" />

          <Text style={s.label}>Product URL *</Text>
          <TextInput style={s.input} value={form.url} onChangeText={v => setForm(f => ({ ...f, url: v }))} placeholder="https://amazon.com/..." autoCapitalize="none" />

          <Text style={s.label}>Store</Text>
          <View style={s.chipRow}>
            {STORES.map(st => (
              <TouchableOpacity key={st} style={[s.chip, form.store === st && s.chipActive]} onPress={() => setForm(f => ({ ...f, store: st }))}>
                <Text style={[s.chipText, form.store === st && s.chipTextActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Category</Text>
          <View style={s.chipRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[s.chip, form.category === c && s.chipActive]} onPress={() => setForm(f => ({ ...f, category: c }))}>
                <Text style={[s.chipText, form.category === c && s.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Price (optional)</Text>
          <TextInput style={s.input} value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))} placeholder="e.g. $29.99" />

          <Text style={s.label}>Description (optional)</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Brief description of the product..." multiline />

          <TouchableOpacity style={s.saveBtn} onPress={addProduct} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Add Product</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  noAccess: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 20 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  emptySubtext: { fontSize: 14, color: "#CBD5E1" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  storeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  storeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  productTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  productMeta: { fontSize: 12, color: "#64748B", marginTop: 1 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  url: { fontSize: 12, color: "#3B82F6", marginBottom: 4 },
  desc: { fontSize: 13, color: "#64748B" },
  modal: { flex: 1, backgroundColor: "#F5F8FF" },
  modalContent: { padding: 20, paddingBottom: 60 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#fff" },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: BRAND, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
