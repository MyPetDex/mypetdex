import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ActionSheetIOS } from "react-native";
import { webDb } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4486F4";
const SERVICE_TYPES = ["Grooming", "Dog Walking", "Veterinary", "Training", "Boarding", "Daycare", "Pet Sitting", "Photography", "Other"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function nextOccurrence(dayName: string): string {
  const dayIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(dayName);
  const today = new Date();
  const todayIndex = today.getDay();
  let daysUntil = dayIndex - todayIndex;
  if (daysUntil < 0) daysUntil += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
const SLOT_OPTIONS = [30, 60, 90];

// ── Time picker helpers ────────────────────────────────────────────────────────
const HOURS_12 = ["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];
const MINUTES_OPTS = ["00", "15", "30", "45"];
const AMPM_OPTS = ["AM", "PM"];

function to12h(time24: string): { h: string; m: string; ap: string } {
  const [hStr, mStr] = (time24 || "09:00").split(":");
  let h = parseInt(hStr || "9", 10);
  if (isNaN(h)) h = 9;
  const m = (mStr || "00").slice(0, 2);
  const ap = h < 12 ? "AM" : "PM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { h: String(h).padStart(2, "0"), m, ap };
}

function to24h(h: string, m: string, ap: string): string {
  let hour = parseInt(h, 10);
  if (ap === "AM" && hour === 12) hour = 0;
  else if (ap === "PM" && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${m}`;
}

function TimeSlotPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { h, m, ap } = to12h(value);

  function pickHour() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", ...HOURS_12], cancelButtonIndex: 0, title: "Select Hour" },
        (idx) => { if (idx > 0) onChange(to24h(HOURS_12[idx - 1], m, ap)); }
      );
    }
  }
  function pickMinute() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", ...MINUTES_OPTS], cancelButtonIndex: 0, title: "Select Minutes" },
        (idx) => { if (idx > 0) onChange(to24h(h, MINUTES_OPTS[idx - 1], ap)); }
      );
    }
  }
  function pickAP() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "AM", "PM"], cancelButtonIndex: 0, title: "AM / PM" },
        (idx) => { if (idx > 0) onChange(to24h(h, m, ["AM", "PM"][idx - 1])); }
      );
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
        <Pressable style={s.timePill} onPress={pickHour}>
          <Text style={s.timePillText}>{h}</Text>
          <Text style={s.timePillArrow}>▾</Text>
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#475569" }}>:</Text>
        <Pressable style={s.timePill} onPress={pickMinute}>
          <Text style={s.timePillText}>{m}</Text>
          <Text style={s.timePillArrow}>▾</Text>
        </Pressable>
        <Pressable style={s.timePill} onPress={pickAP}>
          <Text style={s.timePillText}>{ap}</Text>
          <Text style={s.timePillArrow}>▾</Text>
        </Pressable>
      </View>
    </View>
  );
}
const CAL_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function isDayOpen(dayAvail: any): boolean {
  if (!dayAvail || dayAvail.closed) return false;
  if (dayAvail.slots?.length) return true;
  return Boolean(dayAvail.open && dayAvail.close);
}

function generateCalendarDays(availability: any): { date: string; label: string; dayName: string; isOpen: boolean }[] {
  const result: { date: string; label: string; dayName: string; isOpen: boolean }[] = [];
  const today = new Date();
  for (let i = 0; i <= 27; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = CAL_DAYS[d.getDay()];
    const isOpen = isDayOpen(availability?.[dayName]);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    result.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      dayName,
      isOpen,
    });
  }
  return result;
}

function defaultAvailability() {
  const avail: Record<string, any> = {};
  DAYS.forEach((d) => {
    avail[d] = {
      closed: d === "sunday",
      slots: [{ open: "09:00", close: "17:00" }],
      slotMinutes: 60,
    };
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
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [selectedCalDate, setSelectedCalDate] = useState<string>("");
  const [dayBookings, setDayBookings] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadProfile();
  }, [user]);

  useEffect(() => {
    setCalendarDays(generateCalendarDays(availability));
  }, [availability]);

  async function loadProfile() {
    try {
      const snap = await getDoc(doc(webDb, "users", user!.uid));
      if (snap.exists()) {
        const d = snap.data();
        setProfile(d);
        setAvailability(d.availability || defaultAvailability());
        setAvailForm(d.availability || defaultAvailability());
        setBlockedDates(d.blockedDates || []);
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

  async function loadDayBookings(date: string) {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(
          collection(webDb, "bookings"),
          where("providerId", "==", user.uid),
          where("date", "==", date),
        )
      );
      setDayBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("loadDayBookings error:", e);
      setDayBookings([]);
    }
  }

  async function toggleBlockDate(date: string) {
    if (!user) return;
    const isBlocked = blockedDates.includes(date);
    const updated = isBlocked
      ? blockedDates.filter((d) => d !== date)
      : [...blockedDates, date];
    setBlockedDates(updated);
    try {
      await updateDoc(doc(webDb, "users", user.uid), { blockedDates: updated });
    } catch {
      Alert.alert("Error", "Could not update blocked dates.");
      setBlockedDates(blockedDates);
    }
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

  function addSlot(day: string) {
    setAvailForm((f) => {
      const a = f[day];
      const slots = a.slots || [{ open: a.open || "09:00", close: a.close || "17:00" }];
      return { ...f, [day]: { ...a, slots: [...slots, { open: "09:00", close: "17:00" }] } };
    });
  }

  function removeSlot(day: string, index: number) {
    setAvailForm((f) => {
      const a = f[day];
      const slots = (a.slots || []).filter((_: any, i: number) => i !== index);
      return { ...f, [day]: { ...a, slots } };
    });
  }

  function updateSlot(day: string, index: number, patch: Record<string, string>) {
    setAvailForm((f) => {
      const a = f[day];
      const slots = (a.slots || []).map((s: any, i: number) => i === index ? { ...s, ...patch } : s);
      return { ...f, [day]: { ...a, slots } };
    });
  }

  function updateDay(day: string, patch: Record<string, any>) {
    setAvailForm((f) => ({ ...f, [day]: { ...f[day], ...patch } }));
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

      {/* Schedule Calendar */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 10 }}>
          Schedule
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {calendarDays.map((day) => {
            const isBlocked = blockedDates.includes(day.date);
            const isSelected = selectedCalDate === day.date;
            const bgColor = isBlocked ? "#FEE2E2" : isSelected ? "#4486F4" : day.isOpen ? "#fff" : "#F8FAFC";
            const textColor = isBlocked ? "#991B1B" : isSelected ? "#fff" : day.isOpen ? "#1E293B" : "#CBD5E1";
            return (
              <Pressable
                key={day.date}
                onPress={() => { setSelectedCalDate(day.date); loadDayBookings(day.date); }}
                style={{
                  marginRight: 8, padding: 10, borderRadius: 14, alignItems: "center",
                  backgroundColor: bgColor, borderWidth: 1,
                  borderColor: isSelected ? "#4486F4" : isBlocked ? "#FCA5A5" : "#E2E8F0",
                  minWidth: 64, opacity: day.isOpen || isBlocked ? 1 : 0.4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: textColor }}>
                  {day.label.split(" ")[0].toUpperCase()}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: textColor }}>
                  {day.label.split(" ")[2]}
                </Text>
                <Text style={{ fontSize: 10, color: textColor }}>{day.label.split(" ")[1]}</Text>
                {isBlocked ? (
                  <Text style={{ fontSize: 9, color: "#991B1B", fontWeight: "700" }}>BLOCKED</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedCalDate ? (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>
                {calendarDays.find((d) => d.date === selectedCalDate)?.label}
              </Text>
              <Pressable
                onPress={() => toggleBlockDate(selectedCalDate)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: blockedDates.includes(selectedCalDate) ? "#DCFCE7" : "#FEE2E2",
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: "700",
                  color: blockedDates.includes(selectedCalDate) ? "#166534" : "#991B1B",
                }}>
                  {blockedDates.includes(selectedCalDate) ? "Unblock Day" : "Block Day"}
                </Text>
              </Pressable>
            </View>

            {dayBookings.length === 0 ? (
              <Text style={{ color: "#94A3B8", fontSize: 14 }}>No bookings on this day.</Text>
            ) : (
              dayBookings.map((b: any) => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  confirmed: { bg: "#DCFCE7", text: "#166534" },
                  pending: { bg: "#FEF3C7", text: "#92400E" },
                  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
                };
                const sc = statusColors[b.status] || { bg: "#F1F5F9", text: "#475569" };
                return (
                  <View key={b.id} style={{
                    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
                    flexDirection: "row", alignItems: "center", gap: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: b.status === "confirmed" ? "#22C55E" : b.status === "cancelled" ? "#EF4444" : "#F59E0B",
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>
                        {b.timeSlot || b.time} · {b.clientName || b.ownerName || "Client"}
                      </Text>
                      <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                        {b.petName} · {b.service}
                      </Text>
                      {b.notes ? (
                        <Text style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", marginTop: 2 }}>
                          "{b.notes}"
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: sc.bg }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: sc.text, textTransform: "capitalize" }}>
                        {b.status}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <Text style={{ color: "#94A3B8", fontSize: 14, marginBottom: 16 }}>
            Tap a date to see bookings for that day.
          </Text>
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
          const a = availability[day] || { closed: true, slots: [{ open: "09:00", close: "17:00" }], slotMinutes: 60 };
          return (
            <View key={day} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 13, color: a.closed ? "#CBD5E1" : "#1E293B", fontWeight: "600", width: 130 }}>
                {DAY_LABELS[day]}
                <Text style={{ fontWeight: "400", color: "#64748B" }}> · {nextOccurrence(day)}</Text>
              </Text>
              {a.closed ? (
                <Text style={{ fontSize: 13, color: "#CBD5E1" }}>Closed</Text>
              ) : (
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  {(a.slots || [{ open: a.open, close: a.close }]).map((slot: any, i: number) => (
                    <Text key={i} style={{ fontSize: 13, color: "#64748B" }}>
                      {slot.open} – {slot.close} · {a.slotMinutes}min slots
                    </Text>
                  ))}
                </View>
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
            const a = availForm[day] || { closed: false, slots: [{ open: "09:00", close: "17:00" }], slotMinutes: 60 };
            return (
              <View key={day} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: a.closed ? "#E2E8F0" : "#4486F4" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: a.closed ? 0 : 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B" }}>
                    {DAY_LABELS[day]}
                    <Text style={{ fontSize: 13, fontWeight: "400", color: "#64748B" }}>
                      {" "}· {nextOccurrence(day)}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: a.closed ? "#F1F5F9" : "#4486F4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                    onPress={() => updateDay(day, { closed: !a.closed })}
                  >
                    <Ionicons name={a.closed ? "close-circle-outline" : "checkmark-circle"} size={14} color={a.closed ? "#94A3B8" : "#fff"} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: a.closed ? "#94A3B8" : "#fff" }}>{a.closed ? "Closed" : "Open"}</Text>
                  </TouchableOpacity>
                </View>

                {!a.closed && (
                  <>
                    {(a.slots || [{ open: a.open, close: a.close }]).map((slot: any, si: number) => (
                      <View key={si} style={{ flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "flex-end" }}>
                        <TimeSlotPicker
                          label="Opens"
                          value={slot.open || "09:00"}
                          onChange={(v) => updateSlot(day, si, { open: v })}
                        />
                        <TimeSlotPicker
                          label="Closes"
                          value={slot.close || "17:00"}
                          onChange={(v) => updateSlot(day, si, { close: v })}
                        />
                        {si > 0 && (
                          <TouchableOpacity onPress={() => removeSlot(day, si)} style={{ paddingBottom: 8 }}>
                            <Ionicons name="remove-circle" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={() => addSlot(day)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#4486F4" />
                      <Text style={{ fontSize: 13, color: "#4486F4", fontWeight: "600" }}>Add another time slot</Text>
                    </TouchableOpacity>
                    <Text style={s.label}>Slot Duration</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {SLOT_OPTIONS.map((min) => (
                        <TouchableOpacity
                          key={min}
                          style={[s.chip, a.slotMinutes === min && s.chipActive, { flex: 1, justifyContent: "center", marginRight: 0 }]}
                          onPress={() => updateDay(day, { slotMinutes: min })}
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
  timePill: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  timePillText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  timePillArrow: { fontSize: 10, color: "#94A3B8" },
});
