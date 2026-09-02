import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { useResponsive } from "@/hooks/useResponsive";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const BRAND = "#4486F4";
const BG = "#F4F6FB";
const TEXT = "#0F172A";
const TEXT2 = "#64748B";

function formatTime(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConvRow({
  conv,
  currentUid,
  convId,
}: {
  conv: any;
  currentUid: string;
  convId: string;
}) {
  const router = useRouter();
  const otherUid = conv.participants?.find((p: string) => p !== currentUid) || "";
  const [resolvedName, setResolvedName] = useState<string>(
    conv.participantNames?.[otherUid] || "User"
  );
  const unread = conv.unreadCount?.[currentUid] || 0;
  const time = conv.lastMessageTime?.toDate?.();
  const timeStr = time ? formatTime(time) : "";

  useEffect(() => {
    const stored = conv.participantNames?.[otherUid] || "";
    if (!stored || stored === "Provider" || stored === "User" || stored === "Pet Owner") {
      getDoc(doc(db, "users", otherUid)).then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const name = d.businessName || d.displayName || d.email?.split("@")[0] || "User";
          setResolvedName(name);
        }
      }).catch(() => {});
    } else {
      setResolvedName(stored);
    }
  }, [otherUid, conv.participantNames]);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/messages/[id]" as any,
          params: { id: convId, otherName: resolvedName, otherUid },
        })
      }
      style={styles.convRow}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{resolvedName[0]?.toUpperCase() || "?"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.convName} numberOfLines={1}>{resolvedName}</Text>
          <Text style={styles.convTime}>{timeStr}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Text style={[styles.convLast, unread > 0 && styles.convLastUnread]} numberOfLines={1}>
            {conv.lastMessage || "Start a conversation"}
          </Text>
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesInboxScreen() {
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const { isTablet, contentWidth } = useResponsive();

  if (!user) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Sign in to view messages</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isTablet && { alignItems: "center" }]}>
      <View style={{ flex: 1, width: isTablet ? contentWidth : "100%" }}>
        {loading ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={conversations.filter((c: any) => !c.hiddenBy?.[user.uid])}
            keyExtractor={(item) => item.id}
            contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>
                  Message a service provider from their profile.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ConvRow
                conv={item}
                currentUid={user.uid}
                convId={item.id}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  list: { paddingVertical: 8 },
  emptyList: { flexGrow: 1 },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: BRAND },
  convName: { fontSize: 16, fontWeight: "700", color: TEXT, flex: 1, marginRight: 8 },
  convTime: { fontSize: 12, color: TEXT2 },
  convLast: { fontSize: 13, color: TEXT2, flex: 1 },
  convLastUnread: { color: TEXT, fontWeight: "600" },
  unreadBadge: {
    backgroundColor: BRAND,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: TEXT, marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, color: TEXT2, textAlign: "center", lineHeight: 20 },
});
