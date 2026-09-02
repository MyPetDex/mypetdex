# Build: Real-Time Chat Between Pet Owners and Service Providers

## Overview
Add a full messaging system so pet owners can chat with service providers directly inside the app. Uses Firebase Firestore with onSnapshot for real-time updates. No third-party service needed.

---

## Data Model in Firestore

### Collection: `conversations`
Each document represents a conversation between two users.

```
/conversations/{conversationId}
  participants: [uid1, uid2]                        // array of both user UIDs
  participantNames: { uid1: "John", uid2: "Best Grooming" }
  participantRoles: { uid1: "owner", uid2: "provider" }
  participantPhotos: { uid1: "", uid2: "" }         // optional avatar URLs
  lastMessage: "Hey, is 3pm available?"
  lastMessageTime: Timestamp
  lastMessageSenderId: uid
  unreadCount: { uid1: 0, uid2: 1 }                // per-user unread count
  createdAt: Timestamp
```

### Subcollection: `conversations/{conversationId}/messages`
```
/conversations/{conversationId}/messages/{messageId}
  text: "Hey, is 3pm available?"
  senderId: uid
  senderName: "John"
  timestamp: Timestamp
  read: false
```

---

## Firestore Rules to add

Add to `firestore.rules` inside the main `match /databases/{database}/documents` block:

```js
// Conversations: only participants can read/write
match /conversations/{convId} {
  allow read, create: if isSignedIn();
  allow update: if isSignedIn() && request.auth.uid in resource.data.participants;

  match /messages/{msgId} {
    allow read, create: if isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
  }
}
```

After adding rules, deploy:
```bash
cd ~/mypetdex
firebase deploy --only firestore:rules
```

---

## Files to create

### 1. `hooks/useConversations.ts`
Hook to load all conversations for the current user, ordered by last message time:

```ts
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { webDb } from "@/lib/firebase";
import { useUserProfile } from "@/hooks/useUserProfile";

export function useConversations() {
  const { profile } = useUserProfile();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(webDb, "conversations"),
      where("participants", "array-contains", profile.uid),
      orderBy("lastMessageTime", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [profile?.uid]);

  return { conversations, loading };
}
```

### 2. `app/messages/index.tsx` — Messages Inbox Screen

Full inbox screen showing all conversations. Key elements:
- Header: "Messages"
- FlatList of conversations
- Each row shows: other person's name, last message preview, timestamp, unread count badge (blue circle with number)
- Tapping a row opens the chat screen
- Empty state: "No messages yet. Message a service provider from their profile."
- Use `useConversations()` hook

Conversation row component:
```tsx
function ConvRow({ conv, currentUid, onPress }) {
  const otherUid = conv.participants.find(p => p !== currentUid);
  const otherName = conv.participantNames?.[otherUid] || "Provider";
  const unread = conv.unreadCount?.[currentUid] || 0;
  const time = conv.lastMessageTime?.toDate();
  const timeStr = time ? formatTime(time) : "";

  return (
    <Pressable onPress={onPress} style={styles.convRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{otherName[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.convName}>{otherName}</Text>
          <Text style={styles.convTime}>{timeStr}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.convLast} numberOfLines={1}>{conv.lastMessage || "Start a conversation"}</Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
```

### 3. `app/messages/[id].tsx` — Chat Screen

Full chat screen for a single conversation. Key elements:

```tsx
import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { webDb } from "@/lib/firebase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ChatScreen() {
  const { id: convId, otherName, otherUid } = useLocalSearchParams();
  const { profile } = useUserProfile();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Load messages in real-time
  useEffect(() => {
    if (!convId) return;
    const q = query(
      collection(webDb, "conversations", convId as string, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Mark as read
      markAsRead();
    });
    return unsub;
  }, [convId]);

  async function markAsRead() {
    if (!profile?.uid || !convId) return;
    await updateDoc(doc(webDb, "conversations", convId as string), {
      [`unreadCount.${profile.uid}`]: 0,
    });
  }

  async function sendMessage() {
    if (!text.trim() || !profile?.uid || !convId) return;
    const msgText = text.trim();
    setText("");

    // Add message
    await addDoc(collection(webDb, "conversations", convId as string, "messages"), {
      text: msgText,
      senderId: profile.uid,
      senderName: profile.displayName || "User",
      timestamp: serverTimestamp(),
      read: false,
    });

    // Update conversation last message + increment other user's unread
    await updateDoc(doc(webDb, "conversations", convId as string), {
      lastMessage: msgText,
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: profile.uid,
      [`unreadCount.${otherUid}`]: (messages.filter(m => m.senderId !== profile.uid).length) + 1,
    });

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f8f9fa" }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMine = item.senderId === profile?.uid;
          return (
            <View style={{ alignItems: isMine ? "flex-end" : "flex-start" }}>
              <View style={{
                backgroundColor: isMine ? "#4486F4" : "#fff",
                borderRadius: 16,
                borderBottomRightRadius: isMine ? 4 : 16,
                borderBottomLeftRadius: isMine ? 16 : 4,
                padding: 12,
                maxWidth: "75%",
                shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
              }}>
                <Text style={{ color: isMine ? "#fff" : "#1a1a1a", fontSize: 15 }}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />
      {/* Input bar */}
      <View style={{ flexDirection: "row", padding: 12, gap: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee" }}>
        <TextInput
          style={{ flex: 1, backgroundColor: "#f1f5f9", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 }}
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <Pressable
          onPress={sendMessage}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? "#4486F4" : "#e2e8f0", alignItems: "center", justifyContent: "center" }}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color={text.trim() ? "#fff" : "#aaa"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
```

