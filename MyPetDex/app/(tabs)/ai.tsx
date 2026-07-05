import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useEffect, useMemo } from "react";
import { usePlan } from "@/hooks/usePlan";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const BRAND = "#4C6EF5";
const AI_PROXY_URL = "https://us-central1-mypetdex-c4315.cloudfunctions.net/aiProxy";

type Message = { role: "user" | "assistant"; text: string };

type Pet = {
  id: string;
  name?: string;
  species?: string;
  type?: string;
  breed?: string;
  age?: string | number;
  weight?: string | number;
  weightUnit?: string;
};

function getFirstName(profile: { displayName?: string; name?: string } | null): string {
  const raw = profile?.displayName || profile?.name || "there";
  if (raw === "there") return raw;
  return raw.split(" ")[0] || raw;
}

function formatPetAge(pet: Pet): string {
  const age = pet.age;
  if (age == null || age === "") return "";
  const s = String(age);
  if (/year|month|week|old/i.test(s)) return s;
  return `${s} year${s === "1" ? "" : "s"} old`;
}

function formatPetWeight(pet: Pet): string {
  if (pet.weight == null || pet.weight === "") return "";
  return `${pet.weight} ${pet.weightUnit || "lbs"}`;
}

function petBreedLabel(pet: Pet): string {
  return pet.breed || String(pet.species || pet.type || "pet");
}

function buildPetContext(pet: Pet) {
  return {
    name: pet.name || "your pet",
    species: String(pet.species || pet.type || "Unknown"),
    breed: pet.breed || "Unknown",
    age: formatPetAge(pet) || "Unknown",
    weight: formatPetWeight(pet) || "Unknown",
  };
}

export default function AIVetScreen() {
  const { aiAssistant, loading: planLoading } = usePlan();
  const { profile, loading: profileLoading } = useUserProfile();
  const { user } = useAuth();
  const router = useRouter();

  const firstName = useMemo(() => getFirstName(profile), [profile]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setPetsLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "pets"),
      (snap) => {
        setPets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pet)));
        setPetsLoading(false);
      },
      () => setPetsLoading(false),
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (petsLoading || profileLoading || initRef.current) return;
    initRef.current = true;

    if (pets.length === 0) {
      setMessages([{
        role: "assistant",
        text: `Hi ${firstName}! 🐾 I'm your MyPetDex Assistant. It looks like you haven't added a pet yet — add one in the Pets tab and I can give you personalized advice!`,
      }]);
      return;
    }

    if (pets.length === 1) {
      const pet = pets[0];
      setSelectedPet(pet);
      const age = formatPetAge(pet);
      const breed = petBreedLabel(pet);
      const agePart = age ? `${age} ` : "";
      setMessages([{
        role: "assistant",
        text: `Hi ${firstName}! 🐾 I'm your MyPetDex Assistant. I'm here to help with ${pet.name}, your ${agePart}${breed}. What can I help you with today?`,
      }]);
      return;
    }

    setMessages([{
      role: "assistant",
      text: `Hi ${firstName}! 🐾 Which pet do you need help with today?`,
    }]);
  }, [petsLoading, profileLoading, pets, firstName]);

  const suggestions = selectedPet
    ? [
        `Is ${selectedPet.name}'s diet healthy?`,
        `Exercise for ${selectedPet.breed || petBreedLabel(selectedPet)}?`,
        "Signs of illness to watch for?",
        "Vaccination schedule?",
      ]
    : [];

  const showPicker = !petsLoading && pets.length >= 2 && !selectedPet;
  const showChatInput = pets.length === 0 || pets.length === 1 || selectedPet !== null;

  // Show upgrade wall for free users
  if (!planLoading && !aiAssistant) {
    return (
      <View style={styles.upgradeWall}>
        <Ionicons name="sparkles-outline" size={64} color={BRAND} style={{ marginBottom: 16 }} />
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

  function selectPet(pet: Pet) {
    setSelectedPet(pet);
    const ageLabel = pet.age != null && pet.age !== "" ? String(pet.age) : "unknown age";
    const breed = petBreedLabel(pet);
    const weight = formatPetWeight(pet) || "unknown weight";
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: `Got it! Here's what I know about ${pet.name}: ${ageLabel} old ${breed}, ${weight}. What can I help you with today? 🐾`,
      },
    ]);
  }

  function switchPet() {
    setSelectedPet(null);
    setMessages([{
      role: "assistant",
      text: `Hi ${firstName}! 🐾 Which pet do you need help with today?`,
    }]);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const history = [...messages.slice(-10), userMsg].map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const body: { messages: typeof history; petContext?: ReturnType<typeof buildPetContext> } = { messages: history };
      if (selectedPet) {
        body.petContext = buildPetContext(selectedPet);
      }

      const response = await fetch(AI_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const reply = data.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please check your connection and try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  if (planLoading || petsLoading || profileLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={BRAND} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {selectedPet && pets.length >= 2 ? (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Helping: {selectedPet.name}</Text>
          <Pressable style={styles.switchBtn} onPress={switchPet}>
            <Text style={styles.switchBtnText}>Switch pet</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}>
            {msg.role === "assistant" && (
              <View style={styles.aiLabelRow}>
                <Ionicons name="paw-outline" size={11} color={BRAND} />
                <Text style={styles.aiLabel}>MyPetDex Assistant</Text>
              </View>
            )}
            <Text style={[styles.bubbleText, msg.role === "user" && styles.userText]}>{msg.text}</Text>
          </View>
        ))}
        {loading && (
          <View style={styles.aiBubble}>
            <View style={styles.aiLabelRow}>
              <Ionicons name="paw-outline" size={11} color={BRAND} />
              <Text style={styles.aiLabel}>MyPetDex Assistant</Text>
            </View>
            <Text style={styles.bubbleText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {showPicker ? (
        <View style={styles.pickerSection}>
          {pets.map((pet) => (
            <Pressable key={pet.id} style={styles.petPickerBtn} onPress={() => selectPet(pet)}>
              <Ionicons name="paw-outline" size={28} color={BRAND} />
              <Text style={styles.petPickerName}>{pet.name || "Pet"}</Text>
              <Text style={styles.petPickerMeta}>{petBreedLabel(pet)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {showChatInput && suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions.map((s, i) => (
              <Pressable key={i} style={styles.suggestion} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showChatInput ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={selectedPet ? `Ask about ${selectedPet.name}...` : "Ask about your pet..."}
            placeholderTextColor="#aaa"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={() => sendMessage(input)}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8f8f8" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  switchLabel: { fontSize: 13, fontWeight: "600", color: "#555" },
  switchBtn: {
    backgroundColor: BRAND + "15",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BRAND + "44",
  },
  switchBtnText: { fontSize: 13, fontWeight: "700", color: BRAND },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  bubble: { maxWidth: "85%", borderRadius: 16, padding: 14 },
  aiBubble: { backgroundColor: "#fff", alignSelf: "flex-start", borderWidth: 1, borderColor: "#eee" },
  userBubble: { backgroundColor: BRAND, alignSelf: "flex-end" },
  aiLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  aiLabel: { fontSize: 11, fontWeight: "600", color: BRAND },
  bubbleText: { fontSize: 15, color: "#1a1a1a", lineHeight: 22 },
  userText: { color: "#fff" },
  pickerSection: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  petPickerBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: 1.5,
    borderColor: BRAND + "44",
    alignItems: "center",
    gap: 4,
  },
  petPickerEmoji: { fontSize: 28 },
  petPickerName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  petPickerMeta: { fontSize: 12, color: "#888" },
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
