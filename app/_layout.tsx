import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { materialTheme } from "@/constants/material-theme";
import { PricingProvider } from "@/contexts/pricing/pricing-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: materialTheme.colors.background,
      border: materialTheme.colors.border,
      card: materialTheme.colors.surface,
      primary: materialTheme.colors.primary,
      text: materialTheme.colors.text,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <PricingProvider>
        <Stack screenOptions={{ animation: "fade", headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="vendor" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{
              headerShown: true,
              presentation: "modal",
              title: "Details",
            }}
          />
        </Stack>
        <StatusBar style="dark" />
      </PricingProvider>
    </ThemeProvider>
  );
}
