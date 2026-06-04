/**
 * AnimatedPetCard — pet card with spring press animation.
 * Scales down slightly on press for a satisfying native feel.
 */
import { Pressable, View, Text, Image, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  pet: {
    id: string;
    name: string;
    species?: string;
    breed?: string;
    age?: string | number;
    photoURL?: string;
  };
  onPress: () => void;
  index?: number;
  isSelected?: boolean;
  selectedColor?: string;
}

export default function AnimatedPetCard({
  pet, onPress, index = 0, isSelected = false, selectedColor = "#4486F4",
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function onPressIn() { scale.value = withSpring(0.92, { damping: 15 }); }
  function onPressOut() { scale.value = withSpring(1, { damping: 15 }); }

  const emoji = pet.species === "cat" ? "🐱" : "🐶";

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <AnimatedPressable
        style={[s.card, isSelected && { borderColor: selectedColor, borderWidth: 2 }, animStyle]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {pet.photoURL ? (
          <Image source={{ uri: pet.photoURL }} style={s.photo} />
        ) : (
          <View style={s.photoPlaceholder}>
            <Text style={s.emoji}>{emoji}</Text>
          </View>
        )}
        <Text style={s.name} numberOfLines={1}>{pet.name}</Text>
        {pet.breed ? <Text style={s.breed} numberOfLines={1}>{pet.breed}</Text> : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card:            { alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 12, width: 110, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderWidth: 2, borderColor: "transparent" },
  photo:           { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
  photoPlaceholder:{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#F0F8F4", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emoji:           { fontSize: 28 },
  name:            { fontSize: 14, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  breed:           { fontSize: 11, color: "#888", textAlign: "center", marginTop: 2 },
});
