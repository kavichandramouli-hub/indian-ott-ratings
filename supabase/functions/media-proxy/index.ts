import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const CACHE_TTLS: Record<string, number> = {
  tmdb_discover: 24 * 60 * 60 * 1000,
  tmdb_detail: 30 * 24 * 60 * 60 * 1000,
  tmdb_search: 6 * 60 * 60 * 1000,
  ratings: 7 * 24 * 60 * 60 * 1000,
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getCacheKey(url: URL): { key: string; ttl: number } | null {
  const service = url.searchParams.get("service");
  const operation = url.searchParams.get("operation");

  if (service === "tmdb" && operation === "discover") {
    const type = url.searchParams.get("type");
    const providerId = url.searchParams.get("providerId");
    const page = url.searchParams.get("page") || "1";
    if (!((type === "movie" || type === "tv") && providerId && /^\d+$/.test(providerId))) return null;
    return { key: `proxy_tmdb_discover_${providerId}_${type}_p${page}`, ttl: CACHE_TTLS.tmdb_discover };
  }

  if (service === "tmdb" && operation === "detail") {
    const type = url.searchParams.get("type");
    const tmdbId = url.searchParams.get("tmdbId");
    if (!((type === "movie" || type === "tv") && tmdbId && /^\d+$/.test(tmdbId))) return null;
    return { key: `proxy_tmdb_detail_${type}_${tmdbId}`, ttl: CACHE_TTLS.tmdb_detail };
  }

  if (service === "tmdb" && operation === "detail_batch") {
    return null;
  }

  if (service === "ratings") {
    const imdbId = url.searchParams.get("imdbId");
    if (!(imdbId && /^tt\d+$/.test(imdbId))) return null;
    return { key: `proxy_ratings_${imdbId}`, ttl: CACHE_TTLS.ratings };
  }

  return null;
}

async function getCached(key: string, ttl: number) {
  const { data, error } = await supabase
    .from("content_cache")
    .select("data, created_at")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  if (Date.now() - Date.parse(data.created_at) > ttl) return null;
  return data.data;
}

async function setCached(key: string, value: unknown) {
  await supabase.from("content_cache").upsert({
    key,
    data: value,
    created_at: new Date().toISOString(),
  });
}

function cacheKey_for(type: string | null, tmdbId: string) {
  return `proxy_tmdb_detail_${type}_${tmdbId}`;
}

async function fetchTmdb(url: URL) {
  const key = Deno.env.get("TMDB_API_KEY");
  if (!key) throw new Error("TMDB service is not configured");

  const operation = url.searchParams.get("operation");
  const type = url.searchParams.get("type");

  if (operation === "discover") {
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const providerId = url.searchParams.get("providerId");
    const cache = getCacheKey(url);
    if (!cache) return jsonResponse({ error: "Invalid TMDB request" }, 400);

    const cached = await getCached(cache.key, cache.ttl);
    if (cached) return jsonResponse(cached);

    const tmdbUrl = new URL(`${TMDB_BASE}/discover/${type}`);
    tmdbUrl.searchParams.set("with_watch_providers", providerId ?? "");
    tmdbUrl.searchParams.set("watch_region", "IN");
    tmdbUrl.searchParams.set("with_watch_monetization_types", "flatrate");
    tmdbUrl.searchParams.set("sort_by", "popularity.desc");
    tmdbUrl.searchParams.set("page", String(page));
    tmdbUrl.searchParams.set("api_key", key);

    const response = await fetch(tmdbUrl);
    if (!response.ok) return jsonResponse({ error: `TMDB request failed (${response.status})` }, 502);
    const body = await response.json();

    const result = {
      results: Array.isArray(body.results) ? body.results : [],
      total_pages: body.total_pages ?? 0,
      total_results: body.total_results ?? 0,
      page,
    };

    await setCached(cache.key, result);
    return jsonResponse(result);
  }

  if (operation === "detail_batch") {
    const idsParam = url.searchParams.get("ids");
    if (!idsParam || !type) return jsonResponse({ error: "Invalid batch request" }, 400);
    const ids = idsParam.split(",").filter((id) => /^\d+$/.test(id)).slice(0, 20);
    if (ids.length === 0) return jsonResponse({ error: "No valid IDs" }, 400);

    const results: Record<string, unknown> = {};
    const uncached: string[] = [];

    await Promise.all(ids.map(async (tmdbId) => {
      const cacheKey = `proxy_tmdb_detail_${type}_${tmdbId}`;
      const cached = await getCached(cacheKey, CACHE_TTLS.tmdb_detail);
      if (cached) { results[tmdbId] = cached; } else { uncached.push(tmdbId); }
    }));

    await Promise.all(uncached.map(async (tmdbId) => {
      const detailUrl = new URL(`${TMDB_BASE}/${type}/${tmdbId}`);
      detailUrl.searchParams.set("api_key", key);
      detailUrl.searchParams.set("append_to_response", "external_ids");
      const response = await fetch(detailUrl);
      if (response.ok) {
        const detail = await response.json();
        const slim = { imdb_id: detail.external_ids?.imdb_id ?? null };
        await setCached(cacheKey_for(type, tmdbId), slim);
        results[tmdbId] = slim;
      } else {
        results[tmdbId] = { imdb_id: null };
      }
    }));

    return jsonResponse(results);
  }

  if (operation === "search") {
    const query = url.searchParams.get("query");
    if (!query || !type) return jsonResponse({ error: "Invalid search request" }, 400);
    const page = url.searchParams.get("page") || "1";
    const cacheKey = `proxy_tmdb_search_${type}_${encodeURIComponent(query.toLowerCase())}_p${page}`;
    const cached = await getCached(cacheKey, CACHE_TTLS.tmdb_search);
    if (cached) return jsonResponse(cached);

    const tmdbUrl = new URL(`${TMDB_BASE}/search/${type}`);
    tmdbUrl.searchParams.set("api_key", key);
    tmdbUrl.searchParams.set("query", query);
    tmdbUrl.searchParams.set("page", page);
    tmdbUrl.searchParams.set("region", "IN");
    tmdbUrl.searchParams.set("include_adult", "false");

    const response = await fetch(tmdbUrl);
    if (!response.ok) return jsonResponse({ error: `TMDB search failed (${response.status})` }, 502);
    const body = await response.json();
    const result = {
      results: Array.isArray(body.results) ? body.results : [],
      total_pages: body.total_pages ?? 0,
      total_results: body.total_results ?? 0,
      page: Number(page),
    };
    await setCached(cacheKey, result);
    return jsonResponse(result);
  }

  if (operation === "detail") {
    const cache = getCacheKey(url);
    if (!cache) return jsonResponse({ error: "Invalid TMDB request" }, 400);

    const cached = await getCached(cache.key, cache.ttl);
    if (cached) return jsonResponse(cached);

    const tmdbUrl = new URL(`${TMDB_BASE}/${type}/${url.searchParams.get("tmdbId")}`);
    tmdbUrl.searchParams.set("api_key", key);
    tmdbUrl.searchParams.set("append_to_response", "credits,external_ids");
    const response = await fetch(tmdbUrl);
    if (!response.ok) return jsonResponse({ error: `TMDB request failed (${response.status})` }, 502);
    const result = await response.json();
    await setCached(cache.key, result);
    return jsonResponse(result);
  }

  return jsonResponse({ error: "Invalid TMDB operation" }, 400);
}

async function fetchRatings(url: URL) {
  const imdbId = url.searchParams.get("imdbId");
  const cache = getCacheKey(url);
  if (!cache) return jsonResponse({ error: "Invalid ratings request" }, 400);

  const cached = await getCached(cache.key, cache.ttl);
  if (cached) return jsonResponse(cached);

  const omdbKey = Deno.env.get("OMDB_API_KEY");
  const mdblistKey = Deno.env.get("MDBLIST_API_KEY");
  const result = await fetchSingleRating(imdbId!, omdbKey, mdblistKey);
  if (result.imdbRating !== "N/A" || result.rtScore !== "N/A") await setCached(cache.key, result);
  return jsonResponse(result);
}

async function fetchSingleRating(imdbId: string, omdbKey: string | undefined, mdblistKey: string | undefined): Promise<{ imdbRating: string; rtScore: string }> {
  const result: { imdbRating: string; rtScore: string } = { imdbRating: "N/A", rtScore: "N/A" };

  if (omdbKey) {
    const response = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`);
    if (response.ok) {
      const body = await response.json();
      if (body.Response === "True") {
        result.imdbRating = body.imdbRating ?? "N/A";
        result.rtScore = body.Ratings?.find((rating: { Source?: string }) => rating.Source === "Rotten Tomatoes")?.Value ?? "N/A";
      }
    }
  }

  if (mdblistKey && (result.imdbRating === "N/A" || result.rtScore === "N/A")) {
    const response = await fetch(`https://mdblist.com/api/?apikey=${mdblistKey}&i=${imdbId}`);
    if (response.ok) {
      const body = await response.json();
      if (Array.isArray(body.ratings)) {
        if (result.rtScore === "N/A") {
          const rating = body.ratings.find((entry: { source?: string }) => entry.source === "tomatoes");
          if (rating?.value != null) result.rtScore = `${rating.value}%`;
        }
        if (result.imdbRating === "N/A") {
          const rating = body.ratings.find((entry: { source?: string }) => entry.source === "imdb");
          if (rating?.value != null) result.imdbRating = String(rating.value);
        }
      }
    }
  }

  return result;
}

async function fetchRatingsBatch(url: URL) {
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) return jsonResponse({ error: "Missing ids param" }, 400);

  const ids = idsParam.split(",").filter((id) => /^tt\d+$/.test(id)).slice(0, 20);
  if (ids.length === 0) return jsonResponse({ error: "No valid IMDb IDs" }, 400);

  const results: Record<string, { imdbRating: string; rtScore: string }> = {};
  const omdbKey = Deno.env.get("OMDB_API_KEY");
  const mdblistKey = Deno.env.get("MDBLIST_API_KEY");
  const uncached: string[] = [];

  await Promise.all(ids.map(async (imdbId) => {
    const cacheKey = `proxy_ratings_${imdbId}`;
    const cached = await getCached(cacheKey, CACHE_TTLS.ratings);
    if (cached) { results[imdbId] = cached as { imdbRating: string; rtScore: string }; }
    else { uncached.push(imdbId); }
  }));

  await Promise.all(uncached.map(async (imdbId) => {
    const result = await fetchSingleRating(imdbId, omdbKey, mdblistKey);
    if (result.imdbRating !== "N/A" || result.rtScore !== "N/A") await setCached(`proxy_ratings_${imdbId}`, result);
    results[imdbId] = result;
  }));

  return jsonResponse(results);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);
    const url = new URL(request.url);
    const service = url.searchParams.get("service");
    if (service === "tmdb") return await fetchTmdb(url);
    if (service === "ratings") {
      if (url.searchParams.has("ids")) return await fetchRatingsBatch(url);
      return await fetchRatings(url);
    }
    return jsonResponse({ error: "Invalid service" }, 400);
  } catch (error) {
    console.error("media-proxy error:", error);
    return jsonResponse({ error: "Upstream service unavailable" }, 502);
  }
});
