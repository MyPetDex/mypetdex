/**
 * SkeletonLoader — animated shimmer placeholder while content loads.
 * Uses react-native-reanimated for smooth pulsing.
 */
import { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: "#E5E7EB" },
        animStyle,
        style,
      ]}
    />
  );
}

/** Pre-built skeleton for a pet card */
export function PetCardSkeleton() {
  return (
    <View style={s.card}>
      <SkeletonBox width={64} height={64} borderRadius={32} style={{ marginBottom: 8 }} />
      <SkeletonBox width={80} height={12} borderRadius={6} style={{ marginBottom: 6 }} />
      <SkeletonBox width={60} height={10} borderRadius={5} />
    </View>
  );
}

/** Pre-built skeleton for a list row */
export function ListRowSkeleton() {
  return (
    <View style={s.row}>
      <SkeletonBox width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox height={14} borderRadius={6} />
        <SkeletonBox width="60%" height={11} borderRadius={5} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, margin: 8, width: 120 },
  row:  { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "#fff", borderRadius: 12, marginBottom: 10 },
});
