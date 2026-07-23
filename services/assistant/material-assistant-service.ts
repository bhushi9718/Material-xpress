import {
  categories,
  products,
  type Product,
} from '@/constants/material-data';
import { searchProducts } from '@/services/search/product-search-service';

const REMOTE_ASSISTANT_ENDPOINT =
  process.env.EXPO_PUBLIC_OPENAI_MATERIAL_ASSISTANT_ENDPOINT;

const PRODUCT_INDEX = new Map(products.map((product) => [product.id, product]));

type RecommendationKind = 'compatible' | 'primary';
type RecommendationSeed = {
  productId: string;
  reason: string;
  suggestedQuantity: number;
};

type MaterialAssistantApiRecommendation = {
  productId?: unknown;
  reason?: unknown;
  suggestedQuantity?: unknown;
};

type MaterialAssistantApiResponse = {
  compatibleRecommendations?: unknown;
  detectedNeeds?: unknown;
  followUps?: unknown;
  primaryRecommendations?: unknown;
  reply?: unknown;
};

type ParsedRequirementContext = {
  cabinets: number;
  drawers: number;
  doors: number;
  explicitNeedCount: number;
  hasAdhesiveRequest: boolean;
  hasCabinetLanguage: boolean;
  hasDrawerLanguage: boolean;
  hasHandleLanguage: boolean;
  hasHeavyDutyLanguage: boolean;
  hasLockLanguage: boolean;
  hasPremiumLanguage: boolean;
  hasScrewLanguage: boolean;
  hasSoftCloseLanguage: boolean;
  normalizedRequirement: string;
  wardrobes: number;
};

export type MaterialAssistantProductRecommendation = {
  kind: RecommendationKind;
  product: Product;
  reason: string;
  suggestedQuantity: number;
};

export type MaterialAssistantResponse = {
  compatibleRecommendations: MaterialAssistantProductRecommendation[];
  detectedNeeds: string[];
  followUps: string[];
  primaryRecommendations: MaterialAssistantProductRecommendation[];
  reply: string;
  source: 'local' | 'remote';
};

export async function getMaterialAssistantResponse(requirement: string) {
  const localRecommendationPromise = buildLocalMaterialAssistantResponse(requirement);

  if (REMOTE_ASSISTANT_ENDPOINT) {
    const remoteRecommendation = await tryRemoteMaterialAssistant(requirement);

    if (remoteRecommendation) {
      return remoteRecommendation;
    }
  }

  return localRecommendationPromise;
}

export function getMaterialAssistantStarterPrompts() {
  return [
    'Need fittings for 4 kitchen cabinets and 3 drawers',
    'Suggest a soft-close wardrobe setup for 2 shutters',
    'What do I need for one mortise lock door install?',
  ];
}

