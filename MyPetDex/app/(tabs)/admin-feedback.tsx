import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";

const BRAND = "#4486F4";
const ADMIN_EMAIL = "mypetdexapp@gmail.com";

type FeedbackItem = {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: any;
};

const SUBJECT_COLORS: Record<string, string> = {
  "Bug Report":       "#FEE2E2",
  "Feature Request":  "#DBEAFE",
  "Account Issue":    "#FEF3C7",
  "General Feedback": "#DCFCE7",
  "Other":            "#F1F5F9",
};
const SUBJECT_TEXT: Record<string, string> = {
  "Bug Report":       "#991B1B",
  "Feature Request":  "#1E40AF",
  "Account Issue":    "#92400E",
  "General Feedback": "#166534",
  "Other":            "#475569",
};

export default function AdminFeedback() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) { setLoading(false); return; }
    load();
  }, [user]);

  async function load() {
    try {
      const snap = await getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc")));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackItem)));
    } finally { setLoading(false); }
  }

  async function markRead(id: string) {
    await updateDoc(doc(db, "feedback", id), { read: true });
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "feedback", id));
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
    const item = items.find(i => i.id === id);
    if (item && !item.read) markRead(id);
  }

  function formatDate(ts: any) {
    if (!ts?.seconds) return "";
    return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;
  if (!isAdmin) return <View style={s.center}><Text style={s.noAccess}>Access Restricted</Text></View>;

  const unread = items.filter(i => !i.read).length;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>User Feedback</Text>
      <Text style={s.subtitle}>
        {unread > 0 ? `${unread} unread · ` : ""}{items.length} total message{items.length !== 1 ? "s" : ""}
      </Text>

      {items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyText}>No feedback yet</Text>
          <Text style={s.emptySubtext}>Messages from users will appear here</Text>
        </View>
      ) : (
        items.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[s.card, !item.read && s.cardUnread]}
            onPress={() => toggle(item.id)}
            activeOpacity={0.85}
          >
            <View style={s.cardTop}>
              <View style={[
                s.badge,
                { backgroundColor: SUBJECT_COLORS[item.subject] || "#F1F5F9" }
              ]}>
                <Text style={[s.badgeText, { color: SUBJECT_TEXT[item.subject] || "#475569" }]}>
                  {item.subject}
                </Text>
              </View>
              {!item.read && <View style={s.unreadDot} />}
              <Text style={s.date}>{formatDate(item.createdAt)}</Text>
            </View>

            <Text style={s.email}>{item.userEmail || "Anonymous"}</Text>

            {expanded === item.id ? (
              <>
                <Text style={s.message}>{item.message}</Text>
                <TouchableOpacity style={s.deleteBtn} onPress={() => remove(item.id)}>
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={s.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={s.preview} numberOfLines={2}>{item.message}</Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  noAccess: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 20, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  emptySubtext: { fontSize: 14, color: "#CBD5E1" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND },
  date: { marginLeft: "auto", fontSize: 11, color: "#94A3B8" },
  email: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  preview: { fontSize: 14, color: "#475569", lineHeight: 20 },
  message: { fontSize: 14, color: "#1E293B", lineHeight: 21, marginTop: 4 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 6,
    padding: 6,
  },
  deleteBtnText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
});
