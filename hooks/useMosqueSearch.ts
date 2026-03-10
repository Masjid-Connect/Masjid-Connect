import { useState, useEffect, useCallback, useRef } from 'react';
import { mosques } from '@/lib/api';
import { getUserLocation } from '@/lib/storage';
import type { Mosque } from '@/types';

export interface MosqueWithDistance extends Mosque {
  distance?: number;
}

export function useMosqueSearch() {
  const [results, setResults] = useState<MosqueWithDistance[]>([]);
  const [nearbyMosques, setNearbyMosques] = useState<MosqueWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch nearby mosques on mount
  useEffect(() => {
    fetchNearby();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchMosques(searchQuery.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const fetchNearby = useCallback(async () => {
    try {
      const location = await getUserLocation();
      if (!location) return;
      setIsLoading(true);
      const nearby = await mosques.nearby(location.latitude, location.longitude, 50);
      setNearbyMosques(nearby);
    } catch {
      // Silently fail — user may not have location
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchMosques = async (query: string) => {
    setIsLoading(true);
    try {
      const data = await mosques.list(query);
      setResults(data.items);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    results,
    nearbyMosques,
    isLoading,
    searchQuery,
    setSearchQuery,
    refresh: fetchNearby,
  };
}
