import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useRef } from "react";
import { usePlan } from "@/hooks/usePlan";
import { useRouter } from "expo-router";
import { auth } from "@/lib/firebase";

const BRAND = "#4C6EF5";
const AI_PROXY_URL = "https://us-central1-mypetdex-c4315.cloudfunctions.net/aiProxy";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Is my dog's diet healthy?",
  "Signs of illness in cats",
  "How often should I deworm?",
  "Best flea prevention?",
];

export default function AIVetScreen() {
  const { aiAssistant, loading: planLoading } = usePlan();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! I'm your MyPetDex Assistant 🐾 Ask me anything about your pet's health, nutrition, or behavior." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Show upgrade wall for free users
  if (!planLoading && !aiAssistant) {
    return (
      <View style={styles.upgradeWall}>
        <Text style={styles.upgradeEmoji}>🤖</Text>
        <Text style={styles.upgradeTitle}>MyPetDex Assistant</Text>
        <Text style={styles.upgradeDesc}>
          Get instant answers about your pet's health, nutrition, and behavior from MyPetDex Assistant.
        </Text>
        <Pressable style={styles.upgradeBtn} onPress={() => router.push("/settings/subscription")}>
          <Text style={styles.upgradeBtnText}>Upgrade to Plus — $2.99/mo</Text>
        </Pressable>
        <Text style={styles.upgradeNote}>Included in Plus and Family plans</Text>
      </View>
    );
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Get Firebase ID token — proves the user is logged in and lets the server check their plan
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      // Build conversation history (last 10 messages to keep context but limit cost)
      const history = [...messages.slice(-10), userMsg].map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const response = await fetch(AI_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const reply = data.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please check your connection and try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}>
            {msg.role === "assistant" && <Text style={styles.aiLabel}>🐾 MyPetDex Assistant</Text>}
            <Text style={[styles.bubbleText, msg.role === "user" && styles.userText]}>{msg.text}</Text>
          </View>
        ))}
        {loading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiLabel}>🐾 MyPetDex Assistant</Text>
            <Text style={styles.bubbleText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.suggestions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SUGGESTIONS.map((s, i) => (
            <Pressable key={i} style={styles.suggestion} onPress={() => sendMessage(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your pet..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={() => sendMessage(input)}>
          <Text style={styles.sendBtnText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  bubble: { maxWidth: "85%", borderRadius: 16, padding: 14 },
  aiBubble: { backgroundColor: "#fff", alignSelf: "flex-start", borderWidth: 1, borderColor: "#eee" },
  userBubble: { backgroundColor: BRAND, alignSelf: "flex-end" },
  aiLabel: { fontSize: 11, fontWeight: "600", color: BRAND, marginBottom: 4 },
  bubbleText: { fontSize: 15, color: "#1a1a1a", lineHeight: 22 },
  userText: { color: "#fff" },
  suggestions: { paddingVertical: 10, paddingHorizontal: 16 },
  suggestion: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: "#eee" },
  suggestionText: { fontSize: 13, color: "#555" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee" },
  input: { flex: 1, backgroundColor: "#f8f8f8", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: "#1a1a1a" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#ccc" },
  sendBtnText: { color: "#fff", fontSize: 18 },
  upgradeWall: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#f8f8f8" },
  upgradeEmoji: { fontSize: 64, marginBottom: 16 },
  upgradeTitle: { fontSize: 24, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 },
  upgradeDesc: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  upgradeBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28, width: "100%", alignItems: "center", marginBottom: 12 },
  upgradeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  upgradeNote: { fontSize: 13, color: "#aaa" },
});
