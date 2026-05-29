import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { useRouter } from "expo-router";

interface Props {
  visible: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan: "plus" | "family";
}

export default function UpgradePrompt({ visible, onClose, feature, requiredPlan }: Props) {
  const router = useRouter();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>⭐</Text>
          <Text style={styles.title}>Upgrade Required</Text>
          <Text style={styles.desc}>{feature} is available on the {requiredPlan === "plus" ? "Plus ($2.99/mo)" : "Family ($4.99/mo)"} plan and above.</Text>
          <Pressable style={styles.upgradeBtn} onPress={() => { onClose(); router.push("/settings/subscription"); }}>
            <Text style={styles.upgradeBtnText}>View Plans</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", width: "100%", gap: 12 },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  desc: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22 },
  upgradeBtn: { backgroundColor: "#4CAF82", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center" },
  upgradeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: "#888" },
});
