const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
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
