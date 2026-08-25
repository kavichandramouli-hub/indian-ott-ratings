/*
  # Remove client DELETE privilege on content_cache (F3)

  DELETE was granted to anon and authenticated even though no DELETE
  policy exists. Removing the grant makes the table read-only for
  clients regardless of future policy changes.

  ## Changes
  - Revoke DELETE on content_cache from anon and authenticated
*/

REVOKE DELETE ON content_cache FROM anon;
REVOKE DELETE ON content_cache FROM authenticated;
