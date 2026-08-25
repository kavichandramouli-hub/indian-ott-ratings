/*
  # Remove anonymous INSERT access to content_cache (F1)

  The table is a public metadata cache and is not written by the app
  (caching happens in the browser's localStorage). An unconditional
  INSERT policy plus table-level grant let anyone with the publishable
  key add unlimited rows.

  ## Changes
  - Drop policy "Anyone can insert cache"
  - Revoke INSERT on content_cache from anon and authenticated
  - Public SELECT is retained
*/

DROP POLICY IF EXISTS "Anyone can insert cache" ON content_cache;

REVOKE INSERT ON content_cache FROM anon;
REVOKE INSERT ON content_cache FROM authenticated;
