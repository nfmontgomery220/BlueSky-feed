-- Fix the aggregate_to_hourly function to resolve GROUP BY error

CREATE OR REPLACE FUNCTION bluesky_feed.aggregate_to_hourly()
RETURNS TABLE(hours_processed INTEGER) AS $$
DECLARE
  hours_count INTEGER;
BEGIN
  -- Rewritten to avoid subquery referencing ungrouped column
  -- First, aggregate basic stats
  WITH hourly_stats AS (
    SELECT 
      DATE_TRUNC('hour', indexed_at) as hour,
      COUNT(*) as posts_count,
      COUNT(DISTINCT author_did) as unique_authors,
      COUNT(CASE WHEN has_images THEN 1 END) as posts_with_images,
      COUNT(CASE WHEN has_video THEN 1 END) as posts_with_video,
      COUNT(CASE WHEN has_external_link THEN 1 END) as posts_with_links
    FROM bluesky_feed.posts
    WHERE indexed_at < NOW() - INTERVAL '7 days'
      AND indexed_at >= NOW() - INTERVAL '8 days'
    GROUP BY hour
  ),
  -- Then, get top domains per hour separately
  top_domains_per_hour AS (
    SELECT 
      DATE_TRUNC('hour', indexed_at) as hour,
      ARRAY_AGG(external_domain ORDER BY domain_count DESC) FILTER (WHERE rn <= 5) as top_domains
    FROM (
      SELECT 
        indexed_at,
        external_domain,
        COUNT(*) as domain_count,
        ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('hour', indexed_at) ORDER BY COUNT(*) DESC) as rn
      FROM bluesky_feed.posts
      WHERE indexed_at < NOW() - INTERVAL '7 days'
        AND indexed_at >= NOW() - INTERVAL '8 days'
        AND external_domain IS NOT NULL
      GROUP BY DATE_TRUNC('hour', indexed_at), external_domain
    ) ranked
    WHERE rn <= 5
    GROUP BY hour
  ),
  aggregated AS (
    INSERT INTO bluesky_feed.feed_stats_hourly (
      hour,
      posts_count,
      unique_authors,
      posts_with_images,
      posts_with_video,
      posts_with_links,
      top_domains
    )
    SELECT 
      hs.hour,
      hs.posts_count,
      hs.unique_authors,
      hs.posts_with_images,
      hs.posts_with_video,
      hs.posts_with_links,
      COALESCE(td.top_domains, ARRAY[]::TEXT[]) as top_domains
    FROM hourly_stats hs
    LEFT JOIN top_domains_per_hour td ON hs.hour = td.hour
    ON CONFLICT (hour) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO hours_count FROM aggregated;
  
  RETURN QUERY SELECT hours_count;
END;
$$ LANGUAGE plpgsql;
