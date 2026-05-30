import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { isWeb, webAuth, webDb } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut as webSignOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const BRAND = "#4CAF82";

export default function ShelterProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ shelterName: "", website: "", phone: "", city: "", state: "", ein: "", licenseNumber: "", description: "" });
  const router = useRouter();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      if (!isWeb) { setLoading(false); return; }
      const snap = await getDoc(doc(webDb, "users", user!.uid));
      if (snap.exists()) {
        const d = snap.data();
        setProfile(d);
        setForm({ shelterName: d.shelterName || "", website: d.website || "", phone: d.phone || "", city: d.city || "", state: d.state || "", ein: d.ein || "", licenseNumber: d.licenseNumber || "", description: d.description || "" });
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(webDb, "users", user!.uid), form);
      setProfile((p: any) => ({ ...p, ...form }));
      setEditMode(false);
    } catch { Alert.alert("Error", "Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleSignOut() {
    await webSignOut(webAuth);
    router.replace("/(auth)/sign-in");
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View style={s.avatar}><Ionicons name="home-heart-outline" size={32} color="#fff" /></View>
        <Text style={s.name}>{profile?.shelterName || profile?.displayName || "Shelter"}</Text>
        <Text style={s.email}>{profile?.email || ""}</Text>
        <View style={[s.badge, profile?.verified ? s.badgeGreen : s.badgeOrange]}>
          <Ionicons name={profile?.verified ? "checkmark-circle" : "time-outline"} size={13} color="#fff" />
          <Text style={s.badgeText}>{profile?.verified ? "Verified Shelter" : "Pending Verification"}</Text>
        </View>
      </View>

      {editMode ? (
        <View style={s.editCard}>
          <Text style={s.editTitle}>Edit Profile</Text>
          {[
            { key: "shelterName", label: "Shelter Name", placeholder: "e.g. Second Chance Animal Shelter" },
            { key: "website", label: "Website", placeholder: "https://yourshelter.org" },
            { key: "phone", label: "Phone", placeholder: "+1 (555) 000-0000" },
            { key: "city", label: "City", placeholder: "e.g. Miami" },
            { key: "state", label: "State", placeholder: "e.g. FL" },
            { key: "ein", label: "EIN Number", placeholder: "xx-xxxxxxx" },
            { key: "licenseNumber", label: "License Number", placeholder: "e.g. NJ-2024-xxxxx" },
          ].map(f => (
            <View key={f.key}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput style={s.input} value={(form as any)[f.key]} onChangeText={v => setForm(x => ({ ...x, [f.key]: v }))} placeholder={f.placeholder} />
            </View>
          ))}
          <Text style={s.label}>Description</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.description} onChangeText={v => setForm(x => ({ ...x, description: v }))} placeholder="About your shelter..." multiline />
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditMode(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.infoCard}>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(true)}>
            <Ionicons name="pencil" size={15} color="#fff" />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          {[
            { label: "Shelter Name", value: profile?.shelterName },
            { label: "Website", value: profile?.website },
            { label: "Phone", value: profile?.phone },
            { label: "Location", value: profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : profile?.city || profile?.state },
            { label: "EIN Number", value: profile?.ein },
            { label: "License #", value: profile?.licenseNumber },
          ].map(r => (
            <View key={r.label} style={s.row}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>{r.value || "—"}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  email: { fontSize: 14, color: "#64748B", marginBottom: 10 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeGreen: { backgroundColor: BRAND },
  badgeOrange: { backgroundColor: "#F5A623" },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: "flex-end", marginBottom: 12 },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowLabel: { fontSize: 13, color: "#64748B" },
  rowValue: { fontSize: 13, fontWeight: "600", color: "#1E293B", maxWidth: "55%", textAlign: "right" },
  editCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20 },
  editTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 14 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", alignItems: "center" },
  cancelText: { color: "#64748B", fontWeight: "700" },
  saveBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: BRAND, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  signOutText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
});
