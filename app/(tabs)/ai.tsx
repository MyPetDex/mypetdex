import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useState, useRef } from "react";
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from "react-native-reanimated";
import { usePlan } from "@/hooks/usePlan";
import { useRouter } from "expo-router";
import { askPetDexAI, type ChatMessage } from "@/lib/ai";

const BRAND = "#4486F4";
const BRAND_LIGHT = "#EEF4FF";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "🐕 Is my dog's diet healthy?",
  "🐈 Signs of illness in cats",
  "💉 How often should I deworm?",
  "🦟 Best flea prevention?",
  "🦷 How to brush my pet's teeth?",
  "🏃 How much exercise does my pet need?",
];

export default function AIVetScreen() {
  const { aiAssistant, loading: planLoading } = usePlan();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! I'm PetDex AI 🐾 Ask me anything about your pet's health, nutrition, or behavior. I'm here to help!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Upgrade wall for free users
  if (!planLoading && !aiAssistant) {
    return (
      <View style={styles.upgradeWall}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.upgradeEmoji}>🤖</Text>
          <Text style={styles.upgradeTitle}>PetDex AI Assistant</Text>
          <Text style={styles.upgradeDesc}>
            Get instant answers about your pet's health, nutrition, and behavior — powered by AI, guided by veterinary knowledge.
          </Text>
          <Pressable style={styles.upgradeBtn} onPress={() => router.push("/settings/subscription")}>
            <Text style={styles.upgradeBtnText}>Upgrade to Plus — $2.99/mo</Text>
          </Pressable>
          <Text style={styles.upgradeNote}>Included in Plus and Family plans</Text>
        </Animated.View>
      </View>
    );
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      // Build message history for context (last 10 messages)
      const history: ChatMessage[] = updatedMessages
        .slice(-10)
        .map(m => ({ role: m.role, content: m.text }));

      const reply = await askPetDexAI(history);
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Sorry, something went wrong. Please check your connection and try again. 🐾"
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <Animated.View
            key={i}
            entering={msg.role === "user"
              ? FadeInRight.duration(300)
              : FadeInLeft.duration(300)}
            style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}
          >
            {msg.role === "assistant" && (
              <Text style={styles.aiLabel}>🐾 PetDex AI</Text>
            )}
            <Text style={[styles.bubbleText, msg.role === "user" && styles.userText]}>
              {msg.text}
            </Text>
          </Animated.View>
        ))}

        {/* Typing indicator */}
        {loading && (
          <Animated.View entering={FadeInLeft.duration(200)} style={styles.aiBubble}>
            <Text style={styles.aiLabel}>🐾 PetDex AI</Text>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <View style={styles.suggestions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {SUGGESTIONS.map((s, i) => (
              <Pressable key={i} style={styles.suggestion} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your pet..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendBtnText}>➤</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: "#F8FAFF" },
  messages:           { flex: 1 },
  messagesContent:    { padding: 16, gap: 12, paddingBottom: 8 },

  bubble:             { maxWidth: "85%", borderRadius: 18, padding: 14 },
  aiBubble:           { backgroundColor: "#fff", alignSelf: "flex-start", borderWidth: 1, borderColor: "#E8EFFF", shadowColor: "#4486F4", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  userBubble:         { backgroundColor: BRAND, alignSelf: "flex-end" },
  aiLabel:            { fontSize: 11, fontWeight: "700", color: BRAND, marginBottom: 5, letterSpacing: 0.3 },
  bubbleText:         { fontSize: 15, color: "#1a1a1a", lineHeight: 22 },
  userText:           { color: "#fff" },

  typingDots:         { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText:         { fontSize: 14, color: "#999" },

  suggestions:        { paddingVertical: 10 },
  suggestion:         { backgroundColor: BRAND_LIGHT, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BRAND + "33" },
  suggestionText:     { fontSize: 13, color: BRAND, fontWeight: "600" },

  inputRow:           { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee" },
  input:              { flex: 1, backgroundColor: "#F8FAFF", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: "#1a1a1a", borderWidth: 1, borderColor: "#E8EFFF" },
  sendBtn:            { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled:    { backgroundColor: "#C7D7FF" },
  sendBtnText:        { color: "#fff", fontSize: 18 },

  upgradeWall:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#F8FAFF" },
  upgradeEmoji:       { fontSize: 64, marginBottom: 16, textAlign: "center" },
  upgradeTitle:       { fontSize: 24, fontWeight: "800", color: "#1a1a1a", marginBottom: 12, textAlign: "center" },
  upgradeDesc:        { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  upgradeBtn:         { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 28, alignItems: "center", marginBottom: 12 },
  upgradeBtnText:     { color: "#fff", fontSize: 16, fontWeight: "700" },
  upgradeNote:        { fontSize: 13, color: "#aaa", textAlign: "center" },
});
