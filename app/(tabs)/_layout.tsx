import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { materialTheme } from '@/constants/material-theme';
import { CartProvider, useCart } from '@/contexts/cartcontext';

function TabsNavigator() {
  const { itemCount } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: materialTheme.colors.primary,
        tabBarButton: HapticTab,
        tabBarInactiveTintColor: materialTheme.colors.textMuted,
        tabBarLabelStyle: {
          ...materialTheme.typography.caption,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: materialTheme.colors.surface,
          borderTopColor: materialTheme.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 76,
          paddingBottom: Platform.OS === 'ios' ? 20 : 12,
          paddingTop: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="home-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="search-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: materialTheme.colors.terracotta,
            color: materialTheme.colors.white,
          },
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="cart-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="receipt-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <CartProvider>
      <TabsNavigator />
    </CartProvider>
  );
}
