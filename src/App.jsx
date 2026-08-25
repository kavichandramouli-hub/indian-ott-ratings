import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import FilterBar from './components/FilterBar.jsx';
import ContentGrid from './components/ContentGrid.jsx';
import ContentDetailModal from './components/ContentDetailModal.jsx';
import Footer from './components/Footer.jsx';
import { fetchDiscoverPage, fetchImdbIds, searchTitles } from './services/tmdb.js';
import { fetchRatingsBatch } from './services/omdb.js';
import PLATFORMS from './constants/platforms.js';

export default function App() {
  const [titles, setTitles] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [ratingsMap, setRatingsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedType, setSelectedType] = useState('both');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [pageState, setPageState] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const loadIdRef = useRef(0);
  const searchTimerRef = useRef(null);
  const searchIdRef = useRef(0);

  const loadInitial = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoading(true);
    setTitles([]);
    setRatingsMap({});
    setPageState({});
    setHasMore(true);
    setError(null);

    const allPlatforms = PLATFORMS.filter((p) => p.id !== 'all');
    const types = selectedType === 'both' ? ['movie', 'tv'] : [selectedType];

    const jobs = allPlatforms.flatMap((platform) =>
      platform.providerIds.flatMap((providerId) =>
        types.map((type) => ({ providerId, type, platformId: platform.id }))
      )
    );

    const results = await Promise.allSettled(
      jobs.map(({ providerId, type }) => fetchDiscoverPage(providerId, type, 1))
    );

    if (loadId !== loadIdRef.current) return;

    const allFailed = results.length > 0 && results.every((r) => r.status === 'rejected');
    if (allFailed) {
      setError('Failed to load content. Check your API keys and try again.');
      setLoading(false);
      return;
    }

    const newPageState = {};
    const platformsByTmdbId = new Map();
    const titleByTmdbId = new Map();

    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      const { providerId, type, platformId } = jobs[i];
      const key = `${providerId}_${type}`;
      newPageState[key] = {
        currentPage: 1,
        totalPages: result.value.totalPages,
        providerId,
        type,
        platformId,
      };

      for (const item of result.value.items) {
        if (!titleByTmdbId.has(item.tmdbId)) {
          titleByTmdbId.set(item.tmdbId, { ...item, platformId });
          platformsByTmdbId.set(item.tmdbId, new Set());
        }
        platformsByTmdbId.get(item.tmdbId).add(platformId);
      }
    });

    const enriched = [...titleByTmdbId.values()].map((title) => ({
      ...title,
      platformIds: [...platformsByTmdbId.get(title.tmdbId)],
    }));

    setTitles(enriched);
    setPageState(newPageState);
    setHasMore(Object.values(newPageState).some((s) => s.currentPage < s.totalPages));
    setLoading(false);

    enrichWithRatings(enriched, loadId);
  }, [selectedType]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function enrichWithRatings(items, loadId) {
    const types = [...new Set(items.map((i) => i.type))];

    const imdbBatches = types.map((type) => {
      const typeItems = items.filter((i) => i.type === type);
      return fetchImdbIds(typeItems.map((i) => i.tmdbId), type);
    });

    const imdbResults = await Promise.all(imdbBatches);
    if (loadId !== loadIdRef.current) return;

    const imdbIdMap = Object.assign({}, ...imdbResults);

    setTitles((prev) =>
      prev.map((t) => ({
        ...t,
        imdbId: imdbIdMap[t.tmdbId] ?? t.imdbId ?? null,
      }))
    );

    const imdbIds = Object.values(imdbIdMap).filter(Boolean);
    if (imdbIds.length === 0) return;

    const ratings = await fetchRatingsBatch(imdbIds);
    if (loadId !== loadIdRef.current) return;

    setRatingsMap((prev) => ({ ...prev, ...ratings }));
  }

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    const searchId = ++searchIdRef.current;

    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchTitles(query, selectedType);
        if (searchId !== searchIdRef.current) return;
        setSearchResults(results);

        if (results.length > 0) {
          enrichSearchWithRatings(results, searchId);
        }
      } catch (err) {
        console.error('Search failed:', err);
        if (searchId === searchIdRef.current) setSearchResults([]);
      } finally {
        if (searchId === searchIdRef.current) setSearchLoading(false);
      }
    }, 350);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, selectedType]);

  async function enrichSearchWithRatings(items, searchId) {
    const types = [...new Set(items.map((i) => i.type))];
    const imdbBatches = types.map((type) => {
      const typeItems = items.filter((i) => i.type === type);
      return fetchImdbIds(typeItems.map((i) => i.tmdbId), type);
    });

    const imdbResults = await Promise.all(imdbBatches);
    if (searchId !== searchIdRef.current) return;

    const imdbIdMap = Object.assign({}, ...imdbResults);

    setSearchResults((prev) =>
      prev?.map((t) => ({ ...t, imdbId: imdbIdMap[t.tmdbId] ?? t.imdbId ?? null })) ?? null
    );

    const imdbIds = Object.values(imdbIdMap).filter(Boolean);
    if (imdbIds.length === 0) return;

    const ratings = await fetchRatingsBatch(imdbIds);
    if (searchId !== searchIdRef.current) return;

    setRatingsMap((prev) => ({ ...prev, ...ratings }));
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const loadId = loadIdRef.current;
    const jobsToFetch = Object.entries(pageState)
      .filter(([, s]) => s.currentPage < s.totalPages)
      .map(([key, s]) => ({ key, ...s, nextPage: s.currentPage + 1 }));

    if (jobsToFetch.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const results = await Promise.allSettled(
      jobsToFetch.map(({ providerId, type, nextPage }) =>
        fetchDiscoverPage(providerId, type, nextPage)
      )
    );

    if (loadId !== loadIdRef.current) {
      setLoadingMore(false);
      return;
    }

    const updatedPageState = { ...pageState };
    const newItems = [];

    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      const { key, platformId, type, nextPage, totalPages } = jobsToFetch[i];
      updatedPageState[key] = {
        ...updatedPageState[key],
        currentPage: nextPage,
        totalPages: result.value.totalPages || totalPages,
      };

      for (const item of result.value.items) {
        newItems.push({ ...item, platformId });
      }
    });

    setTitles((prev) => {
      const existingIds = new Set(prev.map((t) => t.tmdbId));
      const platformsByTmdbId = new Map();
      for (const t of prev) {
        platformsByTmdbId.set(t.tmdbId, new Set(t.platformIds || [t.platformId]));
      }

      const trulyNew = [];
      for (const item of newItems) {
        if (existingIds.has(item.tmdbId)) {
          platformsByTmdbId.get(item.tmdbId)?.add(item.platformId);
        } else {
          existingIds.add(item.tmdbId);
          platformsByTmdbId.set(item.tmdbId, new Set([item.platformId]));
          trulyNew.push({ ...item, platformIds: [item.platformId] });
        }
      }

      const updated = prev.map((t) => ({
        ...t,
        platformIds: [...(platformsByTmdbId.get(t.tmdbId) || t.platformIds)],
      }));

      return [...updated, ...trulyNew];
    });

    setPageState(updatedPageState);
    setHasMore(Object.values(updatedPageState).some((s) => s.currentPage < s.totalPages));
    setLoadingMore(false);

    if (newItems.length > 0) {
      enrichWithRatings(newItems, loadId);
    }
  }, [loadingMore, hasMore, pageState]);

  const isSearchMode = searchQuery.trim().length >= 2;
  const displayItems = isSearchMode ? (searchResults || []) : titles;

  const filteredTitles = useMemo(() => {
    let result = displayItems;

    if (!isSearchMode && selectedPlatform !== 'all') {
      result = result.filter((t) =>
        Array.isArray(t.platformIds)
          ? t.platformIds.includes(selectedPlatform)
          : t.platformId === selectedPlatform
      );
    }

    if (selectedGenres.length > 0) {
      result = result.filter((t) =>
        t.genreIds?.some((id) => selectedGenres.includes(id))
      );
    }

    return result;
  }, [displayItems, isSearchMode, selectedPlatform, selectedGenres]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {error && (
        <div className="bg-red-950 border-b border-red-900 text-red-300 text-sm px-4 py-3 text-center">
          {error}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <FilterBar
          selectedPlatform={selectedPlatform}
          onPlatformChange={setSelectedPlatform}
          selectedType={selectedType}
          onTypeChange={(t) => { setSelectedType(t); setSelectedGenres([]); }}
          selectedGenres={selectedGenres}
          onGenresChange={setSelectedGenres}
          resultCount={loading || searchLoading ? undefined : filteredTitles.length}
        />

        <ContentGrid
          items={filteredTitles}
          ratingsMap={ratingsMap}
          loading={isSearchMode ? searchLoading : loading}
          loadingMore={loadingMore}
          hasMore={isSearchMode ? false : hasMore}
          selectedPlatform={selectedPlatform}
          onCardClick={setSelectedTitle}
          onLoadMore={loadMore}
          onReset={() => { setSelectedGenres([]); setSearchQuery(''); }}
        />
      </main>

      <Footer />

      {selectedTitle && (
        <ContentDetailModal
          item={selectedTitle}
          onClose={() => setSelectedTitle(null)}
        />
      )}
    </div>
  );
}
