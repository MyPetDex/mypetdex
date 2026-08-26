import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const contentWidth = isTablet ? Math.min(width * 0.75, 900) : width;
  const horizontalPadding = isTablet ? 40 : 16;
  const numColumns = isTablet ? 2 : 1;
  return { width, height, isTablet, contentWidth, horizontalPadding, numColumns };
}
