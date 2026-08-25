const DISCOVER_TTL = 24 * 60 * 60 * 1000;     // 24 hours
const DETAIL_TTL = 30 * 24 * 60 * 60 * 1000;  // 30 days
const RATINGS_TTL = 7 * 24 * 60 * 60 * 1000;  // 7 days

function getTtl(key) {
  if (key.startsWith('omdb_') || key.startsWith('ratings_')) return RATINGS_TTL;
  if (key.startsWith('ott_detail_')) return DETAIL_TTL;
  return DISCOVER_TTL;
}

export function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    const ttl = getTtl(key);
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCached(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function clearExpiredCache() {
  const now = Date.now();
  const keys = Object.keys(localStorage);
  for (const k of keys) {
    if (!k.startsWith('ott_') && !k.startsWith('omdb_') && !k.startsWith('ratings_')) continue;
    try {
      const { timestamp } = JSON.parse(localStorage.getItem(k));
      const ttl = getTtl(k);
      if (now - timestamp > ttl) localStorage.removeItem(k);
    } catch {
      localStorage.removeItem(k);
    }
  }
}
