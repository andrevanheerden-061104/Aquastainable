// Metro config. When EXPO_PUBLIC_DEMO=1 the app swaps Firebase Auth for a local
// demo user so the UI can be previewed (e.g. on the web) without the backend.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.EXPO_PUBLIC_DEMO === '1') {
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'firebase/auth') {
      return { type: 'sourceFile', filePath: path.resolve(__dirname, 'demo/firebaseAuthDemo.ts') };
    }
    return (upstream || context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
