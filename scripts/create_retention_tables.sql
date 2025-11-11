-- Create tables for data retention strategy
-- This enables keeping aggregated stats while removing old detailed posts

-- Hourly aggregated statistics (replaces individual posts after 7 days)
CREATE TABLE IF NOT EXISTS bluesky_feed.feed_stats_hourly (
  id SERIAL PRIMARY KEY,
  hour TIMESTAMP NOT NULL,
  posts_count INTEGER NOT NULL,
  unique_authors INTEGER NOT NULL,
  posts_with_images INTEGER NOT NULL,
  posts_with_video INTEGER NOT NULL,
  posts_with_links INTEGER NOT NULL,
  top_domains TEXT[], -- Array of top 5 external domains
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(hour)
);

-- Daily aggregated statistics (long-term archive)
CREATE TABLE IF NOT EXISTS bluesky_feed.feed_stats_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  posts_count INTEGER NOT NULL,
  unique_authors INTEGER NOT NULL,
  posts_with_images INTEGER NOT NULL,
  posts_with_video INTEGER NOT NULL,
  posts_with_links INTEGER NOT NULL,
  top_authors TEXT[], -- Array of top 10 authors by post count
  top_domains TEXT[], -- Array of top 10 external domains
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_indexed_at ON bluesky_feed.posts(indexed_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON bluesky_feed.posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_author_did ON bluesky_feed.posts(author_did);
CREATE INDEX IF NOT EXISTS idx_hourly_hour ON bluesky_feed.feed_stats_hourly(hour DESC);
CREATE INDEX IF NOT EXISTS idx_daily_date ON bluesky_feed.feed_stats_daily(date DESC);

-- Create a function to aggregate posts to hourly stats
CREATE OR REPLACE FUNCTION bluesky_feed.aggregate_to_hourly()
RETURNS TABLE(hours_processed INTEGER) AS $$
DECLARE
  hours_count INTEGER;
BEGIN
  -- Aggregate posts older than 7 days into hourly stats
  WITH aggregated AS (
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
      DATE_TRUNC('hour', indexed_at) as hour,
      COUNT(*) as posts_count,
      COUNT(DISTINCT author_did) as unique_authors,
      COUNT(CASE WHEN has_images THEN 1 END) as posts_with_images,
      COUNT(CASE WHEN has_video THEN 1 END) as posts_with_video,
      COUNT(CASE WHEN has_external_link THEN 1 END) as posts_with_links,
      ARRAY(
        SELECT external_domain
        FROM bluesky_feed.posts p2
        WHERE DATE_TRUNC('hour', p2.indexed_at) = DATE_TRUNC('hour', p1.indexed_at)
          AND p2.external_domain IS NOT NULL
        GROUP BY external_domain
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) as top_domains
    FROM bluesky_feed.posts p1
    WHERE indexed_at < NOW() - INTERVAL '7 days'
      AND indexed_at >= NOW() - INTERVAL '8 days' -- Process one day at a time
    GROUP BY hour
    ON CONFLICT (hour) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO hours_count FROM aggregated;
  
  RETURN QUERY SELECT hours_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to aggregate hourly stats to daily
CREATE OR REPLACE FUNCTION bluesky_feed.aggregate_to_daily()
RETURNS TABLE(days_processed INTEGER) AS $$
DECLARE
  days_count INTEGER;
BEGIN
  -- Aggregate hourly stats older than 30 days into daily stats
  WITH aggregated AS (
    INSERT INTO bluesky_feed.feed_stats_daily (
      date,
      posts_count,
      unique_authors,
      posts_with_images,
      posts_with_video,
      posts_with_links,
      top_domains
    )
    SELECT 
      DATE_TRUNC('day', hour)::DATE as date,
      SUM(posts_count) as posts_count,
      SUM(unique_authors) as unique_authors, -- Note: This sums uniques per hour, not truly unique per day
      SUM(posts_with_images) as posts_with_images,
      SUM(posts_with_video) as posts_with_video,
      SUM(posts_with_links) as posts_with_links,
      ARRAY(
        SELECT DISTINCT domain
        FROM bluesky_feed.feed_stats_hourly h2,
        LATERAL UNNEST(h2.top_domains) AS domain
        WHERE DATE_TRUNC('day', h2.hour) = DATE_TRUNC('day', h1.hour)
        LIMIT 10
      ) as top_domains
    FROM bluesky_feed.feed_stats_hourly h1
    WHERE hour < NOW() - INTERVAL '30 days'
      AND hour >= NOW() - INTERVAL '31 days' -- Process one day at a time
    GROUP BY date
    ON CONFLICT (date) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO days_count FROM aggregated;
  
  RETURN QUERY SELECT days_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old data
CREATE OR REPLACE FUNCTION bluesky_feed.cleanup_old_data()
RETURNS TABLE(
  posts_deleted INTEGER,
  hourly_deleted INTEGER
) AS $$
DECLARE
  posts_count INTEGER;
  hourly_count INTEGER;
BEGIN
  -- Delete posts older than 7 days (after they've been aggregated)
  WITH deleted_posts AS (
    DELETE FROM bluesky_feed.posts
    WHERE indexed_at < NOW() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO posts_count FROM deleted_posts;
  
  -- Delete hourly stats older than 30 days (after they've been aggregated to daily)
  WITH deleted_hourly AS (
    DELETE FROM bluesky_feed.feed_stats_hourly
    WHERE hour < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO hourly_count FROM deleted_hourly;
  
  RETURN QUERY SELECT posts_count, hourly_count;
END;
$$ LANGUAGE plpgsql;
