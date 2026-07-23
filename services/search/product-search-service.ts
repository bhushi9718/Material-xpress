import type { Category, Product } from '@/constants/material-data';
import { categories, products } from '@/constants/material-data';

type SearchableProduct = Product & {
  keywords?: string[];
};

type IndexedProduct = {
  allTokens: string[];
  categoryText: string;
  id: string;
  keywordText: string;
  nameText: string;
  product: SearchableProduct;
  searchText: string;
  subtitleText: string;
};

type SearchIndex = {
  categoryIndex: Map<string, Category>;
  prefixIndex: Map<string, Set<string>>;
  productIndex: Map<string, IndexedProduct>;
  tokenDictionary: string[];
};

export type SearchSuggestion = {
  accent?: string;
  categoryId?: string;
  description?: string;
  icon?: string;
  id: string;
  kind: 'product' | 'category' | 'spell' | 'history';
  label: string;
  query?: string;
};

export type ProductSearchResponse = {
  correctedQuery: string | null;
  results: SearchableProduct[];
  suggestions: SearchSuggestion[];
  total: number;
};

const REMOTE_SEARCH_ENDPOINT = process.env.EXPO_PUBLIC_FIREBASE_SEARCH_ENDPOINT;
const MAX_EDIT_DISTANCE = 2;
const LOCAL_INDEX = buildSearchIndex(
  products as SearchableProduct[],
  categories
);

export async function searchProducts(params: {
  categoryId?: string;
  limit?: number;
  query: string;
  suggestionLimit?: number;
}): Promise<ProductSearchResponse> {
  if (REMOTE_SEARCH_ENDPOINT) {
    const remoteResults = await tryRemoteFirebaseSearch(params);
    if (remoteResults) {
      return remoteResults;
    }
  }

  return searchLocalProducts(LOCAL_INDEX, params);
}

export function getInstantSearchSuggestions(params: {
  categoryId?: string;
  history?: string[];
  limit?: number;
  query: string;
}): SearchSuggestion[] {
  const { categoryId, history = [], limit = 6, query } = params;
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return history.slice(0, limit).map((item) => ({
      id: `history-${item}`,
      kind: 'history',
      label: item,
      query: item,
    }));
  }

  const localResults = searchLocalProducts(LOCAL_INDEX, {
    categoryId,
    limit: Math.max(limit, 6),
    query,
    suggestionLimit: limit,
  });

  return localResults.suggestions.slice(0, limit);
}

function buildSearchIndex(
  productList: SearchableProduct[],
  categoryList: Category[]
): SearchIndex {
  const prefixIndex = new Map<string, Set<string>>();
  const productIndex = new Map<string, IndexedProduct>();
  const tokenDictionary = new Set<string>();

  for (const product of productList) {
    const nameText = normalizeText(product.name);
    const categoryText = normalizeText(product.category);
    const subtitleText = normalizeText(product.subtitle);
    const keywordText = normalizeText((product.keywords ?? []).join(' '));
    const allTokens = uniqueTokens(
      tokenizeText(`${nameText} ${categoryText} ${subtitleText} ${keywordText}`)
    );

    const indexedProduct: IndexedProduct = {
      allTokens,
      categoryText,
      id: product.id,
      keywordText,
      nameText,
      product,
      searchText: `${nameText} ${categoryText} ${subtitleText} ${keywordText}`.trim(),
      subtitleText,
    };

    productIndex.set(product.id, indexedProduct);

    for (const token of allTokens) {
      tokenDictionary.add(token);

      for (let length = 1; length <= token.length; length += 1) {
        const prefix = token.slice(0, length);
        const prefixMatches = prefixIndex.get(prefix) ?? new Set<string>();
        prefixMatches.add(product.id);
        prefixIndex.set(prefix, prefixMatches);
      }
    }
  }

  return {
    categoryIndex: new Map(categoryList.map((category) => [category.id, category])),
    prefixIndex,
    productIndex,
    tokenDictionary: [...tokenDictionary],
  };
}

