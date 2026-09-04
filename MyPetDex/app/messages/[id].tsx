import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Pressable, FlatList, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, increment, getDocs, where, getDoc,
} from "firebase/firestore";
import { db, webDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const BRAND = "#4486F4";

type ChatStatus = "loading" | "active" | "ended" | "no_booking";

export default function ChatScreen() {
  const { id: convId, otherName, otherUid } = useLocalSearchParams<{
    id: string;
    otherName?: string;
    otherUid?: string;
  }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("loading");
  const flatListRef = useRef<FlatList>(null);

  // Check booking status between the two users
  useEffect(() => {
    if (!user?.uid || !otherUid) {
      setChatStatus("active");
      return;
    }
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      getDocs(query(collection(webDb, "bookings"),
        where("ownerId", "==", user.uid),
        where("providerId", "==", otherUid))),
      getDocs(query(collection(webDb, "bookings"),
        where("ownerId", "==", otherUid),
        where("providerId", "==", user.uid))),
      convId ? getDoc(doc(webDb, "conversations", convId)) : Promise.resolve(null),
    ]).then(([snap1, snap2, convSnap]) => {
      const all = [
        ...snap1.docs.map((d) => ({ id: d.id, ...d.data() as any })),
        ...snap2.docs.map((d) => ({ id: d.id, ...d.data() as any })),
      ];
      const convExists = convSnap?.exists() ?? false;
      const convEnded = convSnap?.exists() ? convSnap.data()?.ended === true : false;

      // Active booking (pending/confirmed and upcoming)?
      const active = all.find((b) =>
        (b.status === "pending" || b.status === "confirmed") && b.date >= today
      );
      if (active) { setChatStatus("active"); return; }

      // Completed within 24 hours?
      const completed = all
        .filter((b) => b.status === "completed" && b.completedAt)
        .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))[0];

      if (completed?.completedAt) {
        const hoursSince = (Date.now() - completed.completedAt.seconds * 1000) / 3_600_000;
        if (hoursSince < 24) { setChatStatus("active"); return; }
      }

      // Stale or missing conversation with no active booking
      if (!convExists || convEnded) {
        setChatStatus("no_booking");
        return;
      }

      setChatStatus("ended");
    }).catch(() => setChatStatus("active")); // fail open — don't block on error
  }, [user?.uid, otherUid, convId]);


  useEffect(() => {
    if (!convId || !user?.uid) return;
    const q = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        updateDoc(doc(db, "conversations", convId), {
          [`unreadCount.${user.uid}`]: 0,
        }).catch(() => {});
      },
      () => setLoading(false)
    );
    return unsub;
  }, [convId, user?.uid]);

  async function deleteConversation() {
    Alert.alert("Delete Chat", "Delete this conversation for you?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!convId || !user?.uid) return;
          try {
            await updateDoc(doc(db, "conversations", convId), {
              [`hiddenBy.${user.uid}`]: true,
            });
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete conversation.");
          }
        },
      },
    ]);
  }

  async function sendMessage() {
    if (!text.trim() || !user?.uid || !convId || sending) return;
    if (chatStatus !== "active") return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    try {
      await addDoc(collection(db, "conversations", convId, "messages"), {
        text: msgText,
        senderId: user.uid,
        senderName: profile?.displayName || profile?.businessName || "User",
        timestamp: serverTimestamp(),
        read: false,
      });

      const updates: Record<string, unknown> = {
        lastMessage: msgText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        [`unreadCount.${user.uid}`]: 0,
      };
      if (otherUid) {
        updates[`unreadCount.${otherUid}`] = increment(1);
      }
      await updateDoc(doc(db, "conversations", convId), updates);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error("sendMessage error:", e);
      setText(msgText);
    } finally {
      setSending(false);
    }
  }

  const canChat = chatStatus === "active";

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.chatHeader}>
        <Pressable onPress={() => router.back()} style={styles.chatBackBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.chatHeaderTitle} numberOfLines={1}>{otherName || "Messages"}</Text>
        <Pressable onPress={deleteConversation} style={styles.chatBackBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={19} color="#EF4444" />
        </Pressable>
      </View>

    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Chat status banner */}
      {chatStatus === "ended" && (
        <View style={styles.statusBanner}>
          <Ionicons name="lock-closed-outline" size={14} color="#92400E" />
          <Text style={styles.statusBannerText}>
            This chat has ended. Book a new service to continue messaging.
          </Text>
        </View>
      )}
      {chatStatus === "no_booking" && (
        <View style={[styles.statusBanner, { backgroundColor: "#FEE2E2" }]}>
          <Ionicons name="calendar-outline" size={14} color="#991B1B" />
          <Text style={[styles.statusBannerText, { color: "#991B1B" }]}>
            No active booking. Book a service to send messages.
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      ) : messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <View style={{
            width: 70, height: 70, borderRadius: 35,
            backgroundColor: "#EFF6FF",
            alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <Ionicons name="chatbubbles-outline" size={34} color={BRAND} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 6 }}>
            {canChat ? "Start the conversation" : "No messages yet"}
          </Text>
          <Text style={{ fontSize: 14, color: "#94A3B8", textAlign: "center" }}>
            {canChat
              ? `Say hello — ${otherName || "the other person"} will be notified.`
              : "Book a service to chat with this provider."}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.uid;
            return (
              <View style={{ alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <View style={{
                  backgroundColor: isMine ? BRAND : "#F4F6FB",
                  borderRadius: 18,
                  borderBottomRightRadius: isMine ? 4 : 18,
                  borderBottomLeftRadius: isMine ? 18 : 4,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  maxWidth: "78%",
                }}>
                  <Text style={{ color: isMine ? "#fff" : "#0F172A", fontSize: 15, lineHeight: 21 }}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={{
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingBottom: 24,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        gap: 10,
      }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: canChat ? "#F4F6FB" : "#F1F5F9",
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            color: canChat ? "#0F172A" : "#94A3B8",
            maxHeight: 120,
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
          placeholder={canChat ? "Type a message..." : "Messaging not available"}
          placeholderTextColor="#94A3B8"
          value={text}
          onChangeText={canChat ? setText : undefined}
          multiline
          returnKeyType="default"
          editable={canChat}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim() || sending || !canChat}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: text.trim() && canChat ? BRAND : "#E2E8F0",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="send" size={18} color={text.trim() && canChat ? "#fff" : "#94A3B8"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  chatBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F4F6FB",
    alignItems: "center", justifyContent: "center",
  },
  chatHeaderTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: BRAND, textAlign: "center", marginHorizontal: 8 },
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  list: { padding: 16, flexGrow: 1 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
    lineHeight: 18,
  },
});
