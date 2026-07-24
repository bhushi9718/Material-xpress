import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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

  const featuredProducts = useMemo(() =>
    activeCategory === "all"
      ? products.slice(0, 6)
      : products.filter((product) => product.categoryId === activeCategory),
    [activeCategory]
  );

  useEffect(() => {
    void requestQuote({
      items: featuredProducts.map((product) => ({
        productId: product.id,
        quantity: quantitiesById[product.id] ?? 1,
      })),
    });
  }, [featuredProducts, quantitiesById, requestQuote]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
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

          <TouchableOpacity activeOpacity={0.7} style={styles.iconButton}>
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

        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/search")}>
          <Input
            editable={false}
            pointerEvents="none"
            placeholder="Search hinges, locks, handles..."
            containerStyle={styles.searchContainer}
            leftIcon={<Ionicons color={materialTheme.colors.textMuted} name="search-outline" size={18} />}
            rightIcon={
              <View style={styles.searchVoice}>
                <Ionicons color={materialTheme.colors.white} name="mic-outline" size={16} />
              </View>
            }
          />
        </TouchableOpacity>

        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryRow}
          showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            activeOpacity={0.7}
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
                activeOpacity={0.7}
                onPress={() => setActiveCategory(category.id)}
                style={[
                  styles.categoryChip,
                  isActive && {
                    backgroundColor: `${category.accent}20`,
                    borderColor: 'transparent',
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
                style={styles.productCardWrapper}>
                <Card style={styles.productCard}>
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

                  <View style={styles.spacer} />

                  <QuickOrderControls
                    bulkOptions={[5, 10]}
                    onAddOne={() => addToCart(product)}
                    onBulkAdd={(amount) => addToCart(product, amount)}
                    onDecrease={() => updateQuantity(product.id, quantity - 1)}
                    onIncrease={() => updateQuantity(product.id, quantity + 1)}
                    quantity={quantity}
                  />
                </Card>
              </Animated.View>
            );
          })}
        </View>

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Project-ready bundles</Text>
          <Text style={styles.summaryText}>
            Curated hinge, lock, and handle sets for wardrobes, kitchens, and site handovers.
          </Text>
          <View style={styles.summaryMetrics}>
            <MetricCard label="Lead time" value="24 hrs" />
            <MetricCard label="Bulk savings" value="12%" />
            <MetricCard label="Repeat orders" value="1 tap" />
          </View>
        </Card>
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
              <TouchableOpacity activeOpacity={0.7} onPress={() => setLocationModalVisible(false)}>
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
                activeOpacity={0.7}
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
    paddingBottom: materialTheme.spacing.xxxxl,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: materialTheme.spacing.md,
    justifyContent: "space-between",
  },
  locationChip: {
    alignItems: "center",
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    flex: 1,
    flexDirection: "row",
    gap: materialTheme.spacing.sm,
    paddingHorizontal: materialTheme.spacing.md,
    paddingVertical: materialTheme.spacing.md,
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
    marginTop: materialTheme.spacing.lg,
  },
  name: {
    ...materialTheme.typography.display,
    color: materialTheme.colors.text,
  },
  subheading: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
  },
  searchContainer: {
    marginTop: materialTheme.spacing.lg,
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
    gap: materialTheme.spacing.sm,
    paddingVertical: materialTheme.spacing.lg,
  },
  categoryChip: {
    alignItems: "center",
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    flexDirection: "row",
    gap: materialTheme.spacing.sm,
    paddingHorizontal: materialTheme.spacing.lg,
    paddingVertical: materialTheme.spacing.md,
  },
  categoryChipActive: {
    backgroundColor: materialTheme.colors.primary,
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
    rowGap: materialTheme.spacing.md,
  },
  productCardWrapper: {
    width: "48.3%",
    marginBottom: materialTheme.spacing.sm,
  },
  productCard: {
    flex: 1, // ensure card expands fully
    padding: materialTheme.spacing.lg,
  },
  productHeader: {
    alignItems: "flex-start",
    marginBottom: materialTheme.spacing.md,
  },
  productTag: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.terracotta,
    marginTop: materialTheme.spacing.sm,
  },
  productCategory: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  productName: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: materialTheme.spacing.xs,
  },
  productSubtitle: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
    minHeight: 32,
  },
  productPrice: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
    marginBottom: materialTheme.spacing.md,
    marginTop: materialTheme.spacing.md,
  },
  productPriceStrike: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: -materialTheme.spacing.sm,
    marginBottom: materialTheme.spacing.sm,
    textDecorationLine: "line-through",
  },
  spacer: {
    flex: 1,
  },
  summaryCard: {
    marginTop: materialTheme.spacing.xxl,
  },
  summaryTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
  },
  summaryText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
  },
  summaryMetrics: {
    flexDirection: "row",
    gap: materialTheme.spacing.sm,
    marginTop: materialTheme.spacing.lg,
  },
  metricCard: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    flex: 1,
    padding: materialTheme.spacing.md,
  },
  metricValue: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.primary,
  },
  metricLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
  },
  modalOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: materialTheme.colors.surface,
    borderTopLeftRadius: materialTheme.radius.lg,
    borderTopRightRadius: materialTheme.radius.lg,
    padding: materialTheme.spacing.xxl,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: materialTheme.spacing.lg,
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
    paddingVertical: materialTheme.spacing.lg,
  },
  locationOptionLabel: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
  },
  locationOptionValue: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
    maxWidth: 260,
  },
  roleBanner: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: "row",
    gap: materialTheme.spacing.sm,
    marginTop: materialTheme.spacing.md,
    paddingHorizontal: materialTheme.spacing.md,
    paddingVertical: materialTheme.spacing.sm,
  },
  roleBannerText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
});