async function tryRemoteFirebaseSearch(params: {
  categoryId?: string;
  limit?: number;
  query: string;
  suggestionLimit?: number;
}) {
  if (!REMOTE_SEARCH_ENDPOINT) {
    return null;
  }

  try {
    const requestUrl = new URL(REMOTE_SEARCH_ENDPOINT);
    requestUrl.searchParams.set('q', params.query);
    requestUrl.searchParams.set('limit', `${params.limit ?? 40}`);
    requestUrl.searchParams.set(
      'suggestionLimit',
      `${params.suggestionLimit ?? 6}`
    );

    if (params.categoryId) {
      requestUrl.searchParams.set('categoryId', params.categoryId);
    }

    const response = await fetch(requestUrl.toString());

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ProductSearchResponse;

    if (!Array.isArray(payload.results) || !Array.isArray(payload.suggestions)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.warn('Remote Firebase search unavailable, falling back to local index.', error);
    return null;
  }
}

function searchLocalProducts(
  index: SearchIndex,
  params: {
    categoryId?: string;
    limit?: number;
    query: string;
    suggestionLimit?: number;
  }
): ProductSearchResponse {
  const limit = params.limit ?? 40;
  const suggestionLimit = params.suggestionLimit ?? 6;
  const normalizedQuery = normalizeText(params.query);
  const queryTokens = uniqueTokens(tokenizeText(normalizedQuery));

  const directMatches = scoreMatches(index, queryTokens, normalizedQuery, params.categoryId);
  const correctedTokens = resolveCorrectedTokens(index, queryTokens);
  const correctedQuery =
    correctedTokens.length > 0 && correctedTokens.join(' ') !== queryTokens.join(' ')
      ? correctedTokens.join(' ')
      : null;

  const fuzzyMatches =
    directMatches.length === 0 && correctedTokens.length > 0
      ? scoreMatches(
          index,
          correctedTokens,
          correctedQuery ?? normalizedQuery,
          params.categoryId
        )
      : [];

  const activeMatches = directMatches.length > 0 ? directMatches : fuzzyMatches;
  const fallbackMatches =
    activeMatches.length === 0 && !normalizedQuery
      ? scoreMatches(index, [], '', params.categoryId)
      : activeMatches;

  const results = fallbackMatches
    .slice(0, limit)
    .map((match) => match.product);

  const suggestions = buildSuggestions({
    categoryId: params.categoryId,
    correctedQuery,
    directMatches,
    index,
    normalizedQuery,
    suggestionLimit,
  });

  return {
    correctedQuery,
    results,
    suggestions,
    total: fallbackMatches.length,
  };
}

function scoreMatches(
  index: SearchIndex,
  queryTokens: string[],
  normalizedQuery: string,
  categoryId?: string
) {
  const candidateIds =
    queryTokens.length > 0
      ? gatherCandidateIds(index, queryTokens)
      : new Set(index.productIndex.keys());

  const scoredMatches: Array<{ product: SearchableProduct; score: number }> = [];

  for (const candidateId of candidateIds) {
    const indexedProduct = index.productIndex.get(candidateId);

    if (!indexedProduct) {
      continue;
    }

    if (categoryId && indexedProduct.product.categoryId !== categoryId) {
      continue;
    }

    let score = 0;

    if (!normalizedQuery) {
      score = 10;
    } else {
      if (indexedProduct.nameText.startsWith(normalizedQuery)) {
        score += 140;
      } else if (indexedProduct.nameText.includes(normalizedQuery)) {
        score += 100;
      }

      if (indexedProduct.categoryText.includes(normalizedQuery)) {
        score += 60;
      }

      if (indexedProduct.subtitleText.includes(normalizedQuery)) {
        score += 36;
      }

      if (indexedProduct.keywordText.includes(normalizedQuery)) {
        score += 52;
      }

      for (const token of queryTokens) {
        if (indexedProduct.allTokens.includes(token)) {
          score += 28;
        } else if (indexedProduct.nameText.includes(token)) {
          score += 14;
        } else if (indexedProduct.searchText.includes(token)) {
          score += 10;
        }
      }
    }

    if (indexedProduct.product.tag) {
      score += 6;
    }

    if (score > 0) {
      scoredMatches.push({ product: indexedProduct.product, score });
    }
  }

  return scoredMatches.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.product.name.localeCompare(right.product.name);
  });
}

