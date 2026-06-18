const path = require("path");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);
const webStubs = path.join(__dirname, "web-stubs");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    if (moduleName === "expo-apple-authentication") {
      return { type: "sourceFile", filePath: path.join(webStubs, "apple-authentication.js") };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;