async function buildLocalMaterialAssistantResponse(
  requirement: string
): Promise<MaterialAssistantResponse> {
  const normalizedRequirement = normalizeText(requirement);
  const searchResultsPromise = searchProducts({
    limit: 4,
    query: requirement,
    suggestionLimit: 0,
  });
  const context = parseRequirementContext(normalizedRequirement);
  const primarySeeds = new Map<string, RecommendationSeed>();
  const compatibleSeeds = new Map<string, RecommendationSeed>();
  const detectedNeeds = buildDetectedNeeds(context);

  const cabinetryCount = context.cabinets + context.wardrobes;
  const drawerCount = context.drawers;
  const visibleFrontCount = cabinetryCount + drawerCount;

  if (cabinetryCount > 0 || hasAnyToken(normalizedRequirement, ['hinge', 'hinges', 'shutter'])) {
    addRecommendationSeed(primarySeeds, {
      productId: 'soft-close-hinge',
      reason:
        cabinetryCount > 0
          ? `Soft-close hinges fit ${formatCount(cabinetryCount, 'cabinet or shutter')} in your request.`
          : 'Soft-close hinges are the closest match for the shutter hardware you described.',
      suggestedQuantity: Math.max(cabinetryCount, 1),
    });
  }

  if (
    drawerCount > 0 ||
    hasAnyToken(normalizedRequirement, ['drawer', 'drawers', 'slide', 'slides', 'runner', 'channel'])
  ) {
    const slideProductId =
      context.hasPremiumLanguage || context.hasSoftCloseLanguage
        ? 'drawer-slide-350'
        : context.hasHeavyDutyLanguage
          ? 'drawer-slide-450'
          : 'drawer-slide-450';

    addRecommendationSeed(primarySeeds, {
      productId: slideProductId,
      reason:
        drawerCount > 0
          ? `One slide pair per drawer keeps ${formatCount(drawerCount, 'drawer')} installation aligned.`
          : 'Drawer slides match the storage hardware requirement in your prompt.',
      suggestedQuantity: Math.max(drawerCount, 1),
    });
  }

  if (context.hasLockLanguage || context.doors > 0) {
    addRecommendationSeed(primarySeeds, {
      productId: 'mortise-lock-body',
      reason:
        context.doors > 0
          ? `One mortise lock body per door covers ${formatCount(context.doors, 'door')} in the requirement.`
          : 'A mortise lock body matches the door security requirement you described.',
      suggestedQuantity: Math.max(context.doors, 1),
    });
  }

  if (visibleFrontCount > 0 || context.hasHandleLanguage) {
    const handleProductId =
      drawerCount >= 6 && cabinetryCount === 0
        ? 'cabinet-knob-set'
        : 'aluminium-d-handle';
    const handleQuantity =
      handleProductId === 'cabinet-knob-set'
        ? Math.max(1, Math.ceil(drawerCount / 10))
        : Math.max(visibleFrontCount, 1);

    addRecommendationSeed(primarySeeds, {
      productId: handleProductId,
      reason:
        handleProductId === 'cabinet-knob-set'
          ? 'A knob pack is a cleaner fit for a larger drawer run.'
          : `Handles usually track visible fronts, so ${formatCount(handleQuantity, 'piece')} fits this layout.`,
      suggestedQuantity: handleQuantity,
    });
  }

  if (context.hasAdhesiveRequest) {
    addRecommendationSeed(primarySeeds, {
      productId: 'fevicol-pro',
      reason: 'Fevicol Pro matches the adhesive and woodwork prep requirement.',
      suggestedQuantity: Math.max(1, Math.ceil((cabinetryCount + drawerCount) / 8)),
    });
  }

  const totalHardwareUnits = [...primarySeeds.values()].reduce(
    (sum, item) => sum + item.suggestedQuantity,
    0
  );

  if (
    totalHardwareUnits > 0 ||
    context.hasScrewLanguage
  ) {
    addRecommendationSeed(compatibleSeeds, {
      productId: 'wood-screws-box',
      reason:
        totalHardwareUnits > 0
          ? 'Wood screws complete the fitting kit for hinges, slides, handles, and locks.'
          : 'Wood screws match the installation fastener request in your brief.',
      suggestedQuantity: Math.max(1, Math.ceil(Math.max(totalHardwareUnits, 4) / 10)),
    });
  }

  if (
    cabinetryCount + drawerCount > 0 &&
    !primarySeeds.has('fevicol-pro')
  ) {
    addRecommendationSeed(compatibleSeeds, {
      productId: 'fevicol-pro',
      reason: 'Fevicol Pro is a useful companion for cabinet and drawer installation work.',
      suggestedQuantity: Math.max(1, Math.ceil((cabinetryCount + drawerCount) / 8)),
    });
  }

  if (
    drawerCount > 0 &&
    !primarySeeds.has('cabinet-knob-set') &&
    !primarySeeds.has('aluminium-d-handle')
  ) {
    addRecommendationSeed(compatibleSeeds, {
      productId: drawerCount >= 6 ? 'cabinet-knob-set' : 'aluminium-d-handle',
      reason: 'A front-facing pull keeps the drawer setup complete and installation-ready.',
      suggestedQuantity:
        drawerCount >= 6 ? Math.max(1, Math.ceil(drawerCount / 10)) : Math.max(drawerCount, 1),
    });
  }

  const searchResults = await searchResultsPromise;

  if (primarySeeds.size === 0) {
    searchResults.results.slice(0, 2).forEach((product) => {
      addRecommendationSeed(primarySeeds, {
        productId: product.id,
        reason: 'This is the closest catalog match to your typed requirement.',
        suggestedQuantity: Math.max(context.explicitNeedCount, 1),
      });
    });
  }

  const primaryRecommendations = resolveRecommendations(primarySeeds, 'primary');
  const compatibleRecommendations = resolveRecommendations(
    compatibleSeeds,
    'compatible',
    new Set(primaryRecommendations.map((item) => item.product.id))
  );

  return {
    compatibleRecommendations,
    detectedNeeds,
    followUps: buildFollowUps(context),
    primaryRecommendations,
    reply: buildAssistantReply({
      compatibleRecommendations,
      context,
      primaryRecommendations,
    }),
    source: 'local',
  };
}

