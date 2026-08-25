/*
  # Remove anonymous UPDATE access to content_cache (F2)

  An unconditional UPDATE policy let anyone overwrite the payload of any
  cached row (cache poisoning). Nothing in the application updates this
  table.

  ## Changes
  - Drop policy "Anyone can update cache"
  - Revoke UPDATE on content_cache from anon and authenticated
*/

DROP POLICY IF EXISTS "Anyone can update cache" ON content_cache;

REVOKE UPDATE ON content_cache FROM anon;
REVOKE UPDATE ON content_cache FROM authenticated;
