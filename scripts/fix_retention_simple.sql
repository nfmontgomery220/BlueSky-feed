-- Drop and recreate the aggregate_to_hourly function with simplified logic

DROP FUNCTION IF EXISTS bluesky_feed.aggregate_to_hourly();

CREATE FUNCTION bluesky_feed.aggregate_to_hourly()
RETURNS TABLE(aggregated_count INTEGER, deleted_count INTEGER) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_aggregated_count INTEGER := 0;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Aggregate hourly stats (without top_domains for now to simplify)
  INSERT INTO bluesky_feed.feed_stats_hourly (
    hour_bucket, 
    total_posts, 
    unique_authors, 
    posts_with_media, 
    posts_with_links, 
    avg_index_delay_seconds,
    top_domains
  )
  SELECT 
    DATE_TRUNC('hour', indexed_at) as hour_bucket,
    COUNT(*) as total_posts,
    COUNT(DISTINCT author_did) as unique_authors,
    COUNT(*) FILTER (WHERE has_media = true) as posts_with_media,
    COUNT(*) FILTER (WHERE has_links = true) as posts_with_links,
    AVG(EXTRACT(EPOCH FROM (indexed_at - created_at))) as avg_index_delay_seconds,
    '[]'::jsonb as top_domains
  FROM bluesky_feed.posts
  WHERE indexed_at < NOW() - INTERVAL '7 days'
  GROUP BY DATE_TRUNC('hour', indexed_at)
  ON CONFLICT (hour_bucket) DO UPDATE SET
    total_posts = EXCLUDED.total_posts,
    unique_authors = EXCLUDED.unique_authors,
    posts_with_media = EXCLUDED.posts_with_media,
    posts_with_links = EXCLUDED.posts_with_links,
    avg_index_delay_seconds = EXCLUDED.avg_index_delay_seconds,
    updated_at = NOW();
  
  GET DIAGNOSTICS v_aggregated_count = ROW_COUNT;
  
  -- Delete aggregated posts
  DELETE FROM bluesky_feed.posts
  WHERE indexed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_aggregated_count, v_deleted_count;
END;
$$;
