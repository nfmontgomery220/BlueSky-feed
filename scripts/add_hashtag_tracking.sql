-- Add hashtag column to posts table and create hashtag statistics table

-- Add hashtags column to existing posts table
ALTER TABLE bluesky_feed.posts 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- Create index for faster hashtag queries
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON bluesky_feed.posts USING GIN(hashtags);

-- Create hashtag statistics table for tracked hashtags
CREATE TABLE IF NOT EXISTS bluesky_feed.hashtag_stats (
  id SERIAL PRIMARY KEY,
  hashtag TEXT NOT NULL UNIQUE,
  total_posts INTEGER DEFAULT 0,
  posts_last_24h INTEGER DEFAULT 0,
  posts_last_7d INTEGER DEFAULT 0,
  unique_authors INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_post_at TIMESTAMP WITH TIME ZONE
);

-- Create hourly hashtag trends table
CREATE TABLE IF NOT EXISTS bluesky_feed.hashtag_trends (
  id SERIAL PRIMARY KEY,
  hashtag TEXT NOT NULL,
  hour TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  posts_count INTEGER DEFAULT 0,
  unique_authors INTEGER DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(hashtag, hour)
);

CREATE INDEX IF NOT EXISTS idx_hashtag_trends_hashtag ON bluesky_feed.hashtag_trends(hashtag);
CREATE INDEX IF NOT EXISTS idx_hashtag_trends_hour ON bluesky_feed.hashtag_trends(hour);

-- Drop functions before recreating to avoid return type errors
DROP FUNCTION IF EXISTS bluesky_feed.extract_hashtags(text);
DROP FUNCTION IF EXISTS bluesky_feed.parse_hashtags_from_posts();
DROP FUNCTION IF EXISTS bluesky_feed.update_hashtag_stats();

-- Function to extract hashtags from text
CREATE FUNCTION bluesky_feed.extract_hashtags(post_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  hashtag_array TEXT[];
BEGIN
  -- Extract hashtags using regex (matches #word)
  SELECT ARRAY_AGG(DISTINCT LOWER(match[1]))
  INTO hashtag_array
  FROM regexp_matches(post_text, '#(\w+)', 'g') AS match;
  
  RETURN COALESCE(hashtag_array, '{}');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse all existing posts and extract hashtags
CREATE FUNCTION bluesky_feed.parse_hashtags_from_posts()
RETURNS TABLE(updated_count INTEGER) AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Update posts with extracted hashtags
  UPDATE bluesky_feed.posts
  SET hashtags = bluesky_feed.extract_hashtags(text)
  WHERE text IS NOT NULL 
    AND (hashtags IS NULL OR hashtags = '{}');
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update hashtag statistics
CREATE FUNCTION bluesky_feed.update_hashtag_stats()
RETURNS void AS $$
BEGIN
  -- Update or insert statistics for tracked hashtags
  INSERT INTO bluesky_feed.hashtag_stats (
    hashtag,
    total_posts,
    posts_last_24h,
    posts_last_7d,
    unique_authors,
    last_updated,
    last_post_at
  )
  SELECT 
    unnest_hashtag as hashtag,
    COUNT(*) as total_posts,
    COUNT(*) FILTER (WHERE indexed_at > NOW() - INTERVAL '24 hours') as posts_last_24h,
    COUNT(*) FILTER (WHERE indexed_at > NOW() - INTERVAL '7 days') as posts_last_7d,
    COUNT(DISTINCT author_did) as unique_authors,
    NOW() as last_updated,
    MAX(indexed_at) as last_post_at
  FROM bluesky_feed.posts, unnest(hashtags) as unnest_hashtag
  WHERE unnest_hashtag IN ('budgetbuilder', 'votingpublic')
  GROUP BY unnest_hashtag
  ON CONFLICT (hashtag) DO UPDATE SET
    total_posts = EXCLUDED.total_posts,
    posts_last_24h = EXCLUDED.posts_last_24h,
    posts_last_7d = EXCLUDED.posts_last_7d,
    unique_authors = EXCLUDED.unique_authors,
    last_updated = EXCLUDED.last_updated,
    last_post_at = EXCLUDED.last_post_at;
END;
$$ LANGUAGE plpgsql;
