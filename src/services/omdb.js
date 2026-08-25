import { getCached, setCached } from './cache.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/media-proxy`;

export async function fetchRatings(imdbId) {
  if (!imdbId) return { imdbRating: 'N/A', rtScore: 'N/A' };

  const cacheKey = `ratings_${imdbId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${PROXY_URL}?${new URLSearchParams({ service: 'ratings', imdbId })}`);
    if (!response.ok) throw new Error(`Proxy request failed (${response.status})`);
    const result = await response.json();
    if (result && typeof result.imdbRating === 'string' && typeof result.rtScore === 'string') {
      if (result.imdbRating !== 'N/A' || result.rtScore !== 'N/A') setCached(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.error('ratings fetch error:', err);
  }

  return { imdbRating: 'N/A', rtScore: 'N/A' };
}

export async function fetchRatingsBatch(imdbIds) {
  if (!imdbIds.length) return {};

  const results = {};
  const uncached = [];

  for (const id of imdbIds) {
    if (!id) continue;
    const cacheKey = `ratings_${id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      results[id] = cached;
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
      const response = await fetch(
        `${PROXY_URL}?${new URLSearchParams({ service: 'ratings', ids: batch.join(',') })}`
      );
      if (!response.ok) throw new Error(`Proxy request failed (${response.status})`);
      const data = await response.json();

      for (const [id, rating] of Object.entries(data)) {
        results[id] = rating;
        if (rating.imdbRating !== 'N/A' || rating.rtScore !== 'N/A') {
          setCached(`ratings_${id}`, rating);
        }
      }
    } catch (err) {
      console.error('ratings batch error:', err);
      for (const id of batch) {
        results[id] = { imdbRating: 'N/A', rtScore: 'N/A' };
      }
    }
  }

  return results;
}
