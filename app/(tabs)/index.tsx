import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import {
  categories,
  formatCurrency,
  formatUnitPrice,
  products,
  savedLocations,
  serviceHighlights,
} from "@/constants/material-data";
import { materialTheme } from "@/constants/material-theme";
import {
  ProductIconBadge,
  SectionHeading,
} from "@/components/material-primitives";
import { QuickOrderControls } from "@/components/quick-order";
import { useCart } from "@/contexts/cartcontext";
import { usePricing, useRoleBadge } from "@/contexts/pricing/pricing-context";

function formatPriceForDisplay(productId: string, fallbackUnitPrice: string, quote: ReturnType<typeof usePricing>["quote"]) {
  const line = quote?.lines.find((entry) => entry.productId === productId);
  if (!line) return { primary: fallbackUnitPrice, secondary: null as string | null };
  const primary = `${formatCurrency(line.effectiveUnitPrice)} / ${line.unit}`;
  const secondary =
    line.effectiveUnitPrice + 0.005 < line.basePrice
      ? `Retail ${formatCurrency(line.basePrice)}`
      : null;
  return { primary, secondary };
}

export default function HomeScreen() {
  const router = useRouter();
  const { addToCart, quantitiesById, updateQuantity } = useCart();
  const { quote, requestQuote, role } = usePricing();
  const { label: roleLabel } = useRoleBadge();
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentLocation, setCurrentLocation] = useState(savedLocations[0]);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const featuredProducts =
    activeCategory === "all"
      ? products.slice(0, 6)
      : products.filter((product) => product.categoryId === activeCategory);

  void requestQuote({
    items: featuredProducts.map((product) => ({
      productId: product.id,
      quantity: quantitiesById[product.id] ?? 1,
    })),
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => setLocationModalVisible(true)}
            style={styles.locationChip}>
            <Ionicons
              color={materialTheme.colors.primary}
              name="location-outline"
              size={16}
            />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Deliver to</Text>
              <Text numberOfLines={1} style={styles.locationValue}>
                {currentLocation.address}
              </Text>
            </View>
            <Ionicons
              color={materialTheme.colors.textMuted}
              name="chevron-down"
              size={16}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <Ionicons
              color={materialTheme.colors.primary}
              name="notifications-outline"
              size={20}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.roleBanner}>
          <Ionicons
            color={materialTheme.colors.primary}
            name={role === "contractor" || role === "dealer" ? "shield-checkmark-outline" : "pricetag-outline"}
            size={14}
          />
          <Text style={styles.roleBannerText}>
            Showing {roleLabel.toLowerCase()} pricing
            {quote ? " \u2022 server-verified" : " \u2022 refreshing"}
          </Text>
        </View>

        <Text style={styles.greeting}>Good morning,</Text>
        <Text style={styles.name}>Rajesh Kumar</Text>
        <Text style={styles.subheading}>What are you building today?</Text>

        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={styles.searchBar}>
          <Ionicons
            color={materialTheme.colors.textMuted}
            name="search-outline"
            size={18}
          />
          <Text style={styles.searchPlaceholder}>
            Search hinges, locks, handles...
          </Text>
          <View style={styles.searchVoice}>
            <Ionicons color={materialTheme.colors.white} name="mic-outline" size={16} />
          </View>
        </TouchableOpacity>

        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryRow}
          showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setActiveCategory("all")}
            style={[
              styles.categoryChip,
              activeCategory === "all" && styles.categoryChipActive,
            ]}>
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === "all" && styles.categoryChipTextActive,
              ]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => {
            const isActive = activeCategory === category.id;

            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => setActiveCategory(category.id)}
                style={[
                  styles.categoryChip,
                  isActive && {
                    backgroundColor: `${category.accent}18`,
                    borderColor: category.accent,
                  },
                ]}>
                <Ionicons
                  color={isActive ? category.accent : materialTheme.colors.textMuted}
                  name={category.icon as ComponentProps<typeof Ionicons>["name"]}
                  size={16}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && { color: category.accent },
                  ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionHeading title="Featured for contractors" />

        <View style={styles.productGrid}>
          {featuredProducts.map((product) => {
            const quantity = quantitiesById[product.id] ?? 0;
            const { primary, secondary } = formatPriceForDisplay(
              product.id,
              formatUnitPrice(product),
              quote,
            );

            return (
              <Animated.View
                key={product.id}
                layout={LinearTransition.springify().damping(18).stiffness(220)}
                style={styles.productCard}>
                <View style={styles.productHeader}>
                  <ProductIconBadge accent={product.accent} icon={product.icon} size={56} />
                  {product.tag ? <Text style={styles.productTag}>{product.tag}</Text> : null}
                </View>

                <Text style={styles.productCategory}>{product.category}</Text>
                <Text numberOfLines={2} style={styles.productName}>
                  {product.name}
                </Text>
                <Text numberOfLines={2} style={styles.productSubtitle}>
                  {product.subtitle}
                </Text>
                <Text style={styles.productPrice}>{primary}</Text>
                {secondary ? (
                  <Text style={styles.productPriceStrike}>{secondary}</Text>
                ) : null}

                <QuickOrderControls
                  bulkOptions={[5, 10]}
                  onAddOne={() => addToCart(product)}
                  onBulkAdd={(amount) => addToCart(product, amount)}
                  onDecrease={() => updateQuantity(product.id, quantity - 1)}
                  onIncrease={() => updateQuantity(product.id, quantity + 1)}
                  quantity={quantity}
                />
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Project-ready bundles</Text>
          <Text style={styles.summaryText}>
            Curated hinge, lock, and handle sets for wardrobes, kitchens, and site handovers.
          </Text>
          <View style={styles.summaryMetrics}>
            <MetricCard label="Lead time" value="24 hrs" />
            <MetricCard label="Bulk savings" value="12%" />
            <MetricCard label="Repeat orders" value="1 tap" />
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
        transparent
        visible={locationModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose delivery point</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons
                  color={materialTheme.colors.textMuted}
                  name="close"
                  size={24}
                />
              </TouchableOpacity>
            </View>

            {savedLocations.map((location) => (
              <TouchableOpacity
                key={location.id}
                onPress={() => {
                  setCurrentLocation(location);
                  setLocationModalVisible(false);
                }}
                style={styles.locationOption}>
                <View>
                  <Text style={styles.locationOptionLabel}>{location.label}</Text>
                  <Text style={styles.locationOptionValue}>{location.address}</Text>
                </View>
                {currentLocation.id === location.id ? (
                  <Ionicons
                    color={materialTheme.colors.primary}
                    name="checkmark-circle"
                    size={22}
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: 36,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  locationChip: {
    alignItems: "center",
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationTextWrap: { flex: 1 },
  locationLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  locationValue: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    marginTop: 2,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  greeting: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.textMuted,
    marginTop: 18,
  },
  name: {
    ...materialTheme.typography.display,
    color: materialTheme.colors.text,
  },
  subheading: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 6,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    flex: 1,
  },
  searchVoice: {
    alignItems: "center",
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 14,
  },
  categoryChip: {
    alignItems: "center",
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryChipActive: {
    backgroundColor: materialTheme.colors.primary,
    borderColor: materialTheme.colors.primary,
  },
  categoryChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  categoryChipTextActive: {
    color: materialTheme.colors.white,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  productCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.md,
    marginBottom: 2,
    padding: 16,
    width: "48.3%",
  },
  productHeader: {
    alignItems: "flex-start",
    marginBottom: 14,
  },
  productTag: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.terracotta,
    marginTop: 10,
  },
  productCategory: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  productName: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: 6,
  },
  productSubtitle: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 8,
    minHeight: 32,
  },
  productPrice: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
    marginBottom: 14,
    marginTop: 12,
  },
  summaryCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 24,
    padding: 20,
  },
  summaryTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
  },
  summaryText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 8,
  },
  summaryMetrics: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    flex: 1,
    padding: 14,
  },
  metricValue: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.primary,
  },
  metricLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 6,
  },
  modalOverlay: {
    backgroundColor: "rgba(24, 33, 27, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: materialTheme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
  },
  locationOption: {
    alignItems: "center",
    borderBottomColor: materialTheme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  locationOptionLabel: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
  },
  locationOptionValue: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 4,
    maxWidth: 260,
  },
  roleBanner: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleBannerText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
  productPriceStrike: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: -8,
    textDecorationLine: "line-through",
  },
});
