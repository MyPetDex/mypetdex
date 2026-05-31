const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const webStubs = path.join(__dirname, "web-stubs");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    if (moduleName === "@react-native-firebase/auth") return { type: "sourceFile", filePath: path.join(webStubs, "react-native-firebase-auth.js") };
    if (moduleName === "@react-native-firebase/firestore") return { type: "sourceFile", filePath: path.join(webStubs, "react-native-firebase-firestore.js") };
    if (moduleName === "@react-native-firebase/storage") return { type: "sourceFile", filePath: path.join(webStubs, "react-native-firebase-storage.js") };
    if (moduleName === "@react-native-firebase/functions") return { type: "sourceFile", filePath: path.join(webStubs, "react-native-firebase-functions.js") };
    if (moduleName === "@react-native-firebase/app") return { type: "empty" };
    if (moduleName === "@react-native-google-signin/google-signin") return { type: "sourceFile", filePath: path.join(webStubs, "google-signin.js") };
    if (moduleName === "expo-apple-authentication") return { type: "sourceFile", filePath: path.join(webStubs, "apple-authentication.js") };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
