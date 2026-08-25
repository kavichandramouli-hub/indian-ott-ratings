import { getCached, setCached, clearExpiredCache } from './cache.js';

clearExpiredCache();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/media-proxy`;
const IMG = 'https://image.tmdb.org/t/p/';

async function requestProxy(params) {
  const response = await fetch(`${PROXY_URL}?${new URLSearchParams(params)}`);
  if (!response.ok) throw new Error(`Proxy request failed (${response.status})`);
  return response.json();
}

export async function fetchDiscoverPage(providerId, type, page = 1) {
  const cacheKey = `ott_tmdb_discover_${providerId}_${type}_p${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const result = await requestProxy({
      service: 'tmdb',
      operation: 'discover',
      providerId: String(providerId),
      type,
      page: String(page),
    });

    const data = {
      items: (result.results || []).map((item) => ({
        tmdbId: item.id,
        title: item.name ?? item.title,
        type,
        year: (item.first_air_date ?? item.release_date ?? '').slice(0, 4),
        posterUrl: item.poster_path ? `${IMG}w342${item.poster_path}` : null,
        synopsis: item.overview,
        genreIds: item.genre_ids,
      })),
      totalPages: result.total_pages || 0,
      totalResults: result.total_results || 0,
      page: result.page || page,
    };

    setCached(cacheKey, data);
    return data;
  } catch (err) {
    console.error('fetchDiscoverPage error:', err);
    return { items: [], totalPages: 0, totalResults: 0, page };
  }
}

export async function fetchImdbIds(tmdbIds, type) {
  if (!tmdbIds.length) return {};

  const uncached = [];
  const results = {};

  for (const id of tmdbIds) {
    const cacheKey = `ott_detail_${type}_${id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      results[id] = cached.imdb_id || cached.imdbId || null;
    } else {
      uncached.push(id);
    }
  }

  if (uncached.length === 0) return results;

  const batches = [];
  for (let i = 0; i < uncached.length; i += 20) {
    batches.push(uncached.slice(i, i + 20));
  }

  for (const batch of batches) {
    try {
      const data = await requestProxy({
        service: 'tmdb',
        operation: 'detail_batch',
        type,
        ids: batch.join(','),
      });

      for (const [id, detail] of Object.entries(data)) {
        const imdbId = detail?.imdb_id ?? null;
        results[id] = imdbId;
        setCached(`ott_detail_${type}_${id}`, { imdb_id: imdbId });
      }
    } catch (err) {
      console.error('fetchImdbIds batch error:', err);
      for (const id of batch) {
        results[id] = null;
      }
    }
  }

  return results;
}

export async function fetchTitleDetail(tmdbId, type) {
  const cacheKey = `ott_detail_full_${type}_${tmdbId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const item = await requestProxy({
      service: 'tmdb',
      operation: 'detail',
      type,
      tmdbId: String(tmdbId),
    });
    const data = {
      imdbId: item.external_ids?.imdb_id ?? null,
      synopsis: item.overview,
      genres: item.genres?.map((g) => g.name) ?? [],
      cast: item.credits?.cast?.slice(0, 4).map((c) => c.name) ?? [],
      posterUrl: item.poster_path ? `${IMG}w500${item.poster_path}` : null,
    };
    setCached(cacheKey, data);
    return data;
  } catch (err) {
    console.error('fetchTitleDetail error:', err);
    return { imdbId: null, synopsis: '', genres: [], cast: [], posterUrl: null };
  }
}

export async function searchTitles(query, type = 'both') {
  if (!query || !query.trim()) return [];

  const types = type === 'both' ? ['movie', 'tv'] : [type];
  const promises = types.map(async (t) => {
    const cacheKey = `ott_tmdb_search_${t}_${query.toLowerCase().trim()}_p1`;
    const cached = getCached(cacheKey);
    if (cached) return { items: cached.items || formatSearchResults(cached, t), type: t };

    try {
      const result = await requestProxy({
        service: 'tmdb',
        operation: 'search',
        type: t,
        query: query.trim(),
        page: '1',
      });

      const items = (result.results || []).map((item) => ({
        tmdbId: item.id,
        title: item.name ?? item.title,
        type: t,
        year: (item.first_air_date ?? item.release_date ?? '').slice(0, 4),
        posterUrl: item.poster_path ? `${IMG}w342${item.poster_path}` : null,
        synopsis: item.overview,
        genreIds: item.genre_ids,
      }));

      setCached(cacheKey, { items, totalResults: result.total_results });
      return { items, type: t };
    } catch (err) {
      console.error('searchTitles error:', err);
      return { items: [], type: t };
    }
  });

  const results = await Promise.all(promises);
  const seen = new Set();
  const merged = [];
  for (const { items } of results) {
    for (const item of items) {
      if (!seen.has(item.tmdbId)) {
        seen.add(item.tmdbId);
        merged.push(item);
      }
    }
  }
  return merged;
}

function formatSearchResults(data, type) {
  return (data.results || []).map((item) => ({
    tmdbId: item.id,
    title: item.name ?? item.title,
    type,
    year: (item.first_air_date ?? item.release_date ?? '').slice(0, 4),
    posterUrl: item.poster_path ? `${IMG}w342${item.poster_path}` : null,
    synopsis: item.overview,
    genreIds: item.genre_ids,
  }));
}
