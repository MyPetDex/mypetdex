import { Platform } from "react-native";

/** True only when running as a web browser (Vercel deployment) */
export const isWeb = Platform.OS === "web";
