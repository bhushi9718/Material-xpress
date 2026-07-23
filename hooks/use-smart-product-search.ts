import AsyncStorage from '@react-native-async-storage/async-storage';
import { startTransition, useDeferredValue, useEffect, useState } from 'react';

import type { Product } from '@/constants/material-data';
import {
  getInstantSearchSuggestions,
  searchProducts,
  type SearchSuggestion,
} from '@/services/search/product-search-service';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const SEARCH_HISTORY_KEY = '@material_xpress_search_history';
const MAX_HISTORY_ITEMS = 6;

type UseSmartProductSearchParams = {
  activeCategoryId?: string;
  initialQuery?: string;
};

export function useSmartProductSearch({
  activeCategoryId,
  initialQuery = '',
}: UseSmartProductSearchParams) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const debouncedQuery = useDebouncedValue(deferredQuery, 260);
  const isLoading = requestInFlight || deferredQuery !== debouncedQuery;

  useEffect(() => {
    async function loadHistory() {
      try {
        const savedHistory = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);

        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('Unable to load search history', error);
      }
    }

    loadHistory();
  }, []);

  useEffect(() => {
    setSuggestions(
      getInstantSearchSuggestions({
        categoryId: activeCategoryId,
        history,
        query: deferredQuery,
      })
    );
  }, [activeCategoryId, deferredQuery, history]);

  useEffect(() => {
    let ignore = false;

    async function runSearch() {
      setRequestInFlight(true);

      try {
        const response = await searchProducts({
          categoryId: activeCategoryId,
          limit: 40,
          query: debouncedQuery,
          suggestionLimit: 6,
        });

        if (ignore) {
          return;
        }

        startTransition(() => {
          setCorrectedQuery(response.correctedQuery);
          setResults(response.results);
        });
      } catch (error) {
        if (!ignore) {
          console.error('Search failed', error);
          setCorrectedQuery(null);
          setResults([]);
        }
      } finally {
        if (!ignore) {
          setRequestInFlight(false);
        }
      }
    }

    runSearch();

    return () => {
      ignore = true;
    };
  }, [activeCategoryId, debouncedQuery]);

  async function saveSearchTerm(nextValue?: string) {
    const value = (nextValue ?? query).trim();

    if (value.length < 2) {
      return;
    }

    const nextHistory = [value, ...history.filter((item) => item !== value)].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    setHistory(nextHistory);

    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (error) {
      console.error('Unable to save search history', error);
    }
  }

  async function clearHistory() {
    setHistory([]);

    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Unable to clear search history', error);
    }
  }

  return {
    clearHistory,
    correctedQuery,
    history,
    isLoading,
    query,
    results,
    saveSearchTerm,
    setQuery,
    suggestions,
  };
}
