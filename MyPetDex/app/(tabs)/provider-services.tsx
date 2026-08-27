import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { webDb } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4486F4";
const SERVICE_TYPES = ["Grooming", "Dog Walking", "Veterinary", "Training", "Boarding", "Daycare", "Pet Sitting", "Photography", "Other"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};
const SLOT_OPTIONS = [30, 60, 90];

function defaultAvailability() {
  const avail: Record<string, any> = {};
  DAYS.forEach((d) => {
    avail[d] = { closed: d === "sunday", open: "09:00", close: "17:00", slotMinutes: 60 };
  });
  return avail;
}

export default function ProviderServices() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [availability, setAvailability] = useState<Record<string, any>>({});
  const [editAvail, setEditAvail] = useState(false);
  const [availForm, setAvailForm] = useState<Record<string, any>>({});
  const [form, setForm] = useState({
    businessName: "", serviceType: "", priceRange: "", phone: "",
    website: "", bio: "", googleReviewUrl: "", city: "", state: "",
  });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      const snap = await getDoc(doc(webDb, "users", user!.uid));
      if (snap.exists()) {
        const d = snap.data();
        setProfile(d);
        setAvailability(d.availability || defaultAvailability());
        setAvailForm(d.availability || defaultAvailability());
        setForm({
          businessName: d.businessName || "",
          serviceType: d.serviceType || "",
          priceRange: d.priceRange || "",
          phone: d.phone || "",
          website: d.website || "",
          bio: d.bio || "",
          googleReviewUrl: d.googleReviewUrl || "",
          city: d.city || "",
          state: d.state || "",
        });
      }
    } finally { setLoading(false); }
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(webDb, "users", user!.uid), form);
      setProfile((p: any) => ({ ...p, ...form }));
      setEditMode(false);
    } catch (e) {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally { setSaving(false); }
  }

  async function saveAvailability() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(webDb, "users", user!.uid), { availability: availForm });
      setAvailability(availForm);
      setEditAvail(false);
    } catch {
      Alert.alert("Error", "Failed to save availability.");
    } finally { setSaving(false); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <Text style={s.title}>My Services</Text>
        <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(true)}>
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={s.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Business Info */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🏢 Business Information</Text>
        <InfoRow label="Business Name" value={form.businessName} />
        <InfoRow label="Service Type" value={form.serviceType} />
        <InfoRow label="Price Range" value={form.priceRange} />
        <InfoRow label="Phone" value={form.phone} />
        <InfoRow label="Website" value={form.website} />
        <InfoRow label="Location" value={form.city && form.state ? `${form.city}, ${form.state}` : form.city || form.state} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>📝 Bio / Description</Text>
        <Text style={s.bioText}>{form.bio || "No bio added yet. Tap Edit to add one."}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>⭐ Google Reviews</Text>
        {form.googleReviewUrl ? (
          <Text style={s.link}>{form.googleReviewUrl}</Text>
        ) : (
          <Text style={s.empty}>No Google Review link added. Tap Edit to add yours.</Text>
        )}
      </View>

      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={s.cardTitle}>📅 Availability & Booking Slots</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditAvail(true)}>
            <Ionicons name="pencil" size={14} color="#fff" />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {DAYS.map((day) => {
          const a = availability[day] || { closed: true, open: "09:00", close: "17:00", slotMinutes: 60 };
          return (
            <View key={day} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 13, color: a.closed ? "#CBD5E1" : "#1E293B", fontWeight: "600", width: 90 }}>{DAY_LABELS[day]}</Text>
              {a.closed ? (
                <Text style={{ fontSize: 13, color: "#CBD5E1" }}>Closed</Text>
              ) : (
                <Text style={{ fontSize: 13, color: "#64748B" }}>{a.open} – {a.close} · {a.slotMinutes}min slots</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Edit Modal */}
      <Modal visible={editMode} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flexShrink: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ScrollView style={s.modal} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Edit Services</Text>
            <TouchableOpacity onPress={() => setEditMode(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Business Name *</Text>
          <TextInput style={s.input} value={form.businessName} onChangeText={(v) => setForm(f => ({ ...f, businessName: v }))} placeholder="e.g. Happy Paws Grooming" />

          <Text style={s.label}>Service Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {SERVICE_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[s.chip, form.serviceType === t && s.chipActive]} onPress={() => setForm(f => ({ ...f, serviceType: t }))}>
                <Text style={[s.chipText, form.serviceType === t && s.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Price Range</Text>
          <TextInput style={s.input} value={form.priceRange} onChangeText={(v) => setForm(f => ({ ...f, priceRange: v }))} placeholder="e.g. $40–$80 per session" />

          <Text style={s.label}>Phone Number</Text>
          <TextInput style={s.input} value={form.phone} onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />

          <Text style={s.label}>Website (optional)</Text>
          <TextInput style={s.input} value={form.website} onChangeText={(v) => setForm(f => ({ ...f, website: v }))} placeholder="https://yoursite.com" autoCapitalize="none" />

          <Text style={s.label}>Google Reviews URL</Text>
          <TextInput style={s.input} value={form.googleReviewUrl} onChangeText={(v) => setForm(f => ({ ...f, googleReviewUrl: v }))} placeholder="https://g.page/r/..." autoCapitalize="none" />

          <Text style={s.label}>City</Text>
          <TextInput style={s.input} value={form.city} onChangeText={(v) => setForm(f => ({ ...f, city: v }))} placeholder="e.g. Miami" />

          <Text style={s.label}>State</Text>
          <TextInput style={s.input} value={form.state} onChangeText={(v) => setForm(f => ({ ...f, state: v }))} placeholder="e.g. FL" />

          <Text style={s.label}>Bio / Description</Text>
          <TextInput style={[s.input, { height: 100 }]} value={form.bio} onChangeText={(v) => setForm(f => ({ ...f, bio: v }))} placeholder="Tell pet owners about your services..." multiline />

          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={editAvail} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} contentContainerStyle={s.modalContent}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Availability</Text>
            <TouchableOpacity onPress={() => setEditAvail(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 20, lineHeight: 19 }}>
            Set the days and hours you accept bookings. Pet owners will only see available slots when booking.
          </Text>

          {DAYS.map((day) => {
            const a = availForm[day] || { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 };
            function updateDay(patch: Record<string, any>) {
              setAvailForm((f) => ({ ...f, [day]: { ...a, ...patch } }));
            }
            return (
              <View key={day} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: a.closed ? "#E2E8F0" : "#4486F4" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: a.closed ? 0 : 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>{DAY_LABELS[day]}</Text>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: a.closed ? "#F1F5F9" : "#4486F4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                    onPress={() => updateDay({ closed: !a.closed })}
                  >
                    <Ionicons name={a.closed ? "close-circle-outline" : "checkmark-circle"} size={14} color={a.closed ? "#94A3B8" : "#fff"} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: a.closed ? "#94A3B8" : "#fff" }}>{a.closed ? "Closed" : "Open"}</Text>
                  </TouchableOpacity>
                </View>

                {!a.closed && (
                  <>
                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Opens</Text>
                        <TextInput
                          style={s.input}
                          value={a.open}
                          onChangeText={(v) => updateDay({ open: v })}
                          placeholder="09:00"
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>Closes</Text>
                        <TextInput
                          style={s.input}
                          value={a.close}
                          onChangeText={(v) => updateDay({ close: v })}
                          placeholder="17:00"
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                    </View>
                    <Text style={s.label}>Slot Duration</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {SLOT_OPTIONS.map((min) => (
                        <TouchableOpacity
                          key={min}
                          style={[s.chip, a.slotMinutes === min && s.chipActive, { flex: 1, justifyContent: "center", marginRight: 0 }]}
                          onPress={() => updateDay({ slotMinutes: min })}
                        >
                          <Text style={[s.chipText, a.slotMinutes === min && s.chipTextActive]}>{min} min</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={s.saveBtn} onPress={saveAvailability} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Availability</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  infoLabel: { fontSize: 13, color: "#64748B" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1E293B", maxWidth: "60%", textAlign: "right" },
  bioText: { fontSize: 14, color: "#64748B", lineHeight: 20 },
  link: { fontSize: 13, color: "#3B82F6", textDecorationLine: "underline" },
  empty: { fontSize: 13, color: "#94A3B8", fontStyle: "italic" },
  modal: { flex: 1, backgroundColor: "#F5F8FF" },
  modalContent: { padding: 20, paddingBottom: 60 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0", marginRight: 8, backgroundColor: "#fff" },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: BRAND, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
