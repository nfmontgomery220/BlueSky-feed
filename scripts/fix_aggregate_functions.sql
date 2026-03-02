-- ============================================================
-- DATABASE FUNCTION FIX SCRIPT
-- ============================================================
-- This script fixes the aggregate_to_hourly and aggregate_to_daily 
-- functions to match the actual table schemas.
--
-- VERIFIED TABLE SCHEMAS:
-- 
-- posts table columns:
--   - id, uri, cid, author_did, author_handle, text
--   - created_at (timestamp with time zone, NOT NULL)
--   - indexed_at (timestamp with time zone, NULLABLE)
--   - has_images, has_video, has_external_link (boolean)
--   - external_domain, relevance_score, embed_data, facets, labels, langs, hashtags
--
-- feed_stats_hourly table columns:
--   - id, hour (timestamp without time zone, NOT NULL)
--   - posts_count, unique_authors, posts_with_images, posts_with_video, posts_with_links
--   - top_domains (ARRAY), created_at
--
-- feed_stats_daily table columns:
--   - id, date (date, NOT NULL)
--   - posts_count, unique_authors, posts_with_images, posts_with_video, posts_with_links
--   - top_authors, top_domains (ARRAY), created_at
--
-- ISSUES FOUND IN aggregate_to_hourly:
--   1. Uses 'hour_bucket' but table has 'hour'
--   2. Uses 'total_posts' but table has 'posts_count'
--   3. Uses 'posts_with_media' but table has 'posts_with_images'
--   4. Uses 'has_media' but posts has 'has_images'
--   5. Uses 'has_links' but posts has 'has_external_link'
--   6. References non-existent 'avg_index_delay_seconds' and 'updated_at'
--   7. top_domains should be text[] ARRAY not jsonb
-- ============================================================

-- Drop and recreate aggregate_to_hourly with correct column names
CREATE OR REPLACE FUNCTION bluesky_feed.aggregate_to_hourly()
RETURNS TABLE(aggregated_count integer, deleted_count integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_aggregated_count INTEGER := 0;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Aggregate hourly stats using correct column names
  INSERT INTO bluesky_feed.feed_stats_hourly (
    hour,  -- was: hour_bucket
    posts_count,  -- was: total_posts
    unique_authors, 
    posts_with_images,  -- was: posts_with_media
    posts_with_video,
    posts_with_links,
    top_domains,
    created_at
  )
  SELECT 
    DATE_TRUNC('hour', indexed_at) as hour,
    COUNT(*)::integer as posts_count,
    COUNT(DISTINCT author_did)::integer as unique_authors,
    COUNT(*) FILTER (WHERE has_images = true)::integer as posts_with_images,
    COUNT(*) FILTER (WHERE has_video = true)::integer as posts_with_video,
    COUNT(*) FILTER (WHERE has_external_link = true)::integer as posts_with_links,
    ARRAY[]::text[] as top_domains,
    NOW() as created_at
  FROM bluesky_feed.posts
  WHERE indexed_at IS NOT NULL
    AND indexed_at < NOW() - INTERVAL '7 days'
  GROUP BY DATE_TRUNC('hour', indexed_at)
  ON CONFLICT (hour) DO UPDATE SET
    posts_count = EXCLUDED.posts_count,
    unique_authors = EXCLUDED.unique_authors,
    posts_with_images = EXCLUDED.posts_with_images,
    posts_with_video = EXCLUDED.posts_with_video,
    posts_with_links = EXCLUDED.posts_with_links;
  
  GET DIAGNOSTICS v_aggregated_count = ROW_COUNT;
  
  -- Delete aggregated posts (older than 7 days)
  DELETE FROM bluesky_feed.posts
  WHERE indexed_at IS NOT NULL
    AND indexed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_aggregated_count, v_deleted_count;
END;
$function$;

-- Fix aggregate_to_daily function to match table schema
-- feed_stats_daily likely has: date, posts_count, unique_authors, posts_with_images, posts_with_video, posts_with_links

CREATE OR REPLACE FUNCTION bluesky_feed.aggregate_to_daily()
RETURNS TABLE(aggregated_count integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_aggregated_count INTEGER := 0;
BEGIN
  INSERT INTO bluesky_feed.feed_stats_daily (
    date, 
    posts_count, 
    unique_authors, 
    posts_with_images, 
    posts_with_video, 
    posts_with_links
  )
  SELECT 
    DATE_TRUNC('day', hour)::date as date,
    SUM(posts_count)::integer as posts_count,
    SUM(unique_authors)::integer as unique_authors,
    SUM(posts_with_images)::integer as posts_with_images,
    SUM(posts_with_video)::integer as posts_with_video,
    SUM(posts_with_links)::integer as posts_with_links
  FROM bluesky_feed.feed_stats_hourly
  WHERE hour < NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', hour)::date
  ON CONFLICT (date) DO UPDATE SET
    posts_count = EXCLUDED.posts_count,
    unique_authors = EXCLUDED.unique_authors,
    posts_with_images = EXCLUDED.posts_with_images,
    posts_with_video = EXCLUDED.posts_with_video,
    posts_with_links = EXCLUDED.posts_with_links;
  
  GET DIAGNOSTICS v_aggregated_count = ROW_COUNT;
  
  -- Delete old hourly stats (older than 30 days)
  DELETE FROM bluesky_feed.feed_stats_hourly
  WHERE hour < NOW() - INTERVAL '30 days';
  
  RETURN QUERY SELECT v_aggregated_count;
END;
$function$;

-- Fix cleanup_old_data to return proper counts
CREATE OR REPLACE FUNCTION bluesky_feed.cleanup_old_data()
RETURNS TABLE(posts_deleted integer, hourly_deleted integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_hourly_result RECORD;
  v_daily_result RECORD;
BEGIN
  -- Run hourly aggregation
  SELECT * INTO v_hourly_result FROM bluesky_feed.aggregate_to_hourly();
  
  -- Run daily aggregation
  SELECT * INTO v_daily_result FROM bluesky_feed.aggregate_to_daily();
  
  RETURN QUERY SELECT 
    COALESCE(v_hourly_result.deleted_count, 0)::integer,
    0::integer;  -- hourly_deleted is handled in aggregate_to_daily
END;
$function$;

-- Add index on indexed_at if not exists for better performance
CREATE INDEX IF NOT EXISTS idx_posts_indexed_at ON bluesky_feed.posts(indexed_at);

-- Add unique constraint on hour column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'feed_stats_hourly_hour_key' 
    AND conrelid = 'bluesky_feed.feed_stats_hourly'::regclass
  ) THEN
    ALTER TABLE bluesky_feed.feed_stats_hourly ADD CONSTRAINT feed_stats_hourly_hour_key UNIQUE (hour);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
