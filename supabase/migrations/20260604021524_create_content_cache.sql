/*
  # Create content_cache table

  ## Purpose
  Stores serialized API responses from TMDB and OMDb to prevent redundant network calls
  and stay within free-tier rate limits.

  ## New Tables
  - `content_cache`
    - `key` (text, primary key) — deterministic cache key built from query params
    - `data` (jsonb) — full API response payload
    - `created_at` (timestamptz) — used to expire stale entries (TTL: 24 hours)

  ## Security
  - RLS enabled; anon key may read and upsert cache rows (public read/write is fine
    because this table holds only public movie metadata, not user data)
*/

CREATE TABLE IF NOT EXISTS content_cache (
  key        text PRIMARY KEY,
  data       jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache"
  ON content_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert cache"
  ON content_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update cache"
  ON content_cache FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
