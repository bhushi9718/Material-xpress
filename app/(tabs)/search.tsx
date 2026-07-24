import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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

  useEffect(() => {
    if (results.length > 0) {
      void requestQuote({
        items: results.slice(0, 20).map((product) => ({
          productId: product.id,
          quantity: quantitiesById[product.id] ?? 1,
        })),
      });
    }
  }, [results, quantitiesById, requestQuote]);

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
            {roleLabel} pricing • server verified
          </Text>
        </View>
      </View>

      <View style={styles.searchBoxWrapper}>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          onSubmitEditing={() => saveSearchTerm()}
          placeholder="Search drawer slides, locks, screws..."
          value={query}
          leftIcon={<Ionicons color={materialTheme.colors.textMuted} name="search-outline" size={18} />}
          rightIcon={
            isLoading ? (
              <ActivityIndicator color={materialTheme.colors.primary} size="small" />
            ) : query ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons color={materialTheme.colors.textMuted} name="close-circle" size={20} />
              </TouchableOpacity>
            ) : undefined
          }
        />
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
            <Card style={styles.emptyCard}>
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
                <Button
                  label="Reset search"
                  onPress={() => {
                    setActiveFilter('all');
                    setQuery('');
                  }}
                  variant="secondary"
                  style={{ marginTop: materialTheme.spacing.lg }}
                />
              ) : null}
            </Card>
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
                        backgroundColor: `${category.accent}20`,
                        borderColor: 'transparent',
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
              <Card style={styles.suggestionCard}>
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
              </Card>
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
              style={styles.resultCardWrapper}>
              <Card style={styles.resultCard}>
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
              </Card>
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
    <Card style={styles.resultCard}>
      <View style={styles.skeletonCircle} />
      <View style={styles.resultInfo}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineLong} />
        <View style={styles.skeletonLineMedium} />
      </View>
      <View style={styles.skeletonButton} />
    </Card>
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
    paddingTop: materialTheme.spacing.md,
  },
  title: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.text,
  },
  subtitle: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
  },
  searchBoxWrapper: {
    marginHorizontal: materialTheme.screenPadding,
    marginTop: materialTheme.spacing.lg,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: materialTheme.spacing.xxxl,
  },
  resultsList: {
    flex: 1,
    marginTop: materialTheme.spacing.sm,
  },
  loadingGroup: {
    gap: materialTheme.spacing.md,
    marginTop: materialTheme.spacing.md,
  },
  filterRow: {
    gap: materialTheme.spacing.sm,
    paddingBottom: materialTheme.spacing.sm,
  },
  filterChip: {
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: materialTheme.spacing.lg,
    paddingVertical: materialTheme.spacing.sm,
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
    marginBottom: materialTheme.spacing.xl,
    marginTop: materialTheme.spacing.md,
  },
  suggestionCard: {
    marginBottom: materialTheme.spacing.lg,
    marginTop: materialTheme.spacing.md,
  },
  suggestionRow: {
    alignItems: 'center',
    borderBottomColor: materialTheme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: materialTheme.spacing.md,
    paddingVertical: materialTheme.spacing.md,
  },
  suggestionIconWrap: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.md,
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
    marginTop: materialTheme.spacing.xs,
  },
  popularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: materialTheme.spacing.sm,
  },
  popularChip: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: materialTheme.spacing.sm,
    paddingHorizontal: materialTheme.spacing.md,
    paddingVertical: materialTheme.spacing.sm,
  },
  popularChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  resultsSummaryCard: {
    marginBottom: materialTheme.spacing.md,
  },
  resultsSummaryText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: -materialTheme.spacing.xs,
  },
  resultCardWrapper: {
    marginBottom: materialTheme.spacing.md,
  },
  resultCard: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: materialTheme.spacing.md,
    padding: materialTheme.spacing.lg,
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
    marginTop: materialTheme.spacing.xs,
  },
  resultSubtitle: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
  },
  resultPrice: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
    marginTop: materialTheme.spacing.sm,
  },
  resultPriceStrike: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
    textDecorationLine: 'line-through',
  },
  roleBanner: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: materialTheme.spacing.sm,
    marginTop: materialTheme.spacing.md,
    paddingHorizontal: materialTheme.spacing.md,
    paddingVertical: materialTheme.spacing.sm,
  },
  roleBannerText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: materialTheme.spacing.md,
    padding: materialTheme.spacing.xxl,
  },
  emptyTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: materialTheme.spacing.md,
  },
  emptyText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
    textAlign: 'center',
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
    marginTop: materialTheme.spacing.sm,
    width: '84%',
  },
  skeletonLineMedium: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: 999,
    height: 12,
    marginTop: materialTheme.spacing.sm,
    width: '58%',
  },
  skeletonButton: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    height: 34,
    width: 56,
  },
  footerGap: {
    height: materialTheme.spacing.xxl,
  },
});