function gatherCandidateIds(index: SearchIndex, queryTokens: string[]) {
  const candidateIds = new Set<string>();

  for (const token of queryTokens) {
    const prefixMatches = index.prefixIndex.get(token);

    if (prefixMatches) {
      for (const matchId of prefixMatches) {
        candidateIds.add(matchId);
      }
      continue;
    }

    for (const dictionaryToken of index.tokenDictionary) {
      if (
        dictionaryToken.startsWith(token) ||
        editDistance(dictionaryToken, token, MAX_EDIT_DISTANCE) <= MAX_EDIT_DISTANCE
      ) {
        for (const matchId of index.prefixIndex.get(dictionaryToken) ?? []) {
          candidateIds.add(matchId);
        }
      }
    }
  }

  return candidateIds;
}

function resolveCorrectedTokens(index: SearchIndex, queryTokens: string[]) {
  return queryTokens.map((token) => {
    if (index.prefixIndex.has(token) || index.tokenDictionary.includes(token)) {
      return token;
    }

    let bestToken = token;
    let bestDistance = MAX_EDIT_DISTANCE + 1;

    for (const dictionaryToken of index.tokenDictionary) {
      if (
        Math.abs(dictionaryToken.length - token.length) > MAX_EDIT_DISTANCE ||
        dictionaryToken.charAt(0) !== token.charAt(0)
      ) {
        continue;
      }

      const distance = editDistance(dictionaryToken, token, MAX_EDIT_DISTANCE);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestToken = dictionaryToken;
      }
    }

    return bestToken;
  });
}

function buildSuggestions(params: {
  categoryId?: string;
  correctedQuery: string | null;
  directMatches: Array<{ product: SearchableProduct; score: number }>;
  index: SearchIndex;
  normalizedQuery: string;
  suggestionLimit: number;
}) {
  const {
    categoryId,
    correctedQuery,
    directMatches,
    index,
    normalizedQuery,
    suggestionLimit,
  } = params;

  const suggestions: SearchSuggestion[] = [];

  if (correctedQuery && correctedQuery !== normalizedQuery) {
    suggestions.push({
      id: `spell-${correctedQuery}`,
      kind: 'spell',
      label: correctedQuery,
      description: 'Use the closest match',
      icon: 'sparkles-outline',
      query: correctedQuery,
    });
  }

  for (const match of directMatches.slice(0, suggestionLimit)) {
    suggestions.push({
      id: `product-${match.product.id}`,
      kind: 'product',
      label: match.product.name,
      description: `${match.product.category} · ${match.product.subtitle}`,
      accent: match.product.accent,
      icon: match.product.icon,
      query: match.product.name,
    });
  }

  for (const category of index.categoryIndex.values()) {
    if (
      normalizedQuery &&
      (normalizeText(category.name).includes(normalizedQuery) ||
        normalizeText(category.blurb).includes(normalizedQuery))
    ) {
      suggestions.push({
        id: `category-${category.id}`,
        kind: 'category',
        label: category.name,
        description: category.blurb,
        accent: category.accent,
        categoryId: category.id,
        icon: category.icon,
        query: category.name,
      });
    }
  }

  const filteredSuggestions = suggestions.filter((suggestion, indexPosition, array) => {
    if (categoryId && suggestion.kind === 'category' && suggestion.categoryId === categoryId) {
      return false;
    }

    return array.findIndex((item) => item.label === suggestion.label) === indexPosition;
  });

  return filteredSuggestions.slice(0, suggestionLimit);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeText(value: string) {
  return value.split(' ').filter((token) => token.length > 1);
}

function uniqueTokens(tokens: string[]) {
  return [...new Set(tokens)];
}

function editDistance(left: string, right: string, maxDistance: number) {
  if (left === right) {
    return 0;
  }

  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    let smallestInRow = row;
    let diagonal = row - 1;
    previousRow[0] = row;

    for (let column = 1; column <= right.length; column += 1) {
      const temporary = previousRow[column];
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      previousRow[column] = Math.min(
        previousRow[column] + 1,
        previousRow[column - 1] + 1,
        diagonal + cost
      );
      diagonal = temporary;

      if (previousRow[column] < smallestInRow) {
        smallestInRow = previousRow[column];
      }
    }

    if (smallestInRow > maxDistance) {
      return maxDistance + 1;
    }
  }

  return previousRow[right.length];
}
