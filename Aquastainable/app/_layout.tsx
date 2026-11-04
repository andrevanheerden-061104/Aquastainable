import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Platform, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { installAuthHeader } from '@/lib/hooks/authHeader';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

if (process.env.EXPO_PUBLIC_DEMO === '1') {
  // Preview mode: sample data instead of the live backend (see demo/demoApi.ts).
  require('../demo/demoApi').installDemoApi();
}

installAuthHeader();

// Web: stop Chrome painting autofilled inputs white/blue; keep our dark fields and light text.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const autofill = document.createElement('style');
  autofill.textContent = [
    'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, textarea:-webkit-autofill {',
    '  -webkit-text-fill-color: #F4F6F8 !important;',
    '  caret-color: #F4F6F8;',
    '  transition: background-color 9999s ease-out 0s;',
    '  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;',
    '}',
  ].join('\n');
  document.head.appendChild(autofill);
}

// Web inside the phone mock-up (build or `npm run web:phone`): the app fills the whole
// phone screen under the drawn status bar and home bar, so tell the safe-area library
// how tall they are. It reads its insets from the padding of a hidden element it adds.
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.self !== window.top) {
  const style = document.createElement('style');
  style.textContent = 'body > div[style*="transition-property: padding"]{padding-top:50px !important;padding-bottom:28px !important;}';
  document.head.appendChild(style);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold });

  if (!fontsLoaded) return null;

  if (!Text.defaultProps) Text.defaultProps = {} as any;
  Text.defaultProps.style = { ...(Text.defaultProps.style || {}), fontFamily: 'Montserrat_400Regular' } as any;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="loading" />
        <Stack.Screen name="verify" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
