import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND = "#4486F4";

export default function AdoptScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏠</Text>
        <Text style={styles.title}>Adopt a Pet</Text>
        <Text style={styles.message}>Pet adoption listings coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emoji: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  message: { fontSize: 16, color: "#64748B", textAlign: "center", lineHeight: 24 },
});