---

## Files to edit

### 4. `app/provider/[id].tsx` — Add "Message" button

Find the provider detail screen. Add a "Message" button in the header or action area:

```tsx
import { getDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "expo-router";

const router = useRouter();

async function openChat() {
  if (!profile?.uid) return;
  // Create or find existing conversation
  const participants = [profile.uid, providerId].sort();
  const convId = participants.join("_");
  const convRef = doc(webDb, "conversations", convId);
  const existing = await getDoc(convRef);

  if (!existing.exists()) {
    await setDoc(convRef, {
      participants,
      participantNames: {
        [profile.uid]: profile.displayName || "Pet Owner",
        [providerId]: providerName,
      },
      participantRoles: {
        [profile.uid]: "owner",
        [providerId]: "provider",
      },
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: "",
      unreadCount: { [profile.uid]: 0, [providerId]: 0 },
      createdAt: serverTimestamp(),
    });
  }

  router.push({
    pathname: "/messages/[id]",
    params: { id: convId, otherName: providerName, otherUid: providerId },
  });
}

// Add this button in the UI (near the phone/website buttons):
<Pressable onPress={openChat} style={styles.messageBtn}>
  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
  <Text style={styles.messageBtnText}>Message</Text>
</Pressable>
```

### 5. `app/(tabs)/_layout.tsx` — Add Messages tab

Add a Messages tab to the bottom tab bar with an unread badge:

```tsx
import { useConversations } from "@/hooks/useConversations";

// Inside the tab layout component:
const { conversations } = useConversations();
const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount?.[profile?.uid] || 0), 0);

// Add tab:
<Tabs.Screen
  name="messages"
  options={{
    title: "Messages",
    tabBarIcon: ({ color, size }) => (
      <View>
        <Ionicons name="chatbubbles-outline" size={size} color={color} />
        {totalUnread > 0 && (
          <View style={{ position: "absolute", top: -4, right: -8, backgroundColor: "#ef4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{totalUnread > 9 ? "9+" : totalUnread}</Text>
          </View>
        )}
      </View>
    ),
  }}
/>
```

---

## Push Notifications for new messages

Add to `functions/index.js` a new Cloud Function that fires when a message is created:

```js
exports.onNewMessage = onDocumentCreated(
  "conversations/{convId}/messages/{msgId}",
  async (event) => {
    const { onDocumentCreated } = require("firebase-functions/v2/firestore");
    const message = event.data.data();
    const convId = event.params.convId;

    // Get conversation to find the other participant
    const convDoc = await db.collection("conversations").doc(convId).get();
    const conv = convDoc.data();
    const receiverId = conv.participants.find(p => p !== message.senderId);

    // Get receiver's FCM token
    const receiverDoc = await db.collection("users").doc(receiverId).get();
    const fcmToken = receiverDoc.data()?.fcmToken;
    if (!fcmToken) return;

    // Send push notification
    const { getMessaging } = require("firebase-admin/messaging");
    await getMessaging().send({
      token: fcmToken,
      notification: {
        title: message.senderName,
        body: message.text,
      },
      data: {
        type: "new_message",
        convId,
        senderName: message.senderName,
        senderId: message.senderId,
      },
    });
  }
);
```

Deploy:
```bash
firebase deploy --only functions:onNewMessage
```

---

## What NOT to change
- Do not change auth flow, Stripe, Resend, or any other Cloud Functions
- Do not touch `firestore.rules` other than adding the conversations block
- Do not change any pet profile, shop, or explore screens
- Keep the existing tab structure — just add one new tab

---

## After applying
Test flow:
1. Log in as a pet owner → go to a provider profile → tap "Message"
2. Send a message → it should appear instantly
3. Log in as the provider on another device/account → should see the message in Messages tab
4. Reply → owner should get a push notification
