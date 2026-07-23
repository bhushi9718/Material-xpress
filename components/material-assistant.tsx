import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ProductIconBadge, SectionHeading } from '@/components/material-primitives';
import { formatUnitPrice } from '@/constants/material-data';
import { materialTheme } from '@/constants/material-theme';
import type {
  MaterialAssistantProductRecommendation,
  MaterialAssistantResponse,
} from '@/services/assistant/material-assistant-service';

type MaterialAssistantPanelProps = {
  draftMessage: string;
  isLoading: boolean;
  messages: {
    id: string;
    recommendations?: MaterialAssistantResponse;
    role: 'assistant' | 'user';
    text: string;
  }[];
  onAddRecommendation: (recommendation: MaterialAssistantProductRecommendation) => void;
  onDraftChange: (value: string) => void;
  onQuickPrompt: (value: string) => void;
  onSend: () => void;
  starterPrompts: string[];
};

export function MaterialAssistantPanel({
  draftMessage,
  isLoading,
  messages,
  onAddRecommendation,
  onDraftChange,
  onQuickPrompt,
  onSend,
  starterPrompts,
}: MaterialAssistantPanelProps) {
  const recentMessages = messages.slice(-4);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHero}>
        <View style={styles.panelHeroHeader}>
          <View style={styles.panelHeroIcon}>
            <Ionicons
              color={materialTheme.colors.white}
              name="sparkles-outline"
              size={18}
            />
          </View>
          <View style={styles.panelHeroCopy}>
            <Text style={styles.panelHeroEyebrow}>Material assistant</Text>
            <Text style={styles.panelHeroTitle}>Describe the job, not the SKU</Text>
          </View>
        </View>
        <Text style={styles.panelHeroText}>
          Share counts, room type, and finish preferences. The assistant will match products, compatible items, and working quantities.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.threadScroll}>
        {recentMessages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.role === 'user' && styles.messageRowUser,
            ]}>
            {message.role === 'assistant' ? (
              <View style={styles.assistantAvatar}>
                <Ionicons
                  color={materialTheme.colors.primary}
                  name="sparkles-outline"
                  size={16}
                />
              </View>
            ) : null}

            <View
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}>
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' && styles.userMessageText,
                ]}>
                {message.text}
              </Text>

              {message.recommendations ? (
                <RecommendationBlocks
                  onAddRecommendation={onAddRecommendation}
                  recommendations={message.recommendations}
                />
              ) : null}
            </View>
          </View>
        ))}

        {isLoading ? (
          <View style={styles.messageRow}>
            <View style={styles.assistantAvatar}>
              <Ionicons
                color={materialTheme.colors.primary}
                name="sparkles-outline"
                size={16}
              />
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={styles.typingText}>Thinking through the best material mix...</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.promptRow}>
        {starterPrompts.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            onPress={() => onQuickPrompt(prompt)}
            style={styles.promptChip}>
            <Text style={styles.promptChipText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput
          multiline
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          placeholder="Example: Need soft-close fittings for 6 wardrobe shutters and 4 drawers"
          placeholderTextColor={materialTheme.colors.textMuted}
          style={styles.composerInput}
          value={draftMessage}
        />
        <TouchableOpacity
          disabled={isLoading || draftMessage.trim().length < 3}
          onPress={onSend}
          style={[
            styles.sendButton,
            (isLoading || draftMessage.trim().length < 3) && styles.sendButtonDisabled,
          ]}>
          <Ionicons
            color={materialTheme.colors.white}
            name="arrow-forward"
            size={18}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RecommendationBlocks({
  onAddRecommendation,
  recommendations,
}: {
  onAddRecommendation: (recommendation: MaterialAssistantProductRecommendation) => void;
  recommendations: MaterialAssistantResponse;
}) {
  return (
    <View style={styles.recommendationWrap}>
      {recommendations.detectedNeeds.length > 0 ? (
        <View style={styles.detectedNeedsRow}>
          {recommendations.detectedNeeds.map((need) => (
            <View key={need} style={styles.detectedNeedChip}>
              <Text style={styles.detectedNeedText}>{need}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {recommendations.primaryRecommendations.length > 0 ? (
        <View style={styles.blockSection}>
          <SectionHeading title="Best matches" />
          {recommendations.primaryRecommendations.map((recommendation) => (
            <RecommendationCard
              key={`${recommendation.kind}-${recommendation.product.id}`}
              onAddRecommendation={onAddRecommendation}
              recommendation={recommendation}
            />
          ))}
        </View>
      ) : null}

      {recommendations.compatibleRecommendations.length > 0 ? (
        <View style={styles.blockSection}>
          <SectionHeading title="Compatible items" />
          {recommendations.compatibleRecommendations.map((recommendation) => (
            <RecommendationCard
              key={`${recommendation.kind}-${recommendation.product.id}`}
              onAddRecommendation={onAddRecommendation}
              recommendation={recommendation}
            />
          ))}
        </View>
      ) : null}

      {recommendations.followUps.length > 0 ? (
        <View style={styles.followUpRow}>
          {recommendations.followUps.map((followUp) => (
            <View key={followUp} style={styles.followUpChip}>
              <Ionicons
                color={materialTheme.colors.terracotta}
                name="chatbubble-ellipses-outline"
                size={14}
              />
              <Text style={styles.followUpChipText}>{followUp}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sourceRow}>
        <Ionicons
          color={materialTheme.colors.textMuted}
          name={
            (recommendations.source === 'remote'
              ? 'cloud-done-outline'
              : 'flash-outline') as ComponentProps<typeof Ionicons>['name']
          }
          size={14}
        />
        <Text style={styles.sourceText}>
          {recommendations.source === 'remote'
            ? 'Remote AI route active'
            : 'Local AI preview active'}
        </Text>
      </View>
    </View>
  );
}

function RecommendationCard({
  onAddRecommendation,
  recommendation,
}: {
  onAddRecommendation: (recommendation: MaterialAssistantProductRecommendation) => void;
  recommendation: MaterialAssistantProductRecommendation;
}) {
  return (
    <View style={styles.recommendationCard}>
      <ProductIconBadge
        accent={recommendation.product.accent}
        icon={recommendation.product.icon}
        size={42}
      />
      <View style={styles.recommendationCopy}>
        <View style={styles.recommendationHeader}>
          <Text style={styles.recommendationName}>{recommendation.product.name}</Text>
          <View style={styles.quantityChip}>
            <Text style={styles.quantityChipText}>
              Qty {recommendation.suggestedQuantity}
            </Text>
          </View>
        </View>
        <Text style={styles.recommendationPrice}>
          {formatUnitPrice(recommendation.product)}
        </Text>
        <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
        <TouchableOpacity
          onPress={() => onAddRecommendation(recommendation)}
          style={styles.addRecommendationButton}>
          <Text style={styles.addRecommendationButtonText}>
            Add suggested quantity
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginHorizontal: materialTheme.screenPadding,
    marginTop: 16,
    padding: 16,
  },
  panelHero: {
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.lg,
    padding: 16,
  },
  panelHeroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  panelHeroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: materialTheme.radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  panelHeroCopy: {
    flex: 1,
  },
  panelHeroEyebrow: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.accentSoft,
    textTransform: 'uppercase',
  },
  panelHeroTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.white,
    marginTop: 2,
  },
  panelHeroText: {
    ...materialTheme.typography.caption,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 12,
  },
  thread: {
    gap: 12,
    paddingTop: 16,
  },
  threadScroll: {
    maxHeight: 340,
  },
  messageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  assistantAvatar: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  messageBubble: {
    borderRadius: materialTheme.radius.md,
    flexShrink: 1,
    maxWidth: '92%',
    padding: 14,
  },
  assistantBubble: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderTopLeftRadius: 8,
  },
  userBubble: {
    backgroundColor: materialTheme.colors.primary,
    borderTopRightRadius: 8,
  },
  messageText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.text,
  },
  userMessageText: {
    color: materialTheme.colors.white,
  },
  typingText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
  },
  recommendationWrap: {
    gap: 14,
    marginTop: 14,
  },
  detectedNeedsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detectedNeedChip: {
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  detectedNeedText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
  blockSection: {
    gap: 10,
  },
  recommendationCard: {
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  recommendationCopy: {
    flex: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  recommendationName: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.text,
    flex: 1,
    paddingRight: 8,
  },
  quantityChip: {
    alignSelf: 'flex-start',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quantityChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
  recommendationPrice: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
    marginTop: 6,
  },
  recommendationReason: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 8,
  },
  addRecommendationButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.pill,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addRecommendationButtonText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.white,
  },
  followUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followUpChip: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.accentSoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  followUpChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.terracotta,
  },
  sourceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  sourceText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  promptChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  promptChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 12,
  },
  composerInput: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.text,
    flex: 1,
    maxHeight: 92,
    minHeight: 44,
    paddingTop: 4,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.terracotta,
    borderRadius: materialTheme.radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sendButtonDisabled: {
    backgroundColor: materialTheme.colors.textMuted,
  },
});