async function tryRemoteMaterialAssistant(requirement: string) {
  if (!REMOTE_ASSISTANT_ENDPOINT) {
    return null;
  }

  try {
    const response = await fetch(REMOTE_ASSISTANT_ENDPOINT, {
      body: JSON.stringify({
        catalog: products.map((product) => ({
          category: product.category,
          id: product.id,
          keywords: product.keywords,
          name: product.name,
          price: product.price,
          unit: product.unit,
        })),
        categories: categories.map((category) => ({
          blurb: category.blurb,
          id: category.id,
          name: category.name,
        })),
        requirement,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as MaterialAssistantApiResponse;
    const primaryRecommendations = parseApiRecommendations(
      payload.primaryRecommendations,
      'primary'
    );
    const compatibleRecommendations = parseApiRecommendations(
      payload.compatibleRecommendations,
      'compatible',
      new Set(primaryRecommendations.map((item) => item.product.id))
    );

    if (primaryRecommendations.length === 0 && compatibleRecommendations.length === 0) {
      return null;
    }

    return {
      compatibleRecommendations,
      detectedNeeds: parseStringArray(payload.detectedNeeds),
      followUps: parseStringArray(payload.followUps),
      primaryRecommendations,
      reply:
        typeof payload.reply === 'string' && payload.reply.trim().length > 0
          ? payload.reply.trim()
          : 'I matched the closest catalog items for this requirement and added compatible materials for the install.',
      source: 'remote' as const,
    };
  } catch (error) {
    console.warn('Remote material assistant unavailable, falling back to local recommendations.', error);
    return null;
  }
}

function parseApiRecommendations(
  input: unknown,
  kind: RecommendationKind,
  excludedIds = new Set<string>()
) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => parseApiRecommendation(item, kind))
    .filter(
      (
        item
      ): item is MaterialAssistantProductRecommendation =>
        item !== null && !excludedIds.has(item.product.id)
    );
}

function parseApiRecommendation(
  input: unknown,
  kind: RecommendationKind
): MaterialAssistantProductRecommendation | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as MaterialAssistantApiRecommendation;
  const productId =
    typeof candidate.productId === 'string' ? candidate.productId : null;
  const product = productId ? PRODUCT_INDEX.get(productId) : null;
  const quantity = normalizeQuantity(candidate.suggestedQuantity);
  const reason =
    typeof candidate.reason === 'string' && candidate.reason.trim().length > 0
      ? candidate.reason.trim()
      : 'Recommended by the assistant based on your requirement.';

  if (!product || quantity <= 0) {
    return null;
  }

  return {
    kind,
    product,
    reason,
    suggestedQuantity: quantity,
  };
}

function resolveRecommendations(
  seeds: Map<string, RecommendationSeed>,
  kind: RecommendationKind,
  excludedIds = new Set<string>()
) {
  const recommendations: MaterialAssistantProductRecommendation[] = [];

  seeds.forEach((seed) => {
    if (excludedIds.has(seed.productId)) {
      return;
    }

    const product = PRODUCT_INDEX.get(seed.productId);

    if (!product) {
      return;
    }

    recommendations.push({
      kind,
      product,
      reason: seed.reason,
      suggestedQuantity: seed.suggestedQuantity,
    });
  });

  return recommendations.sort((left, right) => {
    if (right.suggestedQuantity !== left.suggestedQuantity) {
      return right.suggestedQuantity - left.suggestedQuantity;
    }

    return left.product.name.localeCompare(right.product.name);
  });
}

function addRecommendationSeed(
  seedMap: Map<string, RecommendationSeed>,
  seed: RecommendationSeed
) {
  const normalizedQuantity = normalizeQuantity(seed.suggestedQuantity);

  if (normalizedQuantity <= 0) {
    return;
  }

  const existingSeed = seedMap.get(seed.productId);

  if (!existingSeed) {
    seedMap.set(seed.productId, {
      ...seed,
      suggestedQuantity: normalizedQuantity,
    });
    return;
  }

  seedMap.set(seed.productId, {
    ...existingSeed,
    reason:
      existingSeed.reason.length >= seed.reason.length
        ? existingSeed.reason
        : seed.reason,
    suggestedQuantity: Math.max(existingSeed.suggestedQuantity, normalizedQuantity),
  });
}

function buildAssistantReply(params: {
  compatibleRecommendations: MaterialAssistantProductRecommendation[];
  context: ParsedRequirementContext;
  primaryRecommendations: MaterialAssistantProductRecommendation[];
}) {
  const { compatibleRecommendations, context, primaryRecommendations } = params;
  const primarySummary = primaryRecommendations
    .slice(0, 2)
    .map((item) => `${item.suggestedQuantity} x ${item.product.name}`)
    .join(' and ');

  if (primarySummary) {
    if (compatibleRecommendations.length > 0) {
      return `For ${summarizeProjectContext(context)}, I would start with ${primarySummary}. I also added compatible installation items so the order is closer to site-ready.`;
    }

    return `For ${summarizeProjectContext(context)}, the closest product fit is ${primarySummary}.`;
  }

  return 'I matched the nearest catalog items from your requirement. Share room counts or door and drawer quantities if you want a tighter quantity estimate.';
}

function buildDetectedNeeds(context: ParsedRequirementContext) {
  const detectedNeeds: string[] = [];

  if (context.cabinets > 0) {
    detectedNeeds.push(formatCount(context.cabinets, 'cabinet'));
  }

  if (context.wardrobes > 0) {
    detectedNeeds.push(formatCount(context.wardrobes, 'wardrobe shutter'));
  }

  if (context.drawers > 0) {
    detectedNeeds.push(formatCount(context.drawers, 'drawer'));
  }

  if (context.doors > 0) {
    detectedNeeds.push(formatCount(context.doors, 'door'));
  }

  if (context.hasSoftCloseLanguage) {
    detectedNeeds.push('soft-close preference');
  }

  if (context.hasHeavyDutyLanguage || context.hasPremiumLanguage) {
    detectedNeeds.push('premium-duty finish');
  }

  return detectedNeeds;
}

function buildFollowUps(context: ParsedRequirementContext) {
  const followUps = new Set<string>();

  if (context.drawers > 0) {
    followUps.add('Need an alternative drawer slide length');
  }

  if (context.cabinets + context.wardrobes > 0) {
    followUps.add('Also suggest handles for this setup');
  }

  if (context.doors > 0 || context.hasLockLanguage) {
    followUps.add('Suggest a full door hardware kit');
  }

  if (followUps.size === 0) {
    followUps.add('Suggest a basic kitchen hardware package');
    followUps.add('Recommend materials for wardrobe shutters');
  }

  return [...followUps].slice(0, 3);
}

function parseRequirementContext(normalizedRequirement: string): ParsedRequirementContext {
  const cabinets = extractCount(normalizedRequirement, [
    'cabinet',
    'cabinets',
    'shutter',
    'shutters',
  ]);
  const wardrobes = extractCount(normalizedRequirement, [
    'wardrobe',
    'wardrobes',
  ]);
  const drawers = extractCount(normalizedRequirement, [
    'drawer',
    'drawers',
  ]);
  const doors = extractCount(normalizedRequirement, [
    'door',
    'doors',
  ]);
  const explicitNeedCount = extractLooseCount(normalizedRequirement);

  return {
    cabinets,
    doors,
    drawers,
    explicitNeedCount,
    hasAdhesiveRequest: hasAnyToken(normalizedRequirement, [
      'adhesive',
      'fevicol',
      'glue',
      'woodwork',
    ]),
    hasCabinetLanguage: hasAnyToken(normalizedRequirement, [
      'cabinet',
      'cabinets',
      'kitchen',
      'shutter',
      'shutters',
      'wardrobe',
      'wardrobes',
    ]),
    hasDrawerLanguage: hasAnyToken(normalizedRequirement, [
      'drawer',
      'drawers',
      'slide',
      'slides',
      'runner',
      'channel',
    ]),
    hasHandleLanguage: hasAnyToken(normalizedRequirement, [
      'handle',
      'handles',
      'knob',
      'knobs',
      'pull',
      'pulls',
    ]),
    hasHeavyDutyLanguage: hasAnyToken(normalizedRequirement, [
      'heavy',
      'heavy duty',
      'tough',
      'strong',
    ]),
    hasLockLanguage: hasAnyToken(normalizedRequirement, [
      'lock',
      'locks',
      'mortise',
      'security',
      'door lock',
    ]),
    hasPremiumLanguage: hasAnyToken(normalizedRequirement, [
      'premium',
      'undermount',
      'concealed',
    ]),
    hasScrewLanguage: hasAnyToken(normalizedRequirement, [
      'screw',
      'screws',
      'fastener',
      'fasteners',
    ]),
    hasSoftCloseLanguage: hasAnyToken(normalizedRequirement, [
      'soft close',
      'softclose',
      'silent',
    ]),
    normalizedRequirement,
    wardrobes,
  };
}

function extractCount(normalizedRequirement: string, keywords: string[]) {
  let bestCount = 0;

  for (const keyword of keywords) {
    const directPattern = new RegExp(`(\\d+)\\s+${escapeRegex(keyword)}\\b`, 'g');
    const reversePattern = new RegExp(`${escapeRegex(keyword)}\\b\\s+(\\d+)`, 'g');

    bestCount = Math.max(
      bestCount,
      getLargestMatch(normalizedRequirement, directPattern),
      getLargestMatch(normalizedRequirement, reversePattern)
    );
  }

  if (bestCount > 0) {
    return bestCount;
  }

  return hasAnyToken(normalizedRequirement, keywords) ? 1 : 0;
}

function extractLooseCount(normalizedRequirement: string) {
  const countPattern = /\b(\d+)\b/g;
  return getLargestMatch(normalizedRequirement, countPattern);
}

function getLargestMatch(value: string, pattern: RegExp) {
  let largestMatch = 0;
  let match = pattern.exec(value);

  while (match) {
    largestMatch = Math.max(
      largestMatch,
      Number.parseInt(match[1] ?? '0', 10) || 0
    );
    match = pattern.exec(value);
  }

  return largestMatch;
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );
}

function summarizeProjectContext(context: ParsedRequirementContext) {
  const parts = [
    context.cabinets > 0 ? formatCount(context.cabinets, 'cabinet') : null,
    context.wardrobes > 0 ? formatCount(context.wardrobes, 'wardrobe shutter') : null,
    context.drawers > 0 ? formatCount(context.drawers, 'drawer') : null,
    context.doors > 0 ? formatCount(context.doors, 'door') : null,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(' and ');
  }

  if (context.hasCabinetLanguage) {
    return 'your cabinet setup';
  }

  if (context.hasDrawerLanguage) {
    return 'your drawer setup';
  }

  if (context.hasLockLanguage) {
    return 'your door hardware requirement';
  }

  return 'that project brief';
}

function hasAnyToken(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

function normalizeQuantity(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCount(value: number, label: string) {
  return `${value} ${label}${value === 1 ? '' : 's'}`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
