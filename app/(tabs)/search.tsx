import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { categories, formatCurrency, formatUnitPrice, popularSearches } from '@/constants/material-data';
import { materialTheme } from '@/constants/material-theme';
import {
  MaterialAssistantPanel,
} from '@/components/material-assistant';
import {
  ProductIconBadge,
  SectionHeading,
} from '@/components/material-primitives';
import { QuickOrderControls } from '@/components/quick-order';
import { useCart } from '@/contexts/cartcontext';
import { usePricing, useRoleBadge } from '@/contexts/pricing/pricing-context';
import { useMaterialAssistant } from '@/hooks/use-material-assistant';
import { useSmartProductSearch } from '@/hooks/use-smart-product-search';
import type { MaterialAssistantProductRecommendation } from '@/services/assistant/material-assistant-service';
import type { SearchSuggestion } from '@/services/search/product-search-service';

export default function SearchScreen() {
  const { addToCart, quantitiesById, updateQuantity } = useCart();
  const { quote, requestQuote, role } = usePricing();
  const { label: roleLabel } = useRoleBadge();
  function resolveDisplayPrice(productId: string, fallback: string) {
    const line = quote?.lines.find((entry) => entry.productId === productId);
    if (!line) return { primary: fallback, secondary: null };
    const secondary =
      line.effectiveUnitPrice + 0.005 < line.basePrice
        ? `Retail ${formatCurrency(line.basePrice)}`
        : null;
    return {
      primary: `${formatCurrency(line.effectiveUnitPrice)} / ${line.unit}`,
      secondary,
    };
  }
  const [activeFilter, setActiveFilter] = useState('all');
  const activeCategoryId = activeFilter === 'all' ? undefined : activeFilter;
  const {
    clearHistory,
    correctedQuery,
    history,
    isLoading,
    query,
    results,
    saveSearchTerm,
    setQuery,
    suggestions,
  } = useSmartProductSearch({
    activeCategoryId,
  });
  const {
    draftMessage,
    isLoading: isAssistantLoading,
    messages: assistantMessages,
    sendMessage,
    setDraftMessage,
    starterPrompts,
  } = useMaterialAssistant();
  const hasActiveQuery = query.trim().length > 0;
  const showSuggestions = hasActiveQuery && suggestions.length > 0;
  const activeCategory = categories.find((category) => category.id === activeCategoryId);

  // Ask the server for a quote that matches the visible results. Fire and
  // forget -- the UI keeps showing catalog prices until the quote returns.
  if (results.length > 0) {
    void requestQuote({
      items: results.slice(0, 20).map((product) => ({
        productId: product.id,
        quantity: quantitiesById[product.id] ?? 1,
      })),
    });
  }

  async function handleSuggestionPress(suggestion: SearchSuggestion) {
    if (suggestion.kind === 'category' && suggestion.categoryId) {
      setActiveFilter(suggestion.categoryId);
    }

    const nextQuery = suggestion.query ?? suggestion.label;
    setQuery(nextQuery);
    await saveSearchTerm(nextQuery);
  }

  async function handleSearchChipPress(value: string) {
    setQuery(value);
    await saveSearchTerm(value);
  }

  const resultsHeading = isLoading
    ? 'Searching catalog...'
    : `${results.length} matching products`;

  const resultsSubheading = correctedQuery && correctedQuery !== query.trim()
    ? `Showing closest matches for "${correctedQuery}".`
    : activeCategory
      ? `Filtered by ${activeCategory.name}.`
      : 'Search by product name, category, or common trade term.';

  function handleAssistantAdd(recommendation: MaterialAssistantProductRecommendation) {
    addToCart(recommendation.product, recommendation.suggestedQuantity);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Find the exact fitting, finish, or fastener you need.
        </Text>
        <View style={styles.roleBanner}>
          <Ionicons
            color={materialTheme.colors.primary}
            name={role === 'contractor' || role === 'dealer' ? 'shield-checkmark-outline' : 'pricetag-outline'}
            size={14}
          />
          <Text style={styles.roleBannerText}>
            {roleLabel} pricing � server verified
          </Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons
          color={materialTheme.colors.textMuted}
          name="search-outline"
          size={18}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          onSubmitEditing={() => saveSearchTerm()}
          placeholder="Search drawer slides, locks, screws..."
          placeholderTextColor={materialTheme.colors.textMuted}
          style={styles.searchInput}
          value={query}
        />
        {isLoading ? (
          <ActivityIndicator color={materialTheme.colors.primary} size="small" />
        ) : query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons
              color={materialTheme.colors.textMuted}
              name="close-circle"
              size={20}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <MaterialAssistantPanel
        draftMessage={draftMessage}
        isLoading={isAssistantLoading}
        messages={assistantMessages}
        onAddRecommendation={handleAssistantAdd}
        onDraftChange={setDraftMessage}
        onQuickPrompt={(value) => {
          void sendMessage(value);
        }}
        onSend={() => {
          void sendMessage();
        }}
        starterPrompts={starterPrompts}
      />

      <FlatList
        style={styles.resultsList}
        contentContainerStyle={styles.content}
        data={results}
        initialNumToRender={8}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingGroup}>
              <SearchSkeletonCard />
              <SearchSkeletonCard />
              <SearchSkeletonCard />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                color={materialTheme.colors.textMuted}
                name="search-outline"
                size={30}
              />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try another keyword, remove a category filter, or use a suggestion below.
              </Text>
              {(hasActiveQuery || activeFilter !== 'all') ? (
                <TouchableOpacity
                  onPress={() => {
                    setActiveFilter('all');
                    setQuery('');
                  }}
                  style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>Reset search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={<View style={styles.footerGap} />}
        ListHeaderComponent={
          <>
            <ScrollView
              horizontal
              contentContainerStyle={styles.filterRow}
              showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                style={[
                  styles.filterChip,
                  activeFilter === 'all' && styles.filterChipActive,
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'all' && styles.filterChipTextActive,
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => {
                const isActive = activeFilter === category.id;

                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setActiveFilter(category.id)}
                    style={[
                      styles.filterChip,
                      isActive && {
                        backgroundColor: `${category.accent}18`,
                        borderColor: category.accent,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && { color: category.accent },
                      ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {showSuggestions ? (
              <View style={styles.suggestionCard}>
                <SectionHeading title="Instant Suggestions" />
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    onPress={() => handleSuggestionPress(suggestion)}
                    style={styles.suggestionRow}>
                    <View style={styles.suggestionIconWrap}>
                      <Ionicons
                        color={suggestion.accent ?? materialTheme.colors.primary}
                        name={(suggestion.icon ??
                          getSuggestionIcon(suggestion.kind)) as ComponentProps<
                          typeof Ionicons
                        >['name']}
                        size={16}
                      />
                    </View>
                    <View style={styles.suggestionCopy}>
                      <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                      {suggestion.description ? (
                        <Text style={styles.suggestionDescription}>
                          {suggestion.description}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      color={materialTheme.colors.textMuted}
                      name="arrow-up-outline"
                      size={18}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {!hasActiveQuery ? (
              <>
                {history.length > 0 ? (
                  <View style={styles.popularSection}>
                    <SectionHeading
                      actionLabel="Clear"
                      onPressAction={clearHistory}
                      title="Recent Searches"
                    />
                    <View style={styles.popularRow}>
                      {history.map((item) => (
                        <TouchableOpacity
                          key={item}
                          onPress={() => handleSearchChipPress(item)}
                          style={styles.popularChip}>
                          <Ionicons
                            color={materialTheme.colors.primary}
                            name="time-outline"
                            size={14}
                          />
                          <Text style={styles.popularChipText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.popularSection}>
                  <SectionHeading title="Popular Searches" />
                  <View style={styles.popularRow}>
                    {popularSearches.map((item) => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => handleSearchChipPress(item)}
                        style={styles.popularChip}>
                        <Ionicons
                          color={materialTheme.colors.terracotta}
                          name="flame-outline"
                          size={14}
                        />
                        <Text style={styles.popularChipText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.resultsSummaryCard}>
              <SectionHeading title={resultsHeading} />
              <Text style={styles.resultsSummaryText}>{resultsSubheading}</Text>
            </View>
          </>
        }
        maxToRenderPerBatch={8}
        removeClippedSubviews
        renderItem={({ item }) => {
          const quantity = quantitiesById[item.id] ?? 0;

          return (
            <Animated.View
              layout={LinearTransition.springify().damping(18).stiffness(220)}
              style={styles.resultCard}>
              <ProductIconBadge accent={item.accent} icon={item.icon} size={52} />
              <View style={styles.resultInfo}>
                <Text style={styles.resultCategory}>{item.category}</Text>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                <Text style={styles.resultPrice}>{resolveDisplayPrice(item.id, formatUnitPrice(item)).primary}</Text>
                {resolveDisplayPrice(item.id, formatUnitPrice(item)).secondary ? (
                  <Text style={styles.resultPriceStrike}>
                    {resolveDisplayPrice(item.id, formatUnitPrice(item)).secondary}
                  </Text>
                ) : null}
              </View>

              <QuickOrderControls
                bulkOptions={[5, 10, 25]}
                onAddOne={() => addToCart(item)}
                onBulkAdd={(amount) => addToCart(item, amount)}
                onDecrease={() => updateQuantity(item.id, quantity - 1)}
                onIncrease={() => updateQuantity(item.id, quantity + 1)}
                quantity={quantity}
                variant="list"
              />
            </Animated.View>
          );
        }}
        showsVerticalScrollIndicator={false}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

function SearchSkeletonCard() {
  return (
    <View style={styles.resultCard}>
      <View style={styles.skeletonCircle} />
      <View style={styles.resultInfo}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineLong} />
        <View style={styles.skeletonLineMedium} />
      </View>
      <View style={styles.skeletonButton} />
    </View>
  );
}

function getSuggestionIcon(kind: SearchSuggestion['kind']) {
  if (kind === 'category') {
    return 'grid-outline';
  }

  if (kind === 'history') {
    return 'time-outline';
  }

  if (kind === 'spell') {
    return 'sparkles-outline';
  }

  return 'search-outline';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
  header: {
    paddingHorizontal: materialTheme.screenPadding,
    paddingTop: 10,
  },
  title: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.text,
  },
  subtitle: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 6,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: materialTheme.screenPadding,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  searchInput: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.text,
    flex: 1,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: 32,
  },
  resultsList: {
    flex: 1,
    marginTop: 8,
  },
  loadingGroup: {
    gap: 12,
    marginTop: 12,
  },
  filterRow: {
    gap: 10,
    paddingBottom: 8,
  },
  filterChip: {
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: materialTheme.colors.primary,
    borderColor: materialTheme.colors.primary,
  },
  filterChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  filterChipTextActive: {
    color: materialTheme.colors.white,
  },
  popularSection: {
    marginBottom: 20,
    marginTop: 12,
  },
  suggestionCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginBottom: 16,
    marginTop: 12,
    padding: 16,
  },
  suggestionRow: {
    alignItems: 'center',
    borderBottomColor: materialTheme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  suggestionIconWrap: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  suggestionCopy: {
    flex: 1,
  },
  suggestionLabel: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
  },
  suggestionDescription: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 4,
  },
  popularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  popularChip: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  popularChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  resultsSummaryCard: {
    marginBottom: 12,
  },
  resultsSummaryText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: -6,
  },
  resultCard: {
    ...materialTheme.shadow,
    alignItems: 'flex-start',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
    padding: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultCategory: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  resultName: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: 4,
  },
  resultSubtitle: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 6,
  },
  resultPrice: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
    marginTop: 10,
  },
  resultPriceStrike: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
  roleBanner: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleBannerText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 12,
    padding: 28,
  },
  emptyTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: 12,
  },
  emptyText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resetButtonText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
  },
  skeletonCircle: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: 26,
    height: 52,
    width: 52,
  },
  skeletonLineShort: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: 999,
    height: 12,
    width: '38%',
  },
  skeletonLineLong: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: 999,
    height: 14,
    marginTop: 8,
    width: '84%',
  },
  skeletonLineMedium: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: 999,
    height: 12,
    marginTop: 10,
    width: '58%',
  },
  skeletonButton: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    height: 34,
    width: 56,
  },
  footerGap: {
    height: 24,
  },
});